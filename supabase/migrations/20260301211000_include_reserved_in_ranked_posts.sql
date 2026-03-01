-- Include reserved posts in ranked feed while excluding sold posts from list
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
        p.status IN ('active', 'reserved')
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
