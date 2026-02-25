-- ============================================
-- Developer milk point unlimited boost spend
-- ============================================

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
  v_user_role TEXT;
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

  SELECT p.user_role
  INTO v_user_role
  FROM public.profiles p
  WHERE p.id = v_user_id;

  SELECT * INTO v_wallet FROM public.ensure_milk_wallet(v_user_id, 30);

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

    RETURN QUERY
    SELECT
      v_wallet.balance,
      v_boost_until,
      v_boost_score;
    RETURN;
  END IF;

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

GRANT EXECUTE ON FUNCTION public.apply_milk_boost(TEXT, UUID, INTEGER, INTEGER) TO authenticated;

