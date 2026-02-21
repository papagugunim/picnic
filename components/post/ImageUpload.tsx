'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import Image from 'next/image'
import { Upload, X } from 'lucide-react'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('ImageUpload')

interface ImageUploadProps {
  value: File[]
  onChange: (files: File[]) => void
  maxFiles?: number
  maxSize?: number // bytes
}

function getFileSignature(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

export default function ImageUpload({
  value,
  onChange,
  maxFiles = 5,
  maxSize = 5 * 1024 * 1024, // 5MB
}: ImageUploadProps) {
  const [message, setMessage] = useState<string | null>(null)
  const inputId = useId()

  const previews = useMemo(
    () => value.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [value]
  )

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url))
    }
  }, [previews])

  const showMessage = (text: string, timeoutMs: number = 2600) => {
    setMessage(text)
    window.setTimeout(() => setMessage(null), timeoutMs)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // 같은 파일 재선택 허용
    e.target.value = ''

    const selectedFiles = Array.from(files)
    const remainingSlots = Math.max(0, maxFiles - value.length)
    if (remainingSlots <= 0) {
      showMessage(`이미지는 최대 ${maxFiles}개까지 업로드할 수 있습니다`)
      return
    }

    const filesWithinLimit = selectedFiles.slice(0, remainingSlots)
    const droppedByLimit = selectedFiles.length - filesWithinLimit.length
    const existingSignatures = new Set(value.map(getFileSignature))
    const pendingSignatures = new Set<string>()

    const validFiles: File[] = []
    let invalidTypeCount = 0
    let invalidSizeCount = 0
    let duplicateCount = 0

    for (const file of filesWithinLimit) {
      const isImageByType = file.type.startsWith('image/')
      const isImageByExt = /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(file.name)

      if (!isImageByType && !isImageByExt) {
        invalidTypeCount += 1
        continue
      }

      if (file.size > maxSize) {
        invalidSizeCount += 1
        continue
      }

      const signature = getFileSignature(file)
      if (existingSignatures.has(signature) || pendingSignatures.has(signature)) {
        duplicateCount += 1
        continue
      }

      pendingSignatures.add(signature)
      validFiles.push(file)
    }

    if (validFiles.length > 0) {
      onChange([...value, ...validFiles])
      logger.log('Images selected:', {
        added: validFiles.length,
        total: value.length + validFiles.length,
      })
    }

    const notices: string[] = []
    if (validFiles.length > 0) notices.push(`✅ ${validFiles.length}개 추가됨`)
    if (droppedByLimit > 0) notices.push(`초과 ${droppedByLimit}개 제외`)
    if (invalidTypeCount > 0) notices.push(`형식 오류 ${invalidTypeCount}개`)
    if (invalidSizeCount > 0) notices.push(`용량 초과 ${invalidSizeCount}개`)
    if (duplicateCount > 0) notices.push(`중복 ${duplicateCount}개`)

    if (notices.length > 0) {
      showMessage(notices.join(' · '))
    }
  }

  const removeImage = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
    setMessage(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {previews.map((preview, index) => (
          <div key={`${preview.file.name}-${preview.file.lastModified}-${index}`} className="relative w-20 h-20 flex-shrink-0 group">
            <div className="absolute top-1 left-1 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[10px] font-bold z-10">
              {index + 1}
            </div>

            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10"
              aria-label="이미지 삭제"
            >
              <X className="w-3 h-3" />
            </button>

            <div className="w-full h-full rounded-lg overflow-hidden">
              <Image
                src={preview.url}
                alt={`미리보기 ${index + 1}`}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        ))}

        {value.length < maxFiles && (
          <label
            htmlFor={inputId}
            className="flex items-center justify-center w-20 h-20 flex-shrink-0 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-colors"
          >
            <div className="text-center">
              <Upload className="w-5 h-5 mx-auto text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{value.length}/{maxFiles}</span>
            </div>
            <input
              id={inputId}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        )}
      </div>

      {message && (
        <div className={`p-2 rounded-lg text-xs ${
          message.startsWith('✅')
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
            : 'bg-destructive/10 text-destructive'
        }`}>
          {message}
        </div>
      )}
    </div>
  )
}
