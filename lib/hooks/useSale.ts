'use client'

import { createClient } from '@/lib/supabase/client'

/**
 * 판매완료 및 리뷰 관리 훅
 */
export function useSale() {
  // 판매완료 처리
  async function completeSale(
    postId: string,
    roomId: string,
    buyerId: string,
    sellerId: string
  ): Promise<boolean> {
    const supabase = createClient()

    try {
      const { data, error } = await supabase.rpc('complete_sale', {
        p_post_id: postId,
        p_room_id: roomId,
        p_buyer_id: buyerId,
        p_seller_id: sellerId
      })

      if (error) {
        console.error('Complete sale error:', error)
        throw new Error('판매완료 처리 실패')
      }

      if (!data) {
        throw new Error('판매완료 처리에 실패했습니다')
      }

      return data
    } catch (err) {
      console.error('Complete sale error:', err)
      throw err
    }
  }

  // 리뷰 작성
  async function createReview(
    postId: string,
    reviewerId: string,
    revieweeId: string,
    rating: number,
    comment?: string
  ): Promise<void> {
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          post_id: postId,
          reviewer_id: reviewerId,
          reviewee_id: revieweeId,
          rating,
          comment: comment || null
        })

      if (error) {
        console.error('Create review error:', error)
        throw new Error('리뷰 작성 실패')
      }
    } catch (err) {
      console.error('Create review error:', err)
      throw err
    }
  }

  // 리뷰 존재 여부 확인
  async function checkReviewExists(
    postId: string,
    reviewerId: string,
    revieweeId: string
  ): Promise<boolean> {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('id')
        .eq('post_id', postId)
        .eq('reviewer_id', reviewerId)
        .eq('reviewee_id', revieweeId)
        .maybeSingle()

      if (error) {
        console.error('Check review error:', error)
        return false
      }

      return !!data
    } catch (err) {
      console.error('Check review error:', err)
      return false
    }
  }

  // 게시물에 대한 모든 리뷰 조회
  async function getPostReviews(postId: string) {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:reviewer_id (
            id,
            full_name,
            avatar_url
          ),
          reviewee:reviewee_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Get reviews error:', error)
        throw new Error('리뷰를 불러오는데 실패했습니다')
      }

      return data || []
    } catch (err) {
      console.error('Get reviews error:', err)
      throw err
    }
  }

  return {
    completeSale,
    createReview,
    checkReviewExists,
    getPostReviews
  }
}
