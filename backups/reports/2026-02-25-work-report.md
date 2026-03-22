# Picnic 작업 보고서 (2026-02-25)

## 1) 작업 범위 요약
- 아이콘/파비콘 디자인 변경 및 롤백-재적용 흐름 정리
- 밀크 포인트 안내 문구 최신 정책 반영
- imagegen 스킬 프로젝트 연동(래퍼, env 로딩, 실행 스크립트)
- 밀크 포인트 자동 지급 크론(관리자/개발자) 추가
- 개발자 밀크 부스트 무제한 적용
- 동네생활 UI 정리(밀크 포인트 문구 제거, 카테고리 이모지 단독 표기)

## 2) 오늘 반영된 주요 커밋
- 36d95ba ui: simplify milk boost badge on feed cards
- 1aed829 ui: simplify community milk boost visuals
- c143664 ui: remove feed milk boost visual noise
- 7731654 feat: add milk point info modal on profile
- 44108c6 design: replace favicon set with picnic basket icon
- 0b59756 Revert "design: replace favicon set with picnic basket icon"
- 4a9abe3 design: simplify app icon to toast shape
- f457b40 design: restyle favicon set with minimal bread illustration
- c8dce0c copy: update milk point guide with revised earning and usage rules
- dbbfc3b chore: wire imagegen wrapper and env loading for picnic assets
- c5d1139 feat: schedule daily milk role bonus via cron at 09:00 MSK
- 4549c45 feat: make developer milk boosts unlimited
- f3a518e ui: simplify community header milk badge and category label

## 3) 핵심 결과
### A. 아이콘/브랜딩
- 최종 아이콘은 식빵/빵 일러스트 방향으로 적용 완료.
- `mypicnic.vercel.app`까지 alias 반영 완료.

### B. 밀크 포인트 정책/시스템
- 안내 문구를 최신 규칙으로 반영.
- 매일 오전 9시(MSK) 자동 지급 추가:
  - developer: +500
  - admin: +100
- 개발자 등급은 밀크 부스트 사용 시 포인트 차감 없이 무제한 사용 가능.

### C. imagegen 연동
- `scripts/image_gen.py` 래퍼 추가
- `OPENAI_API_KEY` 로딩 우선순위 구성:
  1) 프로세스 env
  2) `.env.imagegen`
  3) `.env.local`
  4) `.env`
- `package.json` 실행 스크립트 추가:
  - `npm run imagegen`
  - `npm run imagegen:test`

### D. 동네생활 UI 정리
- 상단의 남은 밀크 포인트 노출 제거
- 닉네임 옆 카테고리는 이모지만 노출

## 4) 배포 상태
- 최신 기준: `origin/main` = `f3a518e`
- 운영 별칭: `https://mypicnic.vercel.app`

## 5) 리스크/메모
- 로컬 작업트리에 미커밋 실험 변경(부스트 구간/리본 시안) 및 미추적 파일이 남아 있어,
  배포/백업은 분리 워크트리에서 진행함.
- imagegen 실생성은 `OPENAI_API_KEY` 설정이 있어야 수행 가능.
