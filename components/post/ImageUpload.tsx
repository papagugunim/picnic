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
    <div className="space-y-2">
      {/* 업로드된 이미지 미리보기 + 추가 버튼 */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {value.map((file, index) => (
          <div key={index} className="relative w-20 h-20 flex-shrink-0 group">
            {/* 순서 번호 */}
            <div className="absolute top-1 left-1 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[10px] font-bold z-10">
              {index + 1}
            </div>

            {/* 삭제 버튼 */}
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
                src={URL.createObjectURL(file)}
                alt={`미리보기 ${index + 1}`}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        ))}

        {/* 추가 버튼 */}
        {value.length < maxFiles && (
          <label
            htmlFor="image-upload-input"
            className="flex items-center justify-center w-20 h-20 flex-shrink-0 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-colors"
          >
            <div className="text-center">
              <Upload className="w-5 h-5 mx-auto text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{value.length}/{maxFiles}</span>
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
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className={`p-2 rounded-lg text-xs ${
          error.startsWith('✅')
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
            : 'bg-destructive/10 text-destructive'
        }`}>
          {error}
        </div>
      )}
    </div>
  )
}
