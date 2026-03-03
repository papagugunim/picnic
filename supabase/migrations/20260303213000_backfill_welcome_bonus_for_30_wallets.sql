-- ============================================
-- Backfill welcome bonus for accounts that were initialized with 30 points
-- to match the 1000-point welcome policy.
-- ============================================

DO $$
DECLARE
  v_user RECORD;
BEGIN
  FOR v_user IN
    SELECT DISTINCT t.user_id
    FROM public.milk_point_transactions t
    WHERE t.reason = 'welcome_bonus'
      AND t.amount = 30
      AND NOT EXISTS (
        SELECT 1
        FROM public.milk_point_transactions t2
        WHERE t2.user_id = t.user_id
          AND (
            t2.reason = 'welcome_bonus_adjustment'
            OR (t2.reason = 'welcome_bonus' AND t2.amount >= 1000)
          )
      )
  LOOP
    PERFORM public.credit_milk_points(
      v_user.user_id,
      970,
      'welcome_bonus_adjustment',
      'welcome_bonus_adjustment_backfill_20260303:' || v_user.user_id::TEXT,
      NULL,
      NULL,
      NULL,
      jsonb_build_object('from', 30, 'to', 1000, 'source', 'backfill')
    );
  END LOOP;
END;
$$;
