'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getBreadEmoji, getBreadInfo } from '@/lib/bread'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  src?: string | null
  alt?: string
  breadLevel?: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'h-8 w-8 text-base',
  md: 'h-10 w-10 text-lg',
  lg: 'h-12 w-12 text-xl',
  xl: 'h-16 w-16 text-2xl'
}

export function UserAvatar({
  src,
  alt = '프로필',
  breadLevel = 0,
  size = 'md',
  className
}: UserAvatarProps) {
  const breadInfo = getBreadInfo(breadLevel)
  const breadEmoji = getBreadEmoji(breadLevel)

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage src={src || undefined} alt={alt} />
      <AvatarFallback
        style={{ backgroundColor: breadInfo.color }}
        className="text-white border-0"
      >
        <span className="select-none">{breadEmoji}</span>
      </AvatarFallback>
    </Avatar>
  )
}
