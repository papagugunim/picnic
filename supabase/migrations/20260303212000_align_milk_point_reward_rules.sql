-- ============================================
-- Align milk point reward rules with current product guide
-- - Like received: +5
-- - Like action (to others): +1
-- - Comment received: +10
-- - Comment action (to others): +10
-- - Free-share completed sale: +1000
-- - Bread level up: +1000 per level-up step
-- ============================================

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

  -- 받은 좋아요 +5
  PERFORM public.credit_milk_points(
    v_owner_id,
    5,
    'post_like_reward',
    'post_like_owner:' || NEW.post_id::TEXT || ':' || NEW.user_id::TEXT,
    NEW.user_id,
    'post',
    NEW.post_id,
    jsonb_build_object('actor_id', NEW.user_id, 'kind', 'received_like')
  );

  -- 내가 누른 좋아요 +1
  PERFORM public.credit_milk_points(
    NEW.user_id,
    1,
    'my_like_action_reward',
    'post_like_actor:' || NEW.post_id::TEXT || ':' || NEW.user_id::TEXT,
    NEW.user_id,
    'post',
    NEW.post_id,
    jsonb_build_object('target_owner_id', v_owner_id, 'kind', 'like_action')
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
  v_target_key TEXT;
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    SELECT cp.user_id
    INTO v_owner_id
    FROM public.community_posts cp
    WHERE cp.id = NEW.post_id;

    v_target_type := 'community_post';
    v_target_id := NEW.post_id;
    v_target_key := 'community_post:' || NEW.post_id::TEXT;
  ELSIF NEW.comment_id IS NOT NULL THEN
    SELECT cc.user_id
    INTO v_owner_id
    FROM public.community_comments cc
    WHERE cc.id = NEW.comment_id;

    v_target_type := 'community_comment';
    v_target_id := NEW.comment_id;
    v_target_key := 'community_comment:' || NEW.comment_id::TEXT;
  ELSE
    RETURN NEW;
  END IF;

  IF v_owner_id IS NULL OR v_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- 받은 좋아요 +5
  PERFORM public.credit_milk_points(
    v_owner_id,
    5,
    'community_like_reward',
    'community_like_owner:' || v_target_key || ':' || NEW.user_id::TEXT,
    NEW.user_id,
    v_target_type,
    v_target_id,
    jsonb_build_object('actor_id', NEW.user_id, 'kind', 'received_like')
  );

  -- 내가 누른 좋아요 +1
  PERFORM public.credit_milk_points(
    NEW.user_id,
    1,
    'my_like_action_reward',
    'community_like_actor:' || v_target_key || ':' || NEW.user_id::TEXT,
    NEW.user_id,
    v_target_type,
    v_target_id,
    jsonb_build_object('target_owner_id', v_owner_id, 'kind', 'like_action')
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
BEGIN
  SELECT cp.user_id
  INTO v_owner_id
  FROM public.community_posts cp
  WHERE cp.id = NEW.post_id;

  IF v_owner_id IS NULL OR v_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- 내 게시글에 받은 댓글 +10
  PERFORM public.credit_milk_points(
    v_owner_id,
    10,
    'community_comment_reward',
    'community_comment_owner:' || NEW.id::TEXT,
    NEW.user_id,
    'community_post',
    NEW.post_id,
    jsonb_build_object('actor_id', NEW.user_id, 'comment_id', NEW.id, 'kind', 'received_comment')
  );

  -- 내가 남긴 댓글 +10
  PERFORM public.credit_milk_points(
    NEW.user_id,
    10,
    'my_comment_action_reward',
    'community_comment_actor:' || NEW.id::TEXT,
    NEW.user_id,
    'community_post',
    NEW.post_id,
    jsonb_build_object('target_owner_id', v_owner_id, 'comment_id', NEW.id, 'kind', 'comment_action')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_award_milk_on_community_comment ON public.community_comments;
CREATE TRIGGER trigger_award_milk_on_community_comment
  AFTER INSERT ON public.community_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_community_comment_milk_points();

CREATE OR REPLACE FUNCTION public.handle_free_share_completion_milk_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.author_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'sold'
     AND COALESCE(OLD.status, '') <> 'sold'
     AND COALESCE(NEW.price, 0) = 0 THEN
    PERFORM public.credit_milk_points(
      NEW.author_id,
      1000,
      'free_share_completion_bonus',
      'free_share_completed:' || NEW.id::TEXT,
      NEW.author_id,
      'post',
      NEW.id,
      jsonb_build_object('post_id', NEW.id, 'kind', 'free_share_completion')
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_award_milk_on_free_share_completion ON public.posts;
CREATE TRIGGER trigger_award_milk_on_free_share_completion
  AFTER UPDATE OF status ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_free_share_completion_milk_bonus();

CREATE OR REPLACE FUNCTION public.handle_bread_level_up_milk_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_level INTEGER;
  v_old_level INTEGER := COALESCE(OLD.bread_level, 1);
  v_new_level INTEGER := COALESCE(NEW.bread_level, 1);
BEGIN
  IF NEW.id IS NULL OR v_new_level <= v_old_level THEN
    RETURN NEW;
  END IF;

  FOR v_level IN (v_old_level + 1)..v_new_level LOOP
    PERFORM public.credit_milk_points(
      NEW.id,
      1000,
      'bread_level_up_bonus',
      'bread_level_up:' || NEW.id::TEXT || ':' || v_level::TEXT,
      NEW.id,
      NULL,
      NULL,
      jsonb_build_object('from_level', v_old_level, 'to_level', v_level)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_award_milk_on_bread_level_up ON public.profiles;
CREATE TRIGGER trigger_award_milk_on_bread_level_up
  AFTER UPDATE OF bread_level ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_bread_level_up_milk_bonus();
