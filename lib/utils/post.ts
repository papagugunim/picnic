type PostWithImages = { images?: string[] | string | null } | null | undefined

export function getPostThumbnailUrl(post: PostWithImages): string | null {
  const images = post?.images

  if (Array.isArray(images)) {
    const url = images.find((img) => typeof img === 'string' && img.trim().length > 0)
    return url || null
  }

  if (typeof images === 'string') {
    const trimmed = images.trim()
    if (!trimmed) return null

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          const url = parsed.find((img) => typeof img === 'string' && img.trim().length > 0)
          return url || null
        }
      } catch {
        return null
      }
    }

    return trimmed
  }

  return null
}
