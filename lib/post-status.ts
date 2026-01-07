/**
 * 게시글 상태 관련 유틸리티
 */

export type PostStatus = 'active' | 'reserved' | 'sold' | 'hidden'

export interface PostStatusInfo {
  label: string
  color: string
  bgColor: string
  textColor: string
}

/**
 * 게시글 상태 정보 가져오기
 */
export function getPostStatusInfo(status: PostStatus): PostStatusInfo {
  switch (status) {
    case 'active':
      return {
        label: '판매중',
        color: 'bg-green-500',
        bgColor: 'bg-green-500/10',
        textColor: 'text-green-700'
      }
    case 'reserved':
      return {
        label: '예약중',
        color: 'bg-orange-500',
        bgColor: 'bg-orange-500/10',
        textColor: 'text-orange-700'
      }
    case 'sold':
      return {
        label: '판매완료',
        color: 'bg-gray-500',
        bgColor: 'bg-gray-500/10',
        textColor: 'text-gray-700'
      }
    case 'hidden':
      return {
        label: '숨김',
        color: 'bg-gray-400',
        bgColor: 'bg-gray-400/10',
        textColor: 'text-gray-600'
      }
    default:
      return {
        label: '판매중',
        color: 'bg-green-500',
        bgColor: 'bg-green-500/10',
        textColor: 'text-green-700'
      }
  }
}
