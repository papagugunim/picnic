-- ============================================
-- Fix milk welcome bonus mismatch (30 -> 1000)
-- - New wallets start with 1000 points
-- - Existing wallets created with old 30 welcome bonus are backfilled by +970
-- ============================================

CREATE OR REPLACE FUNCTION public.ensure_milk_wallet(
  p_user_id UUID,
  p_initial_points INTEGER DEFAULT 1000
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

  SELECT * INTO v_wallet FROM public.ensure_milk_wallet(p_user_id, 1000);

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
  PERFORM public.ensure_milk_wallet(NEW.id, 1000);
  RETURN NEW;
END;
$$;

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

  SELECT * INTO v_wallet FROM public.ensure_milk_wallet(v_user_id, 1000);
  RETURN v_wallet.balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_milk_boost(
  p_target_type TEXT,
  p_target_id UUID,
  p_points INTEGER DEFAULT 100,
  p_duration_hours INTEGER DEFAULT 6
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
  v_user_role TEXT;
  v_wallet public.milk_point_wallets;
  v_boost_until TIMESTAMPTZ;
  v_boost_score NUMERIC;
  v_lock_key BIGINT;
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

  v_lock_key := hashtextextended('milk_boost:' || p_target_type || ':' || p_target_id::TEXT, 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  IF EXISTS (
    SELECT 1
    FROM public.milk_boosts mb
    WHERE mb.target_type = p_target_type
      AND mb.target_id = p_target_id
      AND mb.expires_at > NOW()
  ) THEN
    RAISE EXCEPTION '이미 밀크 부스트가 적용 중인 게시글입니다';
  END IF;

  SELECT p.user_role
  INTO v_user_role
  FROM public.profiles p
  WHERE p.id = v_user_id;

  SELECT * INTO v_wallet FROM public.ensure_milk_wallet(v_user_id, 1000);

  IF v_user_role <> 'developer' THEN
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

  IF v_user_role = 'developer' THEN
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
      0,
      v_wallet.balance,
      'boost_spend_unlimited',
      v_user_id,
      p_target_type,
      p_target_id,
      jsonb_build_object(
        'duration_hours', p_duration_hours,
        'requested_points', p_points,
        'unlimited', TRUE
      )
    );
  ELSE
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
      jsonb_build_object(
        'duration_hours', p_duration_hours,
        'requested_points', p_points
      )
    );
  END IF;

  RETURN QUERY
  SELECT
    v_wallet.balance,
    v_boost_until,
    v_boost_score;
END;
$$;

DO $$
DECLARE
  v_profile RECORD;
  v_wallet RECORD;
BEGIN
  FOR v_profile IN
    SELECT p.id
    FROM public.profiles p
  LOOP
    PERFORM public.ensure_milk_wallet(v_profile.id, 1000);
  END LOOP;

  FOR v_wallet IN
    SELECT w.user_id
    FROM public.milk_point_wallets w
    WHERE w.balance = 30
      AND w.total_earned = 30
      AND w.total_spent = 0
      AND EXISTS (
        SELECT 1
        FROM public.milk_point_transactions t
        WHERE t.user_id = w.user_id
          AND t.reason = 'welcome_bonus'
          AND t.amount = 30
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.milk_point_transactions t
        WHERE t.user_id = w.user_id
          AND t.reason <> 'welcome_bonus'
      )
  LOOP
    PERFORM public.credit_milk_points(
      v_wallet.user_id,
      970,
      'welcome_bonus_adjustment',
      'welcome_bonus_adjustment_20260303:' || v_wallet.user_id::TEXT,
      NULL,
      NULL,
      NULL,
      jsonb_build_object('from', 30, 'to', 1000)
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_milk_wallet(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_milk_points(UUID, INTEGER, TEXT, TEXT, UUID, TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_milk_points() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_milk_boost(TEXT, UUID, INTEGER, INTEGER) TO authenticated;
