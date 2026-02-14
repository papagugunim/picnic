'use client'

import { useCallback, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

interface EmojiParticle {
  id: number
  emoji: string
  x: number
  y: number
  dx: number
  dy: number
  rotate: number
  size: number
  duration: number
}

const DEFAULT_EMOJIS = ['✨', '💫', '🌟', '🍞']

const random = (min: number, max: number) => Math.random() * (max - min) + min
const pickRandom = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]

export function useEmojiBurst() {
  const [particles, setParticles] = useState<EmojiParticle[]>([])
  const idRef = useRef(0)

  const burstFromElement = useCallback(
    (element: HTMLElement, emojis: string[] = DEFAULT_EMOJIS) => {
      const available = emojis.length > 0 ? emojis : DEFAULT_EMOJIS
      const rect = element.getBoundingClientRect()
      const x = rect.left + rect.width / 2
      const y = rect.top + rect.height / 2
      const count = 5

      const nextParticles: EmojiParticle[] = Array.from({ length: count }).map(() => {
        const angle = random(0, Math.PI * 2)
        const distance = random(20, 56)
        const duration = random(480, 760)
        idRef.current += 1

        return {
          id: idRef.current,
          emoji: pickRandom(available),
          x,
          y,
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance - random(4, 12),
          rotate: random(-35, 35),
          size: random(16, 24),
          duration,
        }
      })

      setParticles((prev) => [...prev, ...nextParticles])

      nextParticles.forEach((particle) => {
        window.setTimeout(() => {
          setParticles((prev) => prev.filter((item) => item.id !== particle.id))
        }, particle.duration + 80)
      })
    },
    []
  )

  return { particles, burstFromElement }
}

export function EmojiBurstLayer({ particles }: { particles: EmojiParticle[] }) {
  return (
    <div className="emoji-burst-layer" aria-hidden="true">
      {particles.map((particle) => {
        const style = {
          left: `${particle.x}px`,
          top: `${particle.y}px`,
          '--emoji-dx': `${particle.dx}px`,
          '--emoji-dy': `${particle.dy}px`,
          '--emoji-rotate': `${particle.rotate}deg`,
          '--emoji-size': `${particle.size}px`,
          '--emoji-duration': `${particle.duration}ms`,
        } as CSSProperties

        return (
          <span
            key={particle.id}
            className="emoji-burst-item"
            style={style}
          >
            {particle.emoji}
          </span>
        )
      })}
    </div>
  )
}

