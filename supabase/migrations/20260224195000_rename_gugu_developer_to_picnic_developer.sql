-- Rename target developer nickname from "구구" to "피크닉개발자"
-- and patch existing notification texts generated with old nickname.

DO $$
DECLARE
  v_target_user_id UUID := '46e8160e-55ae-4f64-bd5c-b703818b4b94';
  v_profile_count INTEGER := 0;
  v_updated_profiles INTEGER := 0;
  v_updated_notifications INTEGER := 0;
BEGIN
  SELECT COUNT(*)
  INTO v_profile_count
  FROM public.profiles
  WHERE id = v_target_user_id
    AND user_role = 'developer';

  IF v_profile_count <> 1 THEN
    RAISE EXCEPTION 'Target developer profile not found: %', v_target_user_id;
  END IF;

  UPDATE public.profiles
  SET
    full_name = '피크닉개발자',
    updated_at = NOW()
  WHERE id = v_target_user_id;
  GET DIAGNOSTICS v_updated_profiles = ROW_COUNT;

  UPDATE auth.users
  SET
    raw_user_meta_data = jsonb_set(
      jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{full_name}',
        to_jsonb('피크닉개발자'::text),
        true
      ),
      '{name}',
      to_jsonb('피크닉개발자'::text),
      true
    )
  WHERE id = v_target_user_id;

  UPDATE public.notifications
  SET
    title = REGEXP_REPLACE(title, '(구구 개발자|구구)', '피크닉개발자', 'g'),
    message = REGEXP_REPLACE(message, '(구구 개발자|구구)', '피크닉개발자', 'g')
  WHERE actor_id = v_target_user_id
    AND (
      title ~ '(구구 개발자|구구)'
      OR message ~ '(구구 개발자|구구)'
    );
  GET DIAGNOSTICS v_updated_notifications = ROW_COUNT;

  RAISE NOTICE 'Nickname migration done. profile rows: %, notifications rows: %', v_updated_profiles, v_updated_notifications;
END
$$;
