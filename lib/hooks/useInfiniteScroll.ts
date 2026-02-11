'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface UseInfiniteScrollOptions<T> {
  pageSize?: number
  threshold?: number
  fetchFn: (cursor: string | null) => Promise<{
    data: T[]
    nextCursor: string | null
    hasMore: boolean
  }>
  getItemId?: (item: T) => string
  enabled?: boolean
  initialData?: T[]
  initialCursor?: string | null
}

export interface UseInfiniteScrollReturn<T> {
  data: T[]
  isLoading: boolean
  isFetchingMore: boolean
  isRefreshing: boolean
  hasMore: boolean
  error: Error | null
  sentinelRef: React.RefObject<HTMLDivElement>
  containerRef: React.RefObject<HTMLDivElement>
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
  updateItem: (id: string, updater: (item: T) => T) => void
  setData: React.Dispatch<React.SetStateAction<T[]>>
  reset: () => void
}

export function useInfiniteScroll<T>({
  pageSize = 20,
  threshold = 200,
  fetchFn,
  getItemId = (item: any) => item.id,
  enabled = true,
  initialData,
  initialCursor,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
  const hasInitialData = initialData && initialData.length > 0
  const [data, setData] = useState<T[]>(hasInitialData ? initialData : [])
  const [isLoading, setIsLoading] = useState(!hasInitialData)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(hasInitialData ? initialData.length >= pageSize : true)
  const [error, setError] = useState<Error | null>(null)
  const [cursor, setCursor] = useState<string | null>(hasInitialData ? (initialCursor ?? null) : null)

  const sentinelRef = useRef<HTMLDivElement>(null!)
  const containerRef = useRef<HTMLDivElement>(null!)
  const isLoadingRef = useRef(false)

  const loadInitial = useCallback(async () => {
    if (!enabled) return

    try {
      setIsLoading(true)
      setError(null)
      isLoadingRef.current = true

      const result = await fetchFn(null)
      setData(result.data)
      setCursor(result.nextCursor)
      setHasMore(result.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch'))
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [fetchFn, enabled])

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMore || !enabled) return

    try {
      setIsFetchingMore(true)
      isLoadingRef.current = true

      const result = await fetchFn(cursor)
      setData(prev => [...prev, ...result.data])
      setCursor(result.nextCursor)
      setHasMore(result.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch more'))
    } finally {
      setIsFetchingMore(false)
      isLoadingRef.current = false
    }
  }, [cursor, hasMore, fetchFn, enabled])

  const refresh = useCallback(async () => {
    try {
      setIsRefreshing(true)
      setError(null)
      isLoadingRef.current = true

      const result = await fetchFn(null)
      setData(result.data)
      setCursor(result.nextCursor)
      setHasMore(result.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh'))
    } finally {
      setIsRefreshing(false)
      isLoadingRef.current = false
    }
  }, [fetchFn])

  const reset = useCallback(() => {
    setData([])
    setCursor(null)
    setHasMore(true)
    setError(null)
    setIsLoading(true)
    loadInitial()
  }, [loadInitial])

  const updateItem = useCallback((id: string, updater: (item: T) => T) => {
    setData(prev => prev.map(item =>
      getItemId(item) === id ? updater(item) : item
    ))
  }, [getItemId])

  // Initial load (skip if initialData was provided)
  const skipInitialLoad = useRef(!!hasInitialData)
  useEffect(() => {
    if (skipInitialLoad.current) {
      skipInitialLoad.current = false
      return
    }
    loadInitial()
  }, [loadInitial])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!enabled) return

    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && hasMore && !isLoadingRef.current) {
          loadMore()
        }
      },
      {
        rootMargin: `${threshold}px`,
        threshold: 0,
      }
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, loadMore, threshold, enabled])

  return {
    data,
    isLoading,
    isFetchingMore,
    isRefreshing,
    hasMore,
    error,
    sentinelRef,
    containerRef,
    refresh,
    loadMore,
    updateItem,
    setData,
    reset,
  }
}
