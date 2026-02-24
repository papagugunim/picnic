-- ============================================
-- Milk Point system + 3-day ranked feed/community ordering
-- ============================================

-- 1) Milk point wallet / ledger / boost tables
CREATE TABLE IF NOT EXISTS public.milk_point_wallets (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER NOT NULL DEFAULT 0 CHECK (total_earned >= 0),
  total_spent INTEGER NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.milk_point_events (
  id BIGSERIAL PRIMARY KEY,
  event_key TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.milk_point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  reason TEXT NOT NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.milk_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'community_post')),
  target_id UUID NOT NULL,
  points_used INTEGER NOT NULL CHECK (points_used > 0),
  boost_score NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_milk_wallets_updated_at ON public.milk_point_wallets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_milk_transactions_user_created ON public.milk_point_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_milk_events_user_created ON public.milk_point_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_milk_boosts_target_expiry ON public.milk_boosts(target_type, target_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_milk_boosts_user_created ON public.milk_boosts(user_id, created_at DESC);

ALTER TABLE public.milk_point_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milk_point_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milk_point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milk_boosts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own milk wallets" ON public.milk_point_wallets;
DROP POLICY IF EXISTS "Users can create own milk wallets" ON public.milk_point_wallets;
DROP POLICY IF EXISTS "Users can update own milk wallets" ON public.milk_point_wallets;
DROP POLICY IF EXISTS "Users can view own milk transactions" ON public.milk_point_transactions;
DROP POLICY IF EXISTS "Users can view own milk events" ON public.milk_point_events;
DROP POLICY IF EXISTS "Authenticated users can view milk boosts" ON public.milk_boosts;
DROP POLICY IF EXISTS "Users can create own milk boosts" ON public.milk_boosts;

CREATE POLICY "Users can view own milk wallets"
  ON public.milk_point_wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own milk wallets"
  ON public.milk_point_wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own milk wallets"
  ON public.milk_point_wallets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own milk transactions"
  ON public.milk_point_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own milk events"
  ON public.milk_point_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view milk boosts"
  ON public.milk_boosts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create own milk boosts"
  ON public.milk_boosts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_milk_point_wallets_updated_at ON public.milk_point_wallets;
CREATE TRIGGER update_milk_point_wallets_updated_at
  BEFORE UPDATE ON public.milk_point_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Wallet bootstrap/credit functions
CREATE OR REPLACE FUNCTION public.ensure_milk_wallet(
  p_user_id UUID,
  p_initial_points INTEGER DEFAULT 30
)
RETURNS public.milk_point_wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.milk_point_wallets;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User id is required';
  END IF;

  INSERT INTO public.milk_point_wallets (user_id, balance, total_earned, total_spent)
  VALUES (p_user_id, p_initial_points, p_initial_points, 0)
  ON CONFLICT (user_id) DO NOTHING;

  IF FOUND THEN
    INSERT INTO public.milk_point_events (event_key, user_id)
    VALUES ('wallet_init:' || p_user_id::TEXT, p_user_id)
    ON CONFLICT (event_key) DO NOTHING;

    INSERT INTO public.milk_point_transactions (
      user_id,
      amount,
      balance_after,
      reason,
      actor_id,
      target_type,
      target_id,
      metadata
    )
    VALUES (
      p_user_id,
      p_initial_points,
      p_initial_points,
      'welcome_bonus',
      NULL,
      NULL,
      NULL,
      jsonb_build_object('source', 'wallet_init')
    );
  END IF;

  SELECT *
  INTO v_wallet
  FROM public.milk_point_wallets
  WHERE user_id = p_user_id;

  RETURN v_wallet;
END;
$$;

CREATE OR REPLACE FUNCTION public.credit_milk_points(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_event_key TEXT,
  p_actor_id UUID DEFAULT NULL,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.milk_point_wallets;
BEGIN
  IF p_user_id IS NULL OR p_amount <= 0 THEN
    RETURN FALSE;
  END IF;

  IF COALESCE(TRIM(p_event_key), '') = '' THEN
    RAISE EXCEPTION 'event_key is required for deduplication';
  END IF;

  INSERT INTO public.milk_point_events (event_key, user_id)
  VALUES (p_event_key, p_user_id)
  ON CONFLICT (event_key) DO NOTHING;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO v_wallet FROM public.ensure_milk_wallet(p_user_id, 30);

  UPDATE public.milk_point_wallets
  SET
    balance = balance + p_amount,
    total_earned = total_earned + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING * INTO v_wallet;

  INSERT INTO public.milk_point_transactions (
    user_id,
    amount,
    balance_after,
    reason,
    actor_id,
    target_type,
    target_id,
    metadata
  )
  VALUES (
    p_user_id,
    p_amount,
    v_wallet.balance,
    p_reason,
    p_actor_id,
    p_target_type,
    p_target_id,
    COALESCE(p_metadata, '{}'::jsonb)
  );

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_profile_milk_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_milk_wallet(NEW.id, 30);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_milk_wallet_on_profile ON public.profiles;
CREATE TRIGGER trigger_create_milk_wallet_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile_milk_wallet();

DO $$
DECLARE
  v_profile RECORD;
BEGIN
  FOR v_profile IN
    SELECT p.id
    FROM public.profiles p
  LOOP
    PERFORM public.ensure_milk_wallet(v_profile.id, 30);
  END LOOP;
END;
$$;

-- 3) Point accrual triggers
CREATE OR REPLACE FUNCTION public.handle_post_like_milk_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT p.author_id
  INTO v_owner_id
  FROM public.posts p
  WHERE p.id = NEW.post_id;

  IF v_owner_id IS NULL OR v_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  PERFORM public.credit_milk_points(
    v_owner_id,
    1,
    'post_like_reward',
    'post_like:' || NEW.post_id::TEXT || ':' || NEW.user_id::TEXT,
    NEW.user_id,
    'post',
    NEW.post_id,
    jsonb_build_object('actor_id', NEW.user_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_award_milk_on_post_like ON public.post_likes;
CREATE TRIGGER trigger_award_milk_on_post_like
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_post_like_milk_points();

CREATE OR REPLACE FUNCTION public.handle_community_like_milk_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_target_type TEXT;
  v_target_id UUID;
  v_event_key TEXT;
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    SELECT cp.user_id
    INTO v_owner_id
    FROM public.community_posts cp
    WHERE cp.id = NEW.post_id;

    v_target_type := 'community_post';
    v_target_id := NEW.post_id;
    v_event_key := 'community_post_like:' || NEW.post_id::TEXT || ':' || NEW.user_id::TEXT;
  ELSIF NEW.comment_id IS NOT NULL THEN
    SELECT cc.user_id
    INTO v_owner_id
    FROM public.community_comments cc
    WHERE cc.id = NEW.comment_id;

    v_target_type := 'community_comment';
    v_target_id := NEW.comment_id;
    v_event_key := 'community_comment_like:' || NEW.comment_id::TEXT || ':' || NEW.user_id::TEXT;
  ELSE
    RETURN NEW;
  END IF;

  IF v_owner_id IS NULL OR v_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  PERFORM public.credit_milk_points(
    v_owner_id,
    1,
    'community_like_reward',
    v_event_key,
    NEW.user_id,
    v_target_type,
    v_target_id,
    jsonb_build_object('actor_id', NEW.user_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_award_milk_on_community_like ON public.community_likes;
CREATE TRIGGER trigger_award_milk_on_community_like
  AFTER INSERT ON public.community_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_community_like_milk_points();

CREATE OR REPLACE FUNCTION public.handle_community_comment_milk_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_day_key TEXT;
BEGIN
  SELECT cp.user_id
  INTO v_owner_id
  FROM public.community_posts cp
  WHERE cp.id = NEW.post_id;

  IF v_owner_id IS NULL OR v_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  v_day_key := TO_CHAR(DATE_TRUNC('day', NEW.created_at), 'YYYYMMDD');

  PERFORM public.credit_milk_points(
    v_owner_id,
    2,
    'community_comment_reward',
    'community_comment_daily:' || NEW.post_id::TEXT || ':' || NEW.user_id::TEXT || ':' || v_day_key,
    NEW.user_id,
    'community_post',
    NEW.post_id,
    jsonb_build_object('actor_id', NEW.user_id, 'comment_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_award_milk_on_community_comment ON public.community_comments;
CREATE TRIGGER trigger_award_milk_on_community_comment
  AFTER INSERT ON public.community_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_community_comment_milk_points();

-- 4) Milk point API functions
CREATE OR REPLACE FUNCTION public.get_my_milk_points()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_wallet public.milk_point_wallets;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_wallet FROM public.ensure_milk_wallet(v_user_id, 30);
  RETURN v_wallet.balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_milk_boost(
  p_target_type TEXT,
  p_target_id UUID,
  p_points INTEGER DEFAULT 10,
  p_duration_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  remaining_milk_points INTEGER,
  boost_until TIMESTAMPTZ,
  applied_boost_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_owner_id UUID;
  v_wallet public.milk_point_wallets;
  v_boost_until TIMESTAMPTZ;
  v_boost_score NUMERIC;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_target_type NOT IN ('post', 'community_post') THEN
    RAISE EXCEPTION 'target_type must be post or community_post';
  END IF;

  IF p_points < 1 OR p_points > 200 THEN
    RAISE EXCEPTION 'points must be between 1 and 200';
  END IF;

  IF p_duration_hours < 1 OR p_duration_hours > 72 THEN
    RAISE EXCEPTION 'duration must be between 1 and 72 hours';
  END IF;

  IF p_target_type = 'post' THEN
    SELECT p.author_id
    INTO v_owner_id
    FROM public.posts p
    WHERE p.id = p_target_id;
  ELSE
    SELECT cp.user_id
    INTO v_owner_id
    FROM public.community_posts cp
    WHERE cp.id = p_target_id;
  END IF;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Target content not found';
  END IF;

  IF v_owner_id <> v_user_id THEN
    RAISE EXCEPTION '밀크 포인트 사용은 본인 게시글에만 가능합니다';
  END IF;

  SELECT * INTO v_wallet FROM public.ensure_milk_wallet(v_user_id, 30);

  UPDATE public.milk_point_wallets
  SET
    balance = balance - p_points,
    total_spent = total_spent + p_points,
    updated_at = NOW()
  WHERE user_id = v_user_id
    AND balance >= p_points
  RETURNING * INTO v_wallet;

  IF NOT FOUND THEN
    RAISE EXCEPTION '밀크 포인트가 부족합니다';
  END IF;

  v_boost_until := NOW() + MAKE_INTERVAL(hours => p_duration_hours);
  v_boost_score := p_points * 3.0;

  INSERT INTO public.milk_boosts (
    user_id,
    target_type,
    target_id,
    points_used,
    boost_score,
    expires_at
  )
  VALUES (
    v_user_id,
    p_target_type,
    p_target_id,
    p_points,
    v_boost_score,
    v_boost_until
  );

  INSERT INTO public.milk_point_transactions (
    user_id,
    amount,
    balance_after,
    reason,
    actor_id,
    target_type,
    target_id,
    metadata
  )
  VALUES (
    v_user_id,
    -p_points,
    v_wallet.balance,
    'boost_spend',
    v_user_id,
    p_target_type,
    p_target_id,
    jsonb_build_object('duration_hours', p_duration_hours)
  );

  RETURN QUERY
  SELECT
    v_wallet.balance,
    v_boost_until,
    v_boost_score;
END;
$$;

-- 5) Ranked retrieval RPCs (recent 3 days: engagement + milk boost, tie -> latest)
CREATE OR REPLACE FUNCTION public.get_ranked_posts(
  p_city TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_include_hidden BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  title TEXT,
  price BIGINT,
  city TEXT,
  neighborhood TEXT,
  preferred_metro_stations TEXT[],
  created_at TIMESTAMPTZ,
  images TEXT[],
  status TEXT,
  view_count INTEGER,
  author_full_name TEXT,
  likes_count INTEGER,
  interests_count INTEGER,
  user_liked BOOLEAN,
  user_interested BOOLEAN,
  milk_boost_score NUMERIC,
  milk_boost_until TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  WITH like_stats AS (
    SELECT pl.post_id, COUNT(*)::INTEGER AS likes_count
    FROM public.post_likes pl
    GROUP BY pl.post_id
  ),
  interest_stats AS (
    SELECT pi.post_id, COUNT(*)::INTEGER AS interests_count
    FROM public.post_interests pi
    GROUP BY pi.post_id
  ),
  active_boosts AS (
    SELECT
      mb.target_id,
      SUM(mb.boost_score)::NUMERIC AS boost_score,
      MAX(mb.expires_at) AS boost_until
    FROM public.milk_boosts mb
    WHERE mb.target_type = 'post'
      AND mb.expires_at > NOW()
    GROUP BY mb.target_id
  ),
  ranked AS (
    SELECT
      p.id,
      p.author_id,
      p.title,
      p.price,
      p.city,
      p.neighborhood,
      p.preferred_metro_stations,
      p.created_at,
      p.images,
      p.status,
      COALESCE(p.view_count, 0)::INTEGER AS view_count,
      pr.full_name AS author_full_name,
      COALESCE(ls.likes_count, 0)::INTEGER AS likes_count,
      COALESCE(is2.interests_count, 0)::INTEGER AS interests_count,
      EXISTS (
        SELECT 1
        FROM public.post_likes pl2
        WHERE pl2.post_id = p.id
          AND pl2.user_id = auth.uid()
      ) AS user_liked,
      EXISTS (
        SELECT 1
        FROM public.post_interests pi2
        WHERE pi2.post_id = p.id
          AND pi2.user_id = auth.uid()
      ) AS user_interested,
      COALESCE(ab.boost_score, 0)::NUMERIC AS milk_boost_score,
      ab.boost_until AS milk_boost_until,
      CASE
        WHEN p.created_at >= NOW() - INTERVAL '3 days' THEN 0
        ELSE 1
      END AS freshness_bucket,
      CASE
        WHEN p.created_at >= NOW() - INTERVAL '3 days' THEN
          (LN(1 + COALESCE(ls.likes_count, 0)) * 6.0)
          + (LN(1 + COALESCE(is2.interests_count, 0)) * 4.0)
          + (LN(1 + COALESCE(p.view_count, 0)) * 2.0)
          + COALESCE(ab.boost_score, 0)
          - ((EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600.0) * 0.12)
        ELSE NULL
      END AS ranked_score
    FROM public.posts p
    LEFT JOIN public.profiles pr ON pr.id = p.author_id
    LEFT JOIN like_stats ls ON ls.post_id = p.id
    LEFT JOIN interest_stats is2 ON is2.post_id = p.id
    LEFT JOIN active_boosts ab ON ab.target_id = p.id
    WHERE
      (p_city IS NULL OR p.city = p_city)
      AND (
        p.status = 'active'
        OR (p.status = 'hidden' AND p.author_id = auth.uid())
        OR (
          p_include_hidden
          AND p.status = 'hidden'
          AND EXISTS (
            SELECT 1
            FROM public.profiles admin_profile
            WHERE admin_profile.id = auth.uid()
              AND admin_profile.user_role IN ('admin', 'developer')
          )
        )
      )
  )
  SELECT
    ranked.id,
    ranked.author_id,
    ranked.title,
    ranked.price,
    ranked.city,
    ranked.neighborhood,
    ranked.preferred_metro_stations,
    ranked.created_at,
    ranked.images,
    ranked.status,
    ranked.view_count,
    ranked.author_full_name,
    ranked.likes_count,
    ranked.interests_count,
    ranked.user_liked,
    ranked.user_interested,
    ranked.milk_boost_score,
    ranked.milk_boost_until
  FROM ranked
  ORDER BY
    ranked.freshness_bucket ASC,
    ranked.ranked_score DESC NULLS LAST,
    ranked.created_at DESC
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);
$$;

CREATE OR REPLACE FUNCTION public.get_ranked_community_posts(
  p_city TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_include_hidden BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  images TEXT[],
  category TEXT,
  created_at TIMESTAMPTZ,
  user_id UUID,
  view_count INTEGER,
  author_full_name TEXT,
  author_avatar_url TEXT,
  author_bread_level INTEGER,
  author_city TEXT,
  author_user_role TEXT,
  likes_count INTEGER,
  comments_count INTEGER,
  is_liked BOOLEAN,
  milk_boost_score NUMERIC,
  milk_boost_until TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  WITH like_stats AS (
    SELECT cl.post_id, COUNT(*)::INTEGER AS likes_count
    FROM public.community_likes cl
    WHERE cl.post_id IS NOT NULL
    GROUP BY cl.post_id
  ),
  comment_stats AS (
    SELECT cc.post_id, COUNT(*)::INTEGER AS comments_count
    FROM public.community_comments cc
    GROUP BY cc.post_id
  ),
  active_boosts AS (
    SELECT
      mb.target_id,
      SUM(mb.boost_score)::NUMERIC AS boost_score,
      MAX(mb.expires_at) AS boost_until
    FROM public.milk_boosts mb
    WHERE mb.target_type = 'community_post'
      AND mb.expires_at > NOW()
    GROUP BY mb.target_id
  ),
  ranked AS (
    SELECT
      cp.id,
      cp.title,
      cp.content,
      cp.images,
      cp.category,
      cp.created_at,
      cp.user_id,
      COALESCE(cp.view_count, 0)::INTEGER AS view_count,
      pr.full_name AS author_full_name,
      pr.avatar_url AS author_avatar_url,
      COALESCE(pr.bread_level, 1)::INTEGER AS author_bread_level,
      pr.city AS author_city,
      pr.user_role AS author_user_role,
      COALESCE(ls.likes_count, 0)::INTEGER AS likes_count,
      COALESCE(cs.comments_count, 0)::INTEGER AS comments_count,
      EXISTS (
        SELECT 1
        FROM public.community_likes cl2
        WHERE cl2.post_id = cp.id
          AND cl2.user_id = auth.uid()
      ) AS is_liked,
      COALESCE(ab.boost_score, 0)::NUMERIC AS milk_boost_score,
      ab.boost_until AS milk_boost_until,
      CASE
        WHEN cp.created_at >= NOW() - INTERVAL '3 days' THEN 0
        ELSE 1
      END AS freshness_bucket,
      CASE
        WHEN cp.created_at >= NOW() - INTERVAL '3 days' THEN
          (LN(1 + COALESCE(ls.likes_count, 0)) * 5.0)
          + (LN(1 + COALESCE(cs.comments_count, 0)) * 8.0)
          + (LN(1 + COALESCE(cp.view_count, 0)) * 2.0)
          + COALESCE(ab.boost_score, 0)
          - ((EXTRACT(EPOCH FROM (NOW() - cp.created_at)) / 3600.0) * 0.15)
        ELSE NULL
      END AS ranked_score
    FROM public.community_posts cp
    JOIN public.profiles pr ON pr.id = cp.user_id
    LEFT JOIN like_stats ls ON ls.post_id = cp.id
    LEFT JOIN comment_stats cs ON cs.post_id = cp.id
    LEFT JOIN active_boosts ab ON ab.target_id = cp.id
    WHERE
      (p_city IS NULL OR pr.city = p_city)
      AND (
        COALESCE(cp.is_hidden, FALSE) = FALSE
        OR cp.user_id = auth.uid()
        OR (
          p_include_hidden
          AND EXISTS (
            SELECT 1
            FROM public.profiles admin_profile
            WHERE admin_profile.id = auth.uid()
              AND admin_profile.user_role IN ('admin', 'developer')
          )
        )
      )
  )
  SELECT
    ranked.id,
    ranked.title,
    ranked.content,
    ranked.images,
    ranked.category,
    ranked.created_at,
    ranked.user_id,
    ranked.view_count,
    ranked.author_full_name,
    ranked.author_avatar_url,
    ranked.author_bread_level,
    ranked.author_city,
    ranked.author_user_role,
    ranked.likes_count,
    ranked.comments_count,
    ranked.is_liked,
    ranked.milk_boost_score,
    ranked.milk_boost_until
  FROM ranked
  ORDER BY
    ranked.freshness_bucket ASC,
    ranked.ranked_score DESC NULLS LAST,
    ranked.created_at DESC
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION public.ensure_milk_wallet(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_milk_points(UUID, INTEGER, TEXT, TEXT, UUID, TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_milk_points() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_milk_boost(TEXT, UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ranked_posts(TEXT, INTEGER, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ranked_community_posts(TEXT, INTEGER, INTEGER, BOOLEAN) TO authenticated;
