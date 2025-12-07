-- ============================================
-- picnic 프로젝트 초기 데이터베이스 스키마
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- ============================================
-- 1. Users (프로필 정보 확장)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  city TEXT NOT NULL CHECK (city IN ('Moscow', 'Saint Petersburg')),
  neighborhood TEXT NOT NULL,

  -- 위치 정보
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- 통계
  rating DECIMAL(3, 2) DEFAULT 0.0,
  review_count INT DEFAULT 0,
  post_count INT DEFAULT 0,

  -- 메타데이터
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);


-- ============================================
-- 2. Posts (중고거래 게시물)
-- ============================================
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- 게시물 정보
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price BIGINT, -- 루블 (NULL = 무료나눔/협의가능)
  category TEXT NOT NULL,
  condition TEXT CHECK (condition IN ('new', 'like_new', 'good', 'fair')),

  -- 이미지 (Supabase Storage URLs)
  images TEXT[] DEFAULT '{}', -- 최대 10장

  -- 위치
  city TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- 거래 방법
  trade_method TEXT[] DEFAULT '{}', -- ['direct', 'delivery']

  -- 상태
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'reserved', 'sold', 'hidden')),

  -- 통계
  view_count INT DEFAULT 0,
  like_count INT DEFAULT 0,
  chat_count INT DEFAULT 0,

  -- 메타데이터
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_posts_city_neighborhood ON posts(city, neighborhood);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- RLS 정책
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts are viewable by everyone"
  ON posts FOR SELECT
  USING (status = 'active');

CREATE POLICY "Users can create posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  USING (auth.uid() = author_id);


-- ============================================
-- 3. Chats (1:1 채팅방)
-- ============================================
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- 마지막 메시지 정보 (목록 표시용)
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 읽지 않은 메시지 수
  unread_count_buyer INT DEFAULT 0,
  unread_count_seller INT DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 한 게시물에 대해 buyer-seller 쌍은 하나만 존재
  UNIQUE(post_id, buyer_id, seller_id)
);

-- 인덱스
CREATE INDEX idx_chats_buyer ON chats(buyer_id);
CREATE INDEX idx_chats_seller ON chats(seller_id);
CREATE INDEX idx_chats_post ON chats(post_id);

-- RLS 정책
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chats"
  ON chats FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can create chats"
  ON chats FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Users can update own chats"
  ON chats FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);


-- ============================================
-- 4. Messages (채팅 메시지)
-- ============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_messages_chat ON messages(chat_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- RLS 정책
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in own chats"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND (chats.buyer_id = auth.uid() OR chats.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in own chats"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND (chats.buyer_id = auth.uid() OR chats.seller_id = auth.uid())
    )
  );


-- ============================================
-- 5. Reviews (거래 후 리뷰)
-- ============================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 한 게시물에 대해 한 번만 리뷰 가능
  UNIQUE(post_id, reviewer_id, reviewee_id)
);

-- 인덱스
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id);

-- RLS 정책
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);


-- ============================================
-- 6. Likes (찜하기)
-- ============================================
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, post_id)
);

-- 인덱스
CREATE INDEX idx_likes_user ON likes(user_id);
CREATE INDEX idx_likes_post ON likes(post_id);

-- RLS 정책
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own likes"
  ON likes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create likes"
  ON likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
  ON likes FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================
-- 7. Notifications (알림)
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN ('chat', 'like', 'review', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- 클릭 시 이동할 URL

  is_read BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

-- RLS 정책
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);


-- ============================================
-- 8. Functions & Triggers
-- ============================================

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
