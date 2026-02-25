-- ============================================
-- Daily milk bonus for privileged roles
-- - developer: +500 every day at 09:00 (Europe/Moscow)
-- - admin: +100 every day at 09:00 (Europe/Moscow)
-- ============================================

CREATE OR REPLACE FUNCTION public.award_daily_milk_role_bonus(
  p_run_date DATE DEFAULT (NOW() AT TIME ZONE 'Europe/Moscow')::DATE
)
RETURNS TABLE (
  run_date DATE,
  awarded_developers INTEGER,
  awarded_admins INTEGER,
  total_awarded_points INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_awarded BOOLEAN;
  v_amount INTEGER;
  v_event_key TEXT;
  v_day DATE := COALESCE(p_run_date, (NOW() AT TIME ZONE 'Europe/Moscow')::DATE);
  v_day_key TEXT;
  v_awarded_developers INTEGER := 0;
  v_awarded_admins INTEGER := 0;
  v_total_awarded INTEGER := 0;
BEGIN
  v_day_key := TO_CHAR(v_day, 'YYYYMMDD');

  FOR v_profile IN
    SELECT p.id, p.user_role
    FROM public.profiles p
    WHERE p.user_role IN ('developer', 'admin')
  LOOP
    v_amount := CASE v_profile.user_role
      WHEN 'developer' THEN 500
      WHEN 'admin' THEN 100
      ELSE 0
    END;

    IF v_amount <= 0 THEN
      CONTINUE;
    END IF;

    v_event_key :=
      'daily_role_bonus:'
      || v_profile.user_role
      || ':'
      || v_profile.id::TEXT
      || ':'
      || v_day_key;

    v_awarded := public.credit_milk_points(
      v_profile.id,
      v_amount,
      'daily_role_bonus',
      v_event_key,
      NULL,
      NULL,
      NULL,
      jsonb_build_object(
        'bonus_role', v_profile.user_role,
        'run_date', v_day::TEXT,
        'timezone', 'Europe/Moscow'
      )
    );

    IF v_awarded THEN
      IF v_profile.user_role = 'developer' THEN
        v_awarded_developers := v_awarded_developers + 1;
      ELSIF v_profile.user_role = 'admin' THEN
        v_awarded_admins := v_awarded_admins + 1;
      END IF;

      v_total_awarded := v_total_awarded + v_amount;
    END IF;
  END LOOP;

  RETURN QUERY
  SELECT
    v_day,
    v_awarded_developers,
    v_awarded_admins,
    v_total_awarded;
END;
$$;

REVOKE ALL ON FUNCTION public.award_daily_milk_role_bonus(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_daily_milk_role_bonus(DATE) TO service_role;

