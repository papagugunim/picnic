# 알림 이메일 설정

## 1) 필요한 환경변수

- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `NOTIFICATION_EMAIL_FROM`
- `CRON_SECRET`
- `NEXT_PUBLIC_SITE_URL` (예: `https://picnic-wheat.vercel.app`)

## 2) Vercel Cron

`vercel.json`에 `/api/cron/notification-emails` 경로가 2분 주기로 등록되어 있습니다.

## 3) 동작 흐름

1. 앱/DB 트리거가 `notifications` 레코드를 생성
2. `trigger_enqueue_notification_email`가 `notification_email_queue`에 적재
3. Vercel Cron이 `/api/cron/notification-emails` 호출
4. API가 Resend로 이메일 발송 후 큐 상태를 `sent`/`failed`로 갱신

## 4) 신고 알림

- `reports` INSERT 시 `trigger_notify_report_target_owner`가 실행되어
  - 중고거래 게시글(`post`)
  - 동네생활 게시글(`community_post`)
  - 동네생활 댓글(`comment`)
  작성자에게 `content_reported` 타입 알림을 생성합니다.
