export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  city: 'Moscow' | 'Saint Petersburg'
  neighborhood: string
  latitude: number | null
  longitude: number | null
  rating: number
  review_count: number
  post_count: number
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  author_id: string
  title: string
  description: string
  price: number | null
  category: string
  condition: 'new' | 'like_new' | 'good' | 'fair'
  images: string[]
  city: string
  neighborhood: string
  latitude: number | null
  longitude: number | null
  trade_method: string[]
  status: 'active' | 'reserved' | 'sold' | 'hidden'
  view_count: number
  like_count: number
  chat_count: number
  created_at: string
  updated_at: string
  author?: Profile
}

export interface Chat {
  id: string
  post_id: string
  buyer_id: string
  seller_id: string
  last_message: string | null
  last_message_at: string
  unread_count_buyer: number
  unread_count_seller: number
  created_at: string
  post?: Post
  buyer?: Profile
  seller?: Profile
}

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
  sender?: Profile
}

export interface Review {
  id: string
  post_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer?: Profile
  reviewee?: Profile
}

export interface Like {
  id: string
  user_id: string
  post_id: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'chat' | 'like' | 'review' | 'system'
  title: string
  message: string
  link: string | null
  is_read: boolean
  created_at: string
}
