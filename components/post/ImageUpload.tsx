'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('ImageUpload')
import { useState } from 'react'
import { X, Upload, ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'

interface ImageUploadProps {
  value: File[]
  onChange: (files: File[]) => void
  maxFiles?: number
  maxSize?: number // bytes
}

export default function ImageUpload({
  value,
  onChange,
  maxFiles = 5,
  maxSize = 5 * 1024 * 1024, // 5MB
}: ImageUploadProps) {
  const [error, setError] = useState<string | null>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    logger.log('handleImageUpload called, files:', files)

    if (!files || files.length === 0) {
      logger.log('No files selected')
      return
    }

    const newFiles = Array.from(files)
    logger.log('New files count:', newFiles.length)

    // 입력 필드 초기화 (같은 파일 다시 선택 가능하도록)
    e.target.value = ''

    // 파일 개수 검증
    if (value.length + newFiles.length > maxFiles) {
      setError(`이미지는 최대 ${maxFiles}개까지 업로드할 수 있습니다`)
      setTimeout(() => setError(null), 3000)
      return
    }

    // 파일 크기 및 타입 검증
    let errorCount = 0
    const validFiles: File[] = []

    for (const file of newFiles) {
      logger.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`)

      // 파일 타입 검증 (확장자로도 체크)
      const isImageByType = file.type.startsWith('image/')
      const isImageByExt = /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(file.name)

      if (!isImageByType && !isImageByExt) {
        logger.error(`Invalid file type: ${file.type}, name: ${file.name}`)
        errorCount++
        continue
      }

      // 파일 크기 검증
      if (file.size > maxSize) {
        logger.error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
        errorCount++
        continue
      }

      logger.log(`File validated: ${file.name}`)
      validFiles.push(file)
    }

    logger.log('Valid files count:', validFiles.length)

    if (validFiles.length > 0) {
      onChange([...value, ...validFiles])
      setError(`✅ ${validFiles.length}개 사진 추가됨`)
      setTimeout(() => setError(null), 2000)
      logger.log('Images state updated, new length:', value.length + validFiles.length)
    }

    if (errorCount > 0) {
      setError(`${errorCount}개 파일 실패 (${maxSize / 1024 / 1024}MB 이하의 이미지 파일만 가능)`)
      setTimeout(() => setError(null), 3000)
    }
  }

  const removeImage = (index: number) => {
    const newFiles = value.filter((_, i) => i !== index)
    onChange(newFiles)
    setError(null)
  }

  const moveImageLeft = (index: number) => {
    if (index === 0) return
    const newFiles = [...value]
    const temp = newFiles[index]
    newFiles[index] = newFiles[index - 1]
    newFiles[index - 1] = temp
    onChange(newFiles)
  }

  const moveImageRight = (index: number) => {
    if (index === value.length - 1) return
    const newFiles = [...value]
    const temp = newFiles[index]
    newFiles[index] = newFiles[index + 1]
    newFiles[index + 1] = temp
    onChange(newFiles)
  }

  return (
    <div className="space-y-4">
      {/* 업로드 영역 */}
      {value.length < maxFiles && (
        <label
          htmlFor="image-upload-input"
          className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg transition-colors cursor-pointer hover:bg-muted/50 hover:border-primary/50"
        >
          <div className="text-center">
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-foreground font-medium mb-1">
              사진 촬영 또는 앨범 선택
            </p>
            <p className="text-xs text-muted-foreground">
              (최대 {maxSize / 1024 / 1024}MB, {maxFiles}개까지 업로드 가능)
            </p>
          </div>
          <input
            id="image-upload-input"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className={`p-4 rounded-lg text-sm ${
          error.startsWith('✅')
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
            : 'bg-destructive/10 text-destructive'
        }`}>
          {error}
        </div>
      )}

      {/* 업로드된 이미지 미리보기 */}
      {value.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            📌 첫 번째 사진이 대표 이미지로 표시됩니다
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {value.map((file, index) => (
              <div key={index} className="relative aspect-square group">
                {/* 순서 번호 */}
                <div className="absolute top-2 left-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold z-10">
                  {index + 1}
                </div>

                {/* 삭제 버튼 (항상 표시) */}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10 shadow-lg"
                  title="삭제"
                  aria-label="이미지 삭제"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* 이미지 미리보기 */}
                <div className="w-full h-full rounded-lg overflow-hidden border-2 border-border">
                  <Image
                    src={URL.createObjectURL(file)}
                    alt={`미리보기 ${index + 1}`}
                    width={200}
                    height={200}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* 순서 변경 버튼들 (hover 시 표시) */}
                <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {/* 왼쪽으로 이동 */}
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => moveImageLeft(index)}
                      className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                      title="왼쪽으로 이동"
                      aria-label="왼쪽으로 이동"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}

                  {/* 오른쪽으로 이동 */}
                  {index < value.length - 1 && (
                    <button
                      type="button"
                      onClick={() => moveImageRight(index)}
                      className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                      title="오른쪽으로 이동"
                      aria-label="오른쪽으로 이동"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 안내 메시지 */}
      {value.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {value.length}/{maxFiles}개 선택됨
          {value.length < maxFiles && ' • 추가 선택 가능'}
        </p>
      )}
    </div>
  )
}
