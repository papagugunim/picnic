# Supabase Auth 성능 마이그레이션 플레이북

## 목적
인증/유저 조회 지연을 줄이기 위해 기존 `getUser()` 중심 경로를 `getClaims()` 우선 경로로 전환한다.

> 원칙: **코드 전환 + JWT signing key 마이그레이션 + 운영 키 반영**이 함께 이뤄져야 효과가 난다.

---

## Picnic 적용 상태 (현재)
- [x] `middleware.ts` 인증 체크를 `getClaims` 우선 경로로 전환 (fallback: getUser)
- [x] 주요 SSR 경로(`app/page.tsx`, `feed/page.tsx`, `community/page.tsx`)에 fast auth 헬퍼 적용
- [x] 공통 헬퍼 추가: `lib/supabase/auth-performance.ts`

---

## 콘솔/키 마이그레이션 작업 (운영)

### 1) Supabase JWT key 마이그레이션 시작
- Supabase Console → Project Settings → JWT(JWT keys)
- legacy secret 상태 확인
- signing key migration 단계 진행

### 2) 신규 API 키 반영
- Vercel env (Production/Preview/Development)
- GitHub Actions env
- 로컬 `.env.local`

핵심 변수:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (또는 publishable 키)
- `SUPABASE_SERVICE_ROLE_KEY`

### 3) legacy disable은 마지막
모든 런타임 전환 완료 + 모니터링 안정화 이후에만 비활성화.

### 4) signing key rotate
- standby/current 상태 확인 후 rotate
- 전환 직후 로그인/세션 갱신/API 인증 정상 여부 점검

---

## 검증 체크리스트

### 기능
- [ ] 신규 로그인 (이메일/소셜)
- [ ] 기존 세션 유지
- [ ] 로그아웃 후 재로그인
- [ ] 만료 토큰 리프레시
- [ ] 역할별 접근 제어(RLS)

### 성능
- [ ] SSR 경로 TTFB (`/feed`, `/community`, `/today`)
- [ ] 인증 관련 API p95/p99
- [ ] 401/403 비율
- [ ] 로그인 성공률

### 안정성
- [ ] 모바일/웹 동시 사용 시 세션 일관성
- [ ] 배포 후 24시간 에러 모니터링

---

## 롤백 계획
- [ ] legacy key 재활성화 경로 사전 확인
- [ ] 구버전 env 값 백업
- [ ] 배포 롤백 절차 문서화

---

## 주의사항
- 키만 바꿔서는 속도 개선이 제한적임
- 프로젝트를 공유하는 외부 서비스가 있다면 마지막 서비스 전환까지 legacy 유지
- 배포 직후 일부 사용자에서 토큰 캐시 영향으로 간헐 오류 가능 (24h 관찰 필수)
