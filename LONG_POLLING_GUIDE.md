# Long Polling 테스트 및 배포 가이드

## 개요

Picnic 채팅 시스템을 Supabase Realtime에서 Long Polling 방식으로 전환하는 가이드입니다.

---

## 완료된 작업 (Phase 1-4)

### ✅ Phase 1: API 엔드포인트 구현
3개의 REST API 생성:
- `GET /api/chat/poll` - Long Polling 메시지 조회
- `POST /api/chat/messages` - 메시지 전송
- `PATCH /api/chat/messages/read` - 읽음 처리

### ✅ Phase 2: Feature Flag 구현
```bash
NEXT_PUBLIC_USE_LONG_POLLING="false"  # Realtime 사용
NEXT_PUBLIC_USE_LONG_POLLING="true"   # Long Polling 사용
```

### ✅ Phase 3: useMessages.ts Long Polling 구현
- 무한 폴링 루프 (`startPolling`)
- 지수 백오프 재연결 (최대 5회)
- 낙관적 업데이트 유지
- AbortController로 안전한 정리

### ✅ Phase 4: useChats.ts Realtime 제거
- 초기 로드만 유지
- Realtime 구독 제거

---

## 로컬 테스트 방법

### 1. Long Polling 모드 활성화

`.env.local` 파일 수정:
```bash
NEXT_PUBLIC_USE_LONG_POLLING="true"
```

### 2. 개발 서버 실행

```bash
npm run dev
```

### 3. 테스트 시나리오

#### 시나리오 1: 기본 메시지 송수신
1. 두 개의 브라우저 탭 열기 (또는 시크릿 모드)
2. 각각 다른 계정으로 로그인
3. 채팅방 생성
4. 사용자 A가 메시지 전송
5. **확인 사항:**
   - [ ] 사용자 A의 메시지가 즉시 UI에 표시됨 (낙관적 업데이트)
   - [ ] 사용자 B가 2초 이내에 메시지 수신
   - [ ] 브라우저 콘솔에 `[Long Polling]` 로그 확인
   - [ ] 읽음 표시 자동 업데이트

#### 시나리오 2: 연속 메시지 송수신
1. 사용자 A가 3개 메시지 빠르게 전송
2. **확인 사항:**
   - [ ] 모든 메시지가 순서대로 도착
   - [ ] 중복 메시지 없음
   - [ ] 읽음 처리 정상 동작

#### 시나리오 3: 네트워크 재연결
1. 사용자 A가 메시지 전송 중
2. Chrome DevTools → Network → Offline 체크
3. 5초 대기
4. Offline 체크 해제
5. **확인 사항:**
   - [ ] 폴링이 자동으로 재연결됨
   - [ ] 지수 백오프 로그 확인 (1s, 2s, 4s...)
   - [ ] 재연결 후 메시지 송수신 정상

#### 시나리오 4: 백그라운드 탭 전환
1. 채팅방 열기
2. 다른 탭으로 이동 (채팅방 탭 백그라운드)
3. 5초 대기
4. 채팅방 탭으로 복귀
5. **확인 사항:**
   - [ ] 백그라운드에서 폴링 중단 확인 (선택 사항)
   - [ ] 포그라운드 복귀 시 즉시 메시지 로드

#### 시나리오 5: 긴 대기 시간
1. 채팅방 열기
2. 아무 메시지도 보내지 않고 1분 대기
3. **확인 사항:**
   - [ ] 폴링이 계속 실행 중 (콘솔 로그)
   - [ ] 타임아웃 에러 없음
   - [ ] 메모리 누수 없음 (Chrome DevTools Memory)

---

## 브라우저 콘솔 로그 확인

### 정상 로그 예시

**Long Polling 시작:**
```
[UseMessages] [Mode] Using Long Polling
[UseMessages] [Long Polling] Starting poll loop
[UseMessages] [Long Polling] Polling with lastMessageId: null
```

**새 메시지 수신:**
```
[UseMessages] [Long Polling] Received 1 new messages
[UseMessages] [Long Polling] Adding 1 new messages
[UseMessages] [Long Polling] Polling with lastMessageId: abc123...
```

**메시지 없음:**
```
[UseMessages] [Long Polling] No new messages, waiting 1s
```

**메시지 전송:**
```
[UseMessages] [Send] 📤 Sending message...
[UseMessages] [Send] Mode: Long Polling
[UseMessages] [Send] Using API endpoint
[UseMessages] [Send] ✅ Message sent successfully! ID: xyz789...
```

