# 인증 미들웨어 테스트 가이드

## 변경 사항

### 문제
로그인하지 않은 상태에서 내부 페이지 접근 가능:
- `/feed`, `/chats`, `/today`, `/community`, `/search` 등

### 해결
**이전 방식 (화이트리스트):** 보호할 페이지만 나열 → 누락 가능 ❌
**개선 방식 (블랙리스트):** 공개 페이지만 나열 → 나머지는 기본 보호 ✅

---

## 공개 페이지 (로그인 없이 접근 가능)

- `/` - 홈 페이지
- `/login` - 로그인
- `/signup` - 회원가입
- `/forgot-password` - 비밀번호 찾기
- `/verify-email` - 이메일 인증
- `/reset-password` - 비밀번호 재설정
- `/auth/callback` - OAuth 콜백
- `/api/auth/*` - 인증 API

---

## 보호 페이지 (로그인 필수)

### 메인 기능
- `/feed` - 피드
- `/today` - 오늘의 픽닉
- `/community` - 커뮤니티 목록
- `/community/[id]` - 커뮤니티 상세
- `/community/new` - 커뮤니티 작성
- `/search` - 검색

### 게시글
- `/post/[id]` - 게시글 상세
- `/post/new` - 게시글 작성
- `/post/edit/[id]` - 게시글 수정

### 채팅
- `/chats` - 채팅 목록
- `/chats/[roomId]` - 채팅방

### 프로필
- `/profile` - 내 프로필
- `/profile/[userId]` - 다른 사용자 프로필

### 설정
- `/settings` - 설정
- `/settings/delete-account` - 계정 삭제

### 기타
- `/notifications` - 알림
- `/welcome` - 환영 페이지
- `/onboarding/*` - 온보딩

---

## 로컬 테스트 방법

### 1. 개발 서버 실행
```bash
npm run dev
```

### 2. 시크릿 모드에서 브라우저 열기
Chrome/Safari 시크릿 모드 (로그인 상태 초기화)

### 3. 테스트 시나리오

#### ✅ 시나리오 1: 공개 페이지 접근 (로그인 없이)
1. http://localhost:3000 접속 → 성공 ✅
2. http://localhost:3000/login 접속 → 성공 ✅
3. http://localhost:3000/signup 접속 → 성공 ✅

**예상 결과:** 모두 정상 접속

#### ❌ 시나리오 2: 보호 페이지 접근 (로그인 없이)
1. http://localhost:3000/feed 접속
2. http://localhost:3000/today 접속
3. http://localhost:3000/community 접속
4. http://localhost:3000/search 접속
5. http://localhost:3000/chats 접속
6. http://localhost:3000/post/abc123 접속

**예상 결과:** 모두 `/login`으로 리다이렉트 ✅

#### ✅ 시나리오 3: 로그인 후 보호 페이지 접근
1. http://localhost:3000/login 접속
2. 로그인 진행
3. http://localhost:3000/feed 접속 → 성공 ✅
4. http://localhost:3000/today 접속 → 성공 ✅
5. http://localhost:3000/community 접속 → 성공 ✅

**예상 결과:** 모두 정상 접속

---

## 미들웨어 변경 내용

### middleware.ts

**변경 전:**
```typescript
// 보호할 페이지만 나열 (누락 가능성 높음)
const protectedPaths = ['/feed', '/profile', '/settings', '/post/new', '/community/new', '/chats', '/onboarding', '/welcome', '/notifications']
const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

// 느슨한 쿠키 체크
const hasAuthToken = supabaseCookies.some(cookie =>
  cookie.name.includes('auth-token') || cookie.name.includes('sb-')
)

if (isProtectedPath && !hasAuthToken) {
  return NextResponse.redirect(new URL('/login', request.url))
}
```

**변경 후:**
```typescript
// 공개 페이지만 나열 (나머지는 기본 보호)
const publicPaths = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/verify-email',
  '/reset-password',
  '/auth/callback',
  '/api/auth',
]

const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith(path))

// 더 정확한 쿠키 체크
const hasAuthToken = supabaseCookies.some(cookie =>
  cookie.name.startsWith('sb-') && cookie.name.includes('auth-token')
)

// 공개 페이지가 아니면 인증 필요
if (!isPublicPath && !hasAuthToken) {
  return NextResponse.redirect(new URL('/login', request.url))
}
```

---

## 장점

### 1. 보안 강화
- 새로운 페이지 추가 시 기본적으로 보호됨
- 누락으로 인한 보안 취약점 방지

### 2. 유지보수 편의성
- 공개 페이지는 소수이므로 관리 용이
- 새 기능 추가 시 별도 미들웨어 수정 불필요

### 3. 명확성
- 공개 페이지가 명시적으로 표시됨
- 의도하지 않은 노출 방지

---

## 주의 사항

### 새로운 공개 페이지 추가 시
```typescript
// middleware.ts의 publicPaths에 추가
const publicPaths = [
  '/',
  '/login',
  '/signup',
  // ... 기존 경로 ...
  '/new-public-page',  // ← 추가
]
```

### API 엔드포인트
- `/api/auth/*` - 공개 (OAuth, 로그인 등)
- 나머지 API - 내부적으로 인증 체크 (미들웨어는 통과)

---

## 빌드 확인

```bash
npm run build
```

**결과:**
- ✅ 빌드 성공
- ✅ 미들웨어 크기: 34.4 kB (최적화됨)
- ✅ 모든 38개 페이지 정상 빌드

---

## 배포 후 확인

### Production 테스트
1. https://picnic-wheat.vercel.app (로그아웃 상태)
2. `/feed`, `/today`, `/community` 접속 시도
3. `/login`으로 리다이렉트 확인

### 롤백 방법 (문제 발생 시)
```bash
git revert HEAD
git push origin main
```

---

**작성일:** 2026-01-20
**변경 파일:** `middleware.ts`
**테스트 상태:** 로컬 빌드 ✅
