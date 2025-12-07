import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ko'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)
dayjs.locale('ko')

// 모스크바 시간대 (GMT+3)
export const TIMEZONE = 'Europe/Moscow'

/**
 * 현재 시간을 모스크바 시간대로 반환
 */
export function now() {
  return dayjs().tz(TIMEZONE)
}

/**
 * Date 객체나 문자열을 모스크바 시간대로 변환
 */
export function toMoscowTime(date: string | Date | dayjs.Dayjs) {
  return dayjs(date).tz(TIMEZONE)
}

/**
 * 상대 시간 표시 (예: "3시간 전", "2일 전")
 */
export function fromNow(date: string | Date | dayjs.Dayjs) {
  return toMoscowTime(date).fromNow()
}

/**
 * 날짜 포맷팅
 * @param date - 날짜
 * @param format - 포맷 (기본: 'YYYY-MM-DD HH:mm:ss')
 */
export function formatDate(
  date: string | Date | dayjs.Dayjs,
  format: string = 'YYYY-MM-DD HH:mm:ss'
) {
  return toMoscowTime(date).format(format)
}

/**
 * 날짜를 보기 좋은 형식으로 표시
 * 예: "2024년 1월 15일 오후 3:30"
 */
export function formatDateFriendly(date: string | Date | dayjs.Dayjs) {
  return toMoscowTime(date).format('YYYY년 M월 D일 A h:mm')
}

/**
 * 시간만 표시
 * 예: "오후 3:30"
 */
export function formatTime(date: string | Date | dayjs.Dayjs) {
  return toMoscowTime(date).format('A h:mm')
}

/**
 * 날짜만 표시
 * 예: "2024년 1월 15일"
 */
export function formatDateOnly(date: string | Date | dayjs.Dayjs) {
  return toMoscowTime(date).format('YYYY년 M월 D일')
}

/**
 * 두 날짜의 차이 계산 (일 단위)
 */
export function diffInDays(
  date1: string | Date | dayjs.Dayjs,
  date2: string | Date | dayjs.Dayjs
) {
  return toMoscowTime(date1).diff(toMoscowTime(date2), 'day')
}

/**
 * 두 날짜의 차이 계산 (시간 단위)
 */
export function diffInHours(
  date1: string | Date | dayjs.Dayjs,
  date2: string | Date | dayjs.Dayjs
) {
  return toMoscowTime(date1).diff(toMoscowTime(date2), 'hour')
}

/**
 * 게시물 등의 경과 시간을 친근하게 표시
 * 예: "방금 전", "5분 전", "3시간 전", "2일 전"
 */
export function formatTimeAgo(date: string | Date | dayjs.Dayjs) {
  const moscowDate = toMoscowTime(date)
  const currentTime = now()

  const minutes = currentTime.diff(moscowDate, 'minute')
  const hours = currentTime.diff(moscowDate, 'hour')
  const days = currentTime.diff(moscowDate, 'day')

  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  if (days < 7) return `${days}일 전`
  if (days < 30) return `${Math.floor(days / 7)}주 전`
  if (days < 365) return `${Math.floor(days / 30)}개월 전`
  return `${Math.floor(days / 365)}년 전`
}