### 에러 로그 (정상 재연결)

**네트워크 에러 시:**
```
[UseMessages] [Long Polling] Poll error, retry in 1000ms: ...
[UseMessages] [Long Polling] Poll error, retry in 2000ms: ...
[UseMessages] [Long Polling] Poll error, retry in 4000ms: ...
```

**최대 재시도 초과:**
```
[UseMessages] [Long Polling] Poll loop ended
연결이 끊어졌습니다. 새로고침해주세요.
```

---

## API 테스트 (curl)

### 1. 메시지 폴링 테스트

```bash
# 채팅방 ID와 쿠키를 실제 값으로 변경
ROOM_ID="your-room-id"
COOKIE="your-session-cookie"

curl "http://localhost:3000/api/chat/poll?roomId=${ROOM_ID}&timeout=30000" \
  -H "Cookie: ${COOKIE}"
```

**예상 응답 (새 메시지 있음):**
```json
{
  "messages": [
    {
      "id": "msg-123",
      "room_id": "room-456",
      "sender_id": "user-789",
      "content": "안녕하세요",
      "is_read": false,
      "created_at": "2026-01-19T12:00:00Z",
      "sender": {
        "id": "user-789",
        "full_name": "홍길동",
        "avatar_url": "https://..."
      }
    }
  ],
  "hasMore": false,
  "lastMessageId": "msg-123"
}
```

**예상 응답 (새 메시지 없음, 30초 후):**
```json
{
  "messages": [],
  "hasMore": false,
  "lastMessageId": null
}
```

### 2. 메시지 전송 테스트

```bash
curl -X POST "http://localhost:3000/api/chat/messages" \
  -H "Content-Type: application/json" \
  -H "Cookie: ${COOKIE}" \
  -d '{
    "room_id": "room-456",
    "content": "테스트 메시지입니다"
  }'
```

**예상 응답:**
```json
{
  "message": {
    "id": "msg-new",
    "room_id": "room-456",
    "sender_id": "user-789",
    "content": "테스트 메시지입니다",
    "is_read": false,
    "created_at": "2026-01-19T12:01:00Z",
    "sender": {...}
  }
}
```

### 3. 읽음 처리 테스트

```bash
curl -X PATCH "http://localhost:3000/api/chat/messages/read" \
  -H "Content-Type: application/json" \
  -H "Cookie: ${COOKIE}" \
  -d '{
    "room_id": "room-456"
  }'
```

**예상 응답:**
```json
{
  "updated_count": 3
}
```

---

## 배포 단계

### Phase 5: 카나리 배포 (권장, 7일)

현재는 Feature Flag가 클라이언트 측이므로 사용자별 분할이 어렵습니다.
대신 **시간대별 배포** 권장:

#### 방법 1: 점진적 롤아웃
```bash
# Day 1-2: 로컬 테스트만
NEXT_PUBLIC_USE_LONG_POLLING="false"

# Day 3-4: Vercel Preview 배포로 내부 테스트
# (main 브랜치는 Realtime 유지)
git checkout -b long-polling-test
# .env 수정
git push origin long-polling-test
# Vercel Preview URL로 테스트

# Day 5-7: Production 배포
NEXT_PUBLIC_USE_LONG_POLLING="true"
git checkout main
# Vercel 환경변수 변경
```

#### 방법 2: Vercel 환경변수로 즉시 전환
```bash
# Vercel Dashboard > Settings > Environment Variables
# NEXT_PUBLIC_USE_LONG_POLLING=true 추가
# Redeploy 클릭
```

### Phase 6: 전체 배포 (1일)

**배포 전 체크리스트:**
- [ ] 로컬 테스트 완료
- [ ] API 엔드포인트 정상 동작 확인
- [ ] 브라우저 콘솔 에러 없음
- [ ] 메모리 누수 없음
- [ ] 빌드 성공

**배포 방법:**

1. **Vercel 환경변수 설정**
   ```bash
   # Vercel Dashboard에서 설정
   NEXT_PUBLIC_USE_LONG_POLLING=true
   ```

2. **또는 코드에서 직접 설정 (권장하지 않음)**
   ```typescript
   // lib/hooks/useMessages.ts
   const USE_LONG_POLLING = true  // 하드코딩
   ```

3. **배포**
   ```bash
   git push origin main
   # Vercel 자동 배포 대기 (2-3분)
   ```

