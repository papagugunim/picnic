import Image from 'next/image'
import { cn } from '@/lib/utils'

interface PicnicWordmarkProps {
  className?: string
  priority?: boolean
  variant?: 'green' | 'dark'
}

const WORDMARK_SRC: Record<NonNullable<PicnicWordmarkProps['variant']>, string> = {
  green: '/branding/picnic-wordmark-green.png',
  dark: '/branding/picnic-wordmark-dark.png',
}

export default function PicnicWordmark({
  className,
  priority = false,
  variant = 'green',
}: PicnicWordmarkProps) {
  return (
    <Image
      src={WORDMARK_SRC[variant]}
      alt="picnic"
      width={466}
      height={156}
      priority={priority}
      draggable={false}
      className={cn('h-auto w-[170px] select-none', className)}
      sizes="(max-width: 768px) 70vw, 220px"
    />
  )
}
