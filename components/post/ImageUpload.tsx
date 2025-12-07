'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Upload, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError(null)

      // 파일 개수 검증
      if (value.length + acceptedFiles.length > maxFiles) {
        setError(`최대 ${maxFiles}개의 이미지만 업로드할 수 있습니다`)
        return
      }

      // 파일 크기 검증
      const oversizedFiles = acceptedFiles.filter(file => file.size > maxSize)
      if (oversizedFiles.length > 0) {
        setError(`파일 크기는 ${maxSize / 1024 / 1024}MB를 초과할 수 없습니다`)
        return
      }

      // 거부된 파일 처리
      if (rejectedFiles.length > 0) {
        setError('이미지 파일만 업로드할 수 있습니다 (JPG, PNG, WEBP, GIF)')
        return
      }

      onChange([...value, ...acceptedFiles])
    },
    [value, onChange, maxFiles, maxSize]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    },
    maxSize,
    disabled: value.length >= maxFiles,
  })

  const removeImage = (index: number) => {
    const newFiles = value.filter((_, i) => i !== index)
    onChange(newFiles)
    setError(null)
  }

  return (
    <div className="space-y-4">
      {/* 업로드 영역 */}
      {value.length < maxFiles && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8
            flex flex-col items-center justify-center
            cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
            ${value.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-sm text-foreground font-medium mb-1">
            {isDragActive ? '이미지를 놓아주세요' : '이미지를 드래그하거나 클릭하세요'}
          </p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, WEBP, GIF (최대 {maxSize / 1024 / 1024}MB, {maxFiles}개까지)
          </p>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="text-sm text-destructive p-3 glass-strong rounded-lg">
          {error}
        </div>
      )}

      {/* 업로드된 이미지 미리보기 */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {value.map((file, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden glass-strong">
                <Image
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${index + 1}`}
                  width={200}
                  height={200}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* 삭제 버튼 */}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                onClick={() => removeImage(index)}
              >
                <X className="h-4 w-4" />
              </Button>

              {/* 순서 표시 */}
              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {index + 1}/{value.length}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 안내 메시지 */}
      {value.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {value.length}/{maxFiles}개 업로드됨
          {value.length < maxFiles && ' • 추가 업로드 가능'}
        </p>
      )}
    </div>
  )
}
