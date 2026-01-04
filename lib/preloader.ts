/**
 * 백그라운드 페이지 프리로딩 시스템
 * 로그인 후 주요 페이지의 데이터를 미리 캐싱하여 빠른 페이지 전환 제공
 */

import { createClient } from '@/lib/supabase/client'
import { setCache, CACHE_KEYS } from '@/lib/cache'
import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Preloader')

/**
 * 날씨 데이터 프리로드
 */
async function preloadWeather(city: string) {
  try {
    const cityCoords: Record<string, { lat: number; lon: number }> = {
      'Moscow': { lat: 55.7558, lon: 37.6173 },
      'Saint Petersburg': { lat: 59.9311, lon: 30.3609 },
      'moscow': { lat: 55.7558, lon: 37.6173 },
      'spb': { lat: 59.9311, lon: 30.3609 }
    }

    const coords = cityCoords[city]
    if (!coords) return

    const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY
    if (!apiKey || apiKey === 'your-api-key-here') {
      logger.log('날씨 API 키 없음 - 프리로드 스킵')
      return
    }

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}&units=metric&lang=kr`
    )

    if (!response.ok) return

    const data = await response.json()

    type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'snow'
    const WEATHER_ICONS: Record<WeatherCondition, string> = {
      clear: '☀️',
      cloudy: '☁️',
      rain: '🌧️',
      snow: '❄️'
    }

    let condition: WeatherCondition = 'clear'
    const weatherId = data.weather[0].id

    if (weatherId >= 200 && weatherId < 600) {
      condition = 'rain'
    } else if (weatherId >= 600 && weatherId < 700) {
      condition = 'snow'
    } else if (weatherId >= 800 && weatherId < 900) {
      condition = weatherId === 800 ? 'clear' : 'cloudy'
    }

    const weatherData = {
      condition,
      temp: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      icon: WEATHER_ICONS[condition]
    }

    setCache(CACHE_KEYS.WEATHER(city), weatherData, 30 * 60 * 1000)
    logger.log('✅ 날씨 데이터 프리로드 완료')
  } catch (error) {
    logger.error('날씨 프리로드 실패:', error)
  }
}

/**
 * 환율 데이터 프리로드
 */
async function preloadExchangeRates() {
  try {
    const response = await fetch('/api/exchange-rates')
    if (!response.ok) return

    const data = await response.json()

    const rates = {
      krwToRub: data.krwToRub,
      rubToUsd: data.rubToUsd,
      lastUpdated: new Date(data.lastUpdated).toLocaleString('ko-KR'),
      source: data.source
    }

    setCache(CACHE_KEYS.EXCHANGE_RATES, rates, 60 * 60 * 1000)
    logger.log('✅ 환율 데이터 프리로드 완료')
  } catch (error) {
    logger.error('환율 프리로드 실패:', error)
  }
}

/**
 * 게시글 데이터 프리로드
 */
async function preloadPosts() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('city')
      .eq('id', user.id)
      .single()

    const cityFilter = profile?.city

    let query = supabase
      .from('posts')
      .select(`
        id,
        title,
        price,
        city,
        neighborhood,
        preferred_metro_stations,
        created_at,
        images,
        status,
        profiles:author_id (
          full_name
        )
      `)
      .eq('status', 'active')

    if (cityFilter) {
      query = query.eq('city', cityFilter)
    }

    const { data: postsData, error } = await query
      .order('created_at', { ascending: false })
      .limit(20)

    if (error || !postsData) return

    const postIds = postsData.map((p: any) => p.id)

    const [likesResult, interestsResult] = await Promise.all([
      supabase
        .from('post_likes')
        .select('post_id, user_id')
        .in('post_id', postIds),
      supabase
        .from('post_interests')
        .select('post_id, user_id')
        .in('post_id', postIds)
    ])

    const likesData = likesResult.data || []
    const interestsData = interestsResult.data || []

    const likesCountMap = new Map<string, number>()
    const interestsCountMap = new Map<string, number>()
    const userLikesSet = new Set<string>()
    const userInterestsSet = new Set<string>()

    likesData.forEach(like => {
      likesCountMap.set(like.post_id, (likesCountMap.get(like.post_id) || 0) + 1)
      if (like.user_id === user.id) {
        userLikesSet.add(like.post_id)
      }
    })

    interestsData.forEach(interest => {
      interestsCountMap.set(interest.post_id, (interestsCountMap.get(interest.post_id) || 0) + 1)
      if (interest.user_id === user.id) {
        userInterestsSet.add(interest.post_id)
      }
    })

    const postsWithReactions = postsData.map((post: any) => ({
      ...post,
      likes_count: likesCountMap.get(post.id) || 0,
      interests_count: interestsCountMap.get(post.id) || 0,
      user_liked: userLikesSet.has(post.id),
      user_interested: userInterestsSet.has(post.id),
    }))

    setCache(CACHE_KEYS.POSTS(1), postsWithReactions, 5 * 60 * 1000)
    logger.log('✅ 게시글 데이터 프리로드 완료')
  } catch (error) {
    logger.error('게시글 프리로드 실패:', error)
  }
}

/**
 * 모든 주요 데이터를 백그라운드에서 프리로드
 * 로그인 후 자동으로 호출하여 페이지 전환 시 즉시 데이터 표시
 */
export async function preloadAllPages() {
  logger.log('🚀 백그라운드 프리로딩 시작...')

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // 사용자 도시 정보 가져오기
  const { data: profile } = await supabase
    .from('profiles')
    .select('city')
    .eq('id', user.id)
    .single()

  const city = profile?.city

  // 병렬로 모든 데이터 프리로드 (순서 무관)
  await Promise.allSettled([
    city ? preloadWeather(city) : Promise.resolve(),
    preloadExchangeRates(),
    preloadPosts(),
  ])

  logger.log('✅ 백그라운드 프리로딩 완료!')
}
