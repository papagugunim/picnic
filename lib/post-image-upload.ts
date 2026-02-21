import { createNamespacedLogger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/client'

const logger = createNamespacedLogger('PostImageUpload')

const POST_IMAGE_BUCKET = 'post-images'

export function createClientId(): string {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID()
    }
  } catch {
    // Fallback below
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

export interface UploadedPostImage {
  path: string
  url: string
}

interface UploadPostImagesOptions {
  supabase: ReturnType<typeof createClient>
  userId: string
  scope: string
  entityId: string
  files: File[]
  maxRetries?: number
  onProgress?: (progress: {
    uploaded: number
    total: number
    fileName: string
  }) => void
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeFileExt(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && fromName.length <= 10) return fromName

  const mime = file.type.toLowerCase()
  if (mime.includes('jpeg')) return 'jpg'
  if (mime.includes('png')) return 'png'
  if (mime.includes('gif')) return 'gif'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('heic')) return 'heic'
  if (mime.includes('heif')) return 'heif'

  return 'jpg'
}

function isAlreadyExistsError(error: unknown): boolean {
  const rawMessage = (error as { message?: string } | null)?.message ?? ''
  const message = rawMessage.toLowerCase()
  const statusCode = Number((error as { statusCode?: number } | null)?.statusCode)

  return statusCode === 409 || message.includes('already exists') || message.includes('duplicate')
}

function isRetryableError(error: unknown): boolean {
  if (isAlreadyExistsError(error)) return false

  const statusCode = Number((error as { statusCode?: number } | null)?.statusCode)
  if (Number.isFinite(statusCode) && [408, 425, 429, 500, 502, 503, 504].includes(statusCode)) {
    return true
  }

  const rawMessage = (error as { message?: string } | null)?.message ?? ''
  const message = rawMessage.toLowerCase()
  return (
    message.includes('network')
    || message.includes('timeout')
    || message.includes('timed out')
    || message.includes('failed to fetch')
    || message.includes('connection')
  )
}

async function uploadOneWithRetry({
  supabase,
  filePath,
  file,
  maxRetries,
}: {
  supabase: ReturnType<typeof createClient>
  filePath: string
  file: File
  maxRetries: number
}) {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const { error } = await supabase.storage
      .from(POST_IMAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      })

    if (!error || isAlreadyExistsError(error)) {
      return
    }

    const lastAttempt = attempt === maxRetries
    if (lastAttempt || !isRetryableError(error)) {
      throw error
    }

    const backoffMs = 350 * (attempt + 1)
    logger.warn(`업로드 재시도 ${attempt + 1}/${maxRetries} - ${file.name}`)
    await sleep(backoffMs)
  }
}

export async function uploadPostImagesWithRetry({
  supabase,
  userId,
  scope,
  entityId,
  files,
  maxRetries = 2,
  onProgress,
}: UploadPostImagesOptions): Promise<UploadedPostImage[]> {
  if (files.length === 0) return []

  const uploaded: UploadedPostImage[] = []

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]
    const fileExt = normalizeFileExt(file)
    const fileName = `${Date.now()}-${createClientId()}-${index}.${fileExt}`
    const filePath = `${userId}/${scope}/${entityId}/${fileName}`

    try {
      await uploadOneWithRetry({ supabase, filePath, file, maxRetries })
      const { data: { publicUrl } } = supabase.storage
        .from(POST_IMAGE_BUCKET)
        .getPublicUrl(filePath)

      uploaded.push({
        path: filePath,
        url: publicUrl,
      })

      onProgress?.({
        uploaded: uploaded.length,
        total: files.length,
        fileName: file.name,
      })
    } catch (error) {
      logger.error(`이미지 업로드 실패 (${index + 1}/${files.length}):`, error)
      throw new Error(`"${file.name}" 업로드에 실패했습니다. 네트워크 상태를 확인하고 다시 시도해주세요.`)
    }
  }

  return uploaded
}

export async function cleanupUploadedPostImages(
  supabase: ReturnType<typeof createClient>,
  paths: string[]
) {
  if (paths.length === 0) return

  const { error } = await supabase.storage
    .from(POST_IMAGE_BUCKET)
    .remove(paths)

  if (error) {
    logger.warn('업로드된 이미지 정리 실패:', error)
  }
}
