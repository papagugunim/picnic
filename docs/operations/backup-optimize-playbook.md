# Backup + Optimize Playbook (Picnic)

요청 문구: "백업하고 최적화해줘"를 받으면 아래 순서로 고정 실행.

1. 백업 생성
- `backups/picnic-backup-YYYYMMDD-HHMMSS.bundle` (git 전체 이력)
- `backups/picnic-source-YYYYMMDD-HHMMSS.tar.gz` (현재 HEAD 소스 스냅샷)

2. 품질 게이트
- `npm run lint`
- `npm run build`

3. 릴리즈 점검
- (DB 변경 시) `supabase db push`
- `vercel --prod --yes`
- `https://mypicnic.vercel.app` 헬스체크(HTTP 200)

4. 보고
- 변경 파일/핵심 개선점
- 검증 결과(pass/fail)
- 커밋 SHA + 배포 URL
