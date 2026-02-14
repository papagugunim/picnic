# 유료 서비스 도입 가이드 (성능/운영)

- 작성일: 2026-02-14
- 목적: 사용자 증가 시 웹 서비스 속도/안정성을 비용 효율적으로 확장하기 위한 기준 문서

## 1) 도입 우선순위

1. Supabase Pro
2. Vercel Pro
3. Upstash Redis (Pay-as-you-go)

## 2) 서비스별 요약

### Supabase Pro (1순위)
- 기대 효과:
  - DB/Realtime 여유 리소스 증가
  - 트래픽 증가 시 응답 안정성 개선
- 추천 시점:
  - API 응답 지연, DB connection/Realtime 제한이 자주 보일 때
  - 피크 시간대에 댓글/좋아요/채팅 지연이 체감될 때
- 참고 비용:
  - Pro 기본 $25/월 + 사용량 기반 과금

### Vercel Pro (2순위)
- 기대 효과:
  - 배포/빌드/런타임 운영 안정성 향상
  - 프로덕션 운영 편의성 강화
- 추천 시점:
  - 팀 협업 규모 증가, 배포 빈도 증가
  - 빌드 대기/운영 관리 이슈가 반복될 때
- 참고 비용:
  - Pro 기본 $20/월 + 사용량 기반 과금

### Upstash Redis (3순위)
- 기대 효과:
  - 피드/동네생활 목록 캐시로 DB 왕복 감소
  - 트래픽 증가 시 응답속도 방어
- 추천 시점:
  - 동일 데이터 반복 조회가 많아질 때
  - 읽기 트래픽이 쓰기 트래픽보다 훨씬 클 때
- 참고 비용:
  - Pay-as-you-go (요청/저장량 기반)

## 3) 사용자 증가 기준 도입 트리거 (실무용)

- Supabase Pro 전환:
  - DB/Realtime 한도 경고가 월 2회 이상
  - 피크 시간 API p95가 800ms 이상으로 반복
- Vercel Pro 전환:
  - 배포 실패/대기 이슈가 릴리즈 품질에 영향
  - 팀 협업에서 배포 권한/관측 필요성 증가
- Redis 도입:
  - 피드/커뮤니티 목록 조회 비중이 전체 요청의 과반
  - 동일 쿼리 반복 호출로 DB 비용/지연이 증가

## 4) 도입 순서 권장안

1. Supabase Pro 전환 후 1~2주 관측
2. 개선 폭이 부족하면 Redis 캐시 계층 추가
3. 배포/운영 병목이 있으면 Vercel Pro 전환

## 5) 운영 체크리스트

- 전환 전:
  - 현재 p50/p95 응답시간과 에러율 캡처
  - 페이지별 LCP/TTFB 측정값 저장
- 전환 후:
  - 동일 지표 재측정 (최소 1주)
  - 비용 대비 성능 개선폭(%) 기록

## 6) 참고 링크

- Vercel Pricing: https://vercel.com/pricing
- Vercel Limits: https://vercel.com/docs/limits
- Supabase Billing FAQ: https://supabase.com/docs/guides/platform/billing-faq
- Supabase Realtime Usage: https://supabase.com/docs/guides/platform/manage-your-usage/realtime-peak-connections
- Upstash Redis Pricing: https://upstash.com/docs/redis/overall/pricing

