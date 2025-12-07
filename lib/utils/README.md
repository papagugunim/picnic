# Date Utils - 모스크바 시간대 (GMT+3)

이 프로젝트의 모든 시간은 모스크바 시간대(GMT+3, Europe/Moscow)를 사용합니다.

## 사용법

```typescript
import {
  now,
  toMoscowTime,
  formatTimeAgo,
  formatDate,
  formatDateFriendly
} from '@/lib/utils/date'

// 현재 모스크바 시간
const currentTime = now()

// Date를 모스크바 시간으로 변환
const moscowTime = toMoscowTime(new Date())
const moscowTimeFromString = toMoscowTime('2024-01-15T10:30:00Z')

// 게시물 등의 경과 시간 표시
const timeAgo = formatTimeAgo(post.created_at) // "3시간 전"

// 날짜 포맷팅
const formatted = formatDate(post.created_at, 'YYYY-MM-DD HH:mm') // "2024-01-15 13:30"

// 친근한 형식
const friendly = formatDateFriendly(post.created_at) // "2024년 1월 15일 오후 1:30"
```

## 주요 함수

### `now()`
현재 시간을 모스크바 시간대로 반환합니다.

### `toMoscowTime(date)`
Date 객체나 문자열을 모스크바 시간대로 변환합니다.

### `formatTimeAgo(date)`
게시물 등의 경과 시간을 친근하게 표시합니다.
- "방금 전"
- "5분 전"
- "3시간 전"
- "2일 전"
- "1주 전"
- "3개월 전"
- "1년 전"

### `formatDate(date, format?)`
날짜를 지정된 형식으로 포맷팅합니다.
기본 형식: `'YYYY-MM-DD HH:mm:ss'`

### `formatDateFriendly(date)`
날짜를 보기 좋은 형식으로 표시합니다.
예: "2024년 1월 15일 오후 3:30"

### `formatTime(date)`
시간만 표시합니다.
예: "오후 3:30"

### `formatDateOnly(date)`
날짜만 표시합니다.
예: "2024년 1월 15일"

## 컴포넌트에서 사용 예시

```typescript
import { formatTimeAgo } from '@/lib/utils/date'

export default function PostCard({ post }) {
  return (
    <div>
      <h3>{post.title}</h3>
      <p className="text-muted-foreground">
        {formatTimeAgo(post.created_at)}
      </p>
    </div>
  )
}
```
