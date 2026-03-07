# Picnic 성능 모니터링 플레이북

## 목적
- 배포 이후 성능을 **감**이 아니라 **데이터**로 관리
- 느려진 경로를 빠르게 탐지하고 우선순위에 반영

---

## 수집 이벤트

### 1) web_vital
- source: `components/analytics/PerformanceTracker.tsx`
- 핵심 속성
  - `name` (LCP, INP, CLS, FCP, TTFB)
  - `value`
  - `rating`
  - `pathname`
  - `navigationType`

### 2) route_transition
- source: `components/analytics/PerformanceTracker.tsx`
- 핵심 속성
  - `from`
  - `to`
  - `routeChangeMs`
  - `previousPath`

---

## 대시보드 구성 (PostHog)

### A. Route Transition p50/p95
- Event: `route_transition`
- Metric: `routeChangeMs`
- Breakdown: `to`
- Window: 24h, 7d

### B. LCP p50/p75/p95
- Event: `web_vital`
- Filter: `name = LCP`
- Metric: `value`

### C. INP p50/p75/p95
- Event: `web_vital`
- Filter: `name = INP`
- Metric: `value`

### D. CLS p75/avg
- Event: `web_vital`
- Filter: `name = CLS`
- Metric: `value`

### E. 페이지별 Vital 비교
- Event: `web_vital`
- Breakdown: `pathname`
- Filter: `name in (LCP, INP, CLS)`

---

## 성능 목표 (초기 기준)

### Route Transition
- p50 < 400ms
- p95 < 1200ms

### Core Web Vitals
- LCP p75 < 2.5s
- INP p75 < 200ms
- CLS p75 < 0.1

---

## 배포 후 체크리스트

## D+0 (배포 직후 30분)
- [ ] 이벤트 유입 확인 (`web_vital`, `route_transition`)
- [ ] 로그인/피드/채팅/오늘 페이지 최소 1회 수동 테스트
- [ ] 에러율 급증 여부 확인

## D+1 (24시간)
- [ ] Route transition p95 상위 3개 경로 추출
- [ ] LCP/INP/CLS 기준 초과 페이지 식별
- [ ] 전일 대비 악화 지표 있는지 확인

## D+7 (주간)
- [ ] 주간 평균/분위수 리포트 작성
- [ ] 개선 후보 P0/P1/P2 분류
- [ ] 다음 스프린트 성능 태스크 확정

---

## 트러블슈팅 가이드

### routeChangeMs 급증
1. 링크 prefetch 정책 확인
2. 대형 컴포넌트 번들 분할 여부 점검
3. 라우트 진입 시 불필요한 동시 fetch 확인

### LCP 악화
1. 히어로/썸네일 이미지 최적화 확인
2. Above-the-fold 컴포넌트 지연 로딩 여부 확인
3. 렌더 블로킹 스크립트/스타일 점검

### INP 악화
1. 클릭 핸들러 내 무거운 동기 작업 제거
2. 리스트 렌더량/메모이제이션 점검
3. 스크롤/리사이즈 이벤트 디바운스/RAF 확인

---

## 보고 포맷 (주간)

- 기간: YYYY-MM-DD ~ YYYY-MM-DD
- 배포 버전(커밋):
- 핵심 지표
  - Route transition p50/p95:
  - LCP p75:
  - INP p75:
  - CLS p75:
- 이슈 Top 3:
- 원인 가설:
- 다음 액션(P0/P1):

---

## 운영 원칙
- 성능 지표는 기능 우선순위와 동일한 레벨로 관리
- 기준 초과 지표는 다음 스프린트에 최소 1개 이상 반영
- 변경은 항상 전/후 지표 비교와 함께 기록