4. **모니터링 (24시간)**
   - Vercel Analytics 확인
   - 에러율 < 2% 목표
   - API 응답 시간 < 500ms (P99)
   - 사용자 피드백 수집

### Phase 7: 레거시 코드 정리 (선택 사항)

**Long Polling 안정화 후 (1주일 후):**

1. Realtime 관련 코드 제거
2. Feature Flag 제거
3. 의존성 정리

---

## 문제 해결 (Troubleshooting)

### 문제 1: "연결이 끊어졌습니다" 에러

**원인:** 5회 이상 폴링 실패
**해결:**
1. 네트워크 연결 확인
2. API 엔드포인트 정상 동작 확인
3. Vercel 로그 확인 (서버 타임아웃?)
4. Feature Flag를 `false`로 전환 (Realtime 복귀)

### 문제 2: 메시지가 도착하지 않음

**원인:** 폴링 루프 중단
**해결:**
1. 브라우저 콘솔 확인
2. `[Long Polling] Poll loop ended` 로그 확인
3. 페이지 새로고침
4. Feature Flag 확인

### 문제 3: 중복 메시지

**원인:** 낙관적 업데이트와 폴링 수신 충돌
**해결:**
1. 코드 확인 필요 (중복 방지 로직)
2. `existingIds` Set 동작 확인

### 문제 4: API 401 Unauthorized

**원인:** 인증 쿠키 만료
**해결:**
1. 로그아웃 후 재로그인
2. Supabase 세션 확인

### 문제 5: 메모리 누수

**원인:** AbortController 정리 안 됨
**해결:**
1. 채팅방 나가기 시 폴링 중단 확인
2. `pollingRef.current.isPolling = false` 확인
3. Chrome DevTools Memory 프로파일링

---

## 롤백 계획

### 즉시 롤백 (5분)

**Vercel Dashboard에서:**
```bash
NEXT_PUBLIC_USE_LONG_POLLING=false
# Redeploy 클릭
```

**또는 Git revert:**
```bash
git revert HEAD~2  # Phase 2-3 커밋 되돌리기
git push origin main
```

### 확인 사항
- [ ] Realtime 모드로 복귀 확인
- [ ] 메시지 송수신 정상
- [ ] 에러 없음

---

## 성공 지표 (KPI)

### 기능 지표
- ✅ 메시지 전송 성공률: > 99%
- ✅ 메시지 수신 지연: < 2초 (P95)
- ✅ 읽음 처리 지연: < 1초 (P95)

### 성능 지표
- ✅ API 응답 시간: < 500ms (P99)
- ✅ 메모리 사용: < 50MB (30분 사용 후)

### 안정성 지표
- ✅ 에러율: < 2%
- ✅ 재연결 성공률: > 95%

---

## 추가 최적화 (선택 사항)

### 1. Adaptive Polling Interval

사용자 활동에 따라 폴링 간격 조절:

```typescript
const getPollingInterval = (lastActivityTime: number) => {
  const idleTime = Date.now() - lastActivityTime

  if (idleTime < 60000) return 1000      // 1분 이내: 1초
  if (idleTime < 300000) return 5000     // 5분 이내: 5초
  if (idleTime < 600000) return 15000    // 10분 이내: 15초
  return 30000                           // 10분 이상: 30초
}
```

### 2. Page Visibility API

백그라운드에서 폴링 중단:

```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      pollingRef.current.abortController?.abort()
      pollingRef.current.isPolling = false
    } else {
      pollingRef.current.isPolling = true
      startPolling()
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
}, [])
```

### 3. 데이터베이스 인덱스

성능 향상을 위한 인덱스 추가:

```sql
-- Supabase SQL Editor에서 실행
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created
ON chat_messages(room_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room_read
ON chat_messages(room_id, is_read)
WHERE is_read = false;
```

---

## 참고 자료

- 계획 문서: `/Users/seongmincho/.claude/plans/fizzy-wondering-dragon.md`
- API 엔드포인트:
  - `/app/api/chat/poll/route.ts`
  - `/app/api/chat/messages/route.ts`
  - `/app/api/chat/messages/read/route.ts`
- Hooks:
  - `/lib/hooks/useMessages.ts`
  - `/lib/hooks/useChats.ts`

---

## 지원

문제 발생 시:
1. 이 문서의 "문제 해결" 섹션 참고
2. 브라우저 콘솔 로그 확인
3. Vercel 로그 확인
4. Feature Flag로 즉시 롤백

**작성일:** 2026-01-19
**버전:** 1.0.0
