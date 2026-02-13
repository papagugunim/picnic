# Picnic Sub-Agent Team

## 목적
이 프로젝트는 역할 분리형 서브에이전트 팀으로 개발한다. 복합 요청은 먼저 `picnic-tech-lead`가 분해하고, 전문 에이전트가 구현하며, 코드리뷰 후 `picnic-quality-gate`가 최종 검증한다.

## 운영 원칙
- Codex는 작업 중 필요 시 서브에이전트를 자동 호출한다.
- 사용자가 별도 지정하지 않아도 `picnic-tech-lead`가 전체 흐름을 리드한다.
- 구현 완료 후 위험도가 있는 변경은 `picnic-code-review`를 우선 호출한다.

## 팀 구성
- `picnic-tech-lead`: 요구사항 분해, 우선순위 결정, 작업 배분, 완료 기준 정의
- `picnic-frontend-mobile`: Next.js UI/UX, 반응형, iOS 키보드/모바일 상호작용 안정화
- `picnic-supabase-rls`: Supabase 마이그레이션, RLS, 트리거, RPC, 권한/정합성
- `picnic-chat-community`: 채팅/댓글/좋아요/알림 플로우 및 상태 동기화
- `picnic-code-review`: 버그/회귀/보안/테스트 누락 중심 코드 리뷰
- `picnic-quality-gate`: 빌드/타입/회귀/릴리즈 준비도 점검

## 라우팅 규칙
- 단일 영역 작업: 해당 전문 에이전트 1개만 호출
- 다중 영역 작업: `picnic-tech-lead` 먼저 호출 후 하위 에이전트 순차/병렬 배치
- DB 스키마/RLS 변경 포함: 반드시 `picnic-supabase-rls` 포함
- 사용자 플로우/핵심 로직 변경 포함: `picnic-code-review` 후 `picnic-quality-gate` 순서로 진행

## 표준 실행 순서
1. `picnic-tech-lead`가 목표/트랙/완료조건 정의
2. 전문 에이전트가 구현
3. `picnic-code-review`가 결함/리스크 검토
4. 필요 시 교차 검토(예: chat + db)
5. `picnic-quality-gate`가 ship/no-ship 판정

## 완료 기준
- 기능 동작 + 오류 처리 + 권한 정책 일치
- `npm run build` 통과
- 변경 영향 경로(최소 1개) 수동 검증
