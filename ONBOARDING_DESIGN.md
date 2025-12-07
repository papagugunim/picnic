# 온보딩 프로세스 설계

## 목적
회원가입 후 사용자의 위치 정보를 수집하여 위치 기반 중고거래 및 커뮤니티 활성화

## 플로우

```
회원가입 성공
    ↓
이메일 인증
    ↓
온보딩 Step 1: 환영 메시지
    ↓
온보딩 Step 2: 거주 지역 설정
    ↓
온보딩 Step 3: 선호 지하철역 설정 (선택)
    ↓
온보딩 Step 4: 관심 카테고리 설정 (선택)
    ↓
메인 피드로 이동
```

---

## Step 1: 환영 메시지 ✨

**목적**: 사용자 환영 및 온보딩 진행 안내

**내용**:
- 피크닉 서비스 소개
- 온보딩 프로세스 설명
- "시작하기" 버튼

**UI**:
- 큰 환영 메시지
- 서비스 특징 3-4개 (아이콘 + 설명)
- 프로그레스 바 (1/4)

---

## Step 2: 거주 지역 설정 📍

**목적**: 사용자의 주요 활동 지역 파악

**필수 정보**:
- 도시 (Moscow / Saint Petersburg)
- 지역 (Neighborhood)

**UI**:
- 도시 선택 (큰 버튼 형식)
- 지역 선택 (Select 드롭다운)
- 프로그레스 바 (2/4)

**저장 위치**: `profiles` 테이블
- `city`: 도시
- `neighborhood`: 지역

---

## Step 3: 선호 지하철역 설정 🚇

**목적**: 거래 선호 지역 세밀하게 파악 (선택 사항)

**선택 정보**:
- 주로 이용하는 지하철역 (최대 3개)
- "이 역 근처에서 거래하고 싶어요"

**UI**:
- 검색 가능한 지하철역 리스트
- 선택된 역 표시 (태그 형식)
- "건너뛰기" 버튼
- 프로그레스 바 (3/4)

**저장 위치**: `profiles` 테이블에 새 컬럼 추가
- `preferred_metro_stations`: TEXT[] (지하철역 배열)

---

## Step 4: 관심 카테고리 설정 🏷️

**목적**: 개인화된 피드 제공 (선택 사항)

**선택 정보**:
- 관심 있는 카테고리 (복수 선택 가능)
  - 전자제품
  - 가구/인테리어
  - 의류/잡화
  - 도서
  - 스포츠/레저
  - 뷰티/미용
  - 유아동
  - 식품
  - 기타

**UI**:
- 카테고리 그리드 (아이콘 + 라벨)
- 클릭으로 토글
- "건너뛰기" 버튼
- 프로그레스 바 (4/4)

**저장 위치**: `profiles` 테이블에 새 컬럼 추가
- `preferred_categories`: TEXT[] (카테고리 배열)

---

## Step 5: 완료 🎉

**목적**: 온보딩 완료 확인 및 메인 서비스로 안내

**내용**:
- "모든 설정이 완료되었습니다!"
- "피크닉 시작하기" 버튼 → `/feed`로 이동

**UI**:
- 성공 메시지
- 설정 요약 (도시, 지역, 선택한 지하철역 등)
- 큰 CTA 버튼

---

## 데이터베이스 스키마 수정

### profiles 테이블에 추가할 컬럼

```sql
-- 선호 지하철역 (최대 3개)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferred_metro_stations TEXT[] DEFAULT '{}';

-- 관심 카테고리
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferred_categories TEXT[] DEFAULT '{}';

-- 온보딩 완료 여부
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
```

---

## 라우팅 설정

### 온보딩 페이지 경로
- `/onboarding/step/1` - 환영 메시지
- `/onboarding/step/2` - 거주 지역
- `/onboarding/step/3` - 선호 지하철역
- `/onboarding/step/4` - 관심 카테고리
- `/onboarding/complete` - 완료

### 리다이렉트 로직 (proxy.ts)

```typescript
// 인증된 사용자인데 온보딩이 완료되지 않았으면
if (user && !user.user_metadata.onboarding_completed) {
  // 온보딩 페이지가 아니면 온보딩으로 리다이렉트
  if (!request.nextUrl.pathname.startsWith('/onboarding')) {
    return NextResponse.redirect('/onboarding/step/1')
  }
}
```

---

## UX 고려사항

1. **프로그레스 바**: 각 단계마다 진행 상황 표시
2. **건너뛰기**: Step 3, 4는 선택 사항이므로 건너뛰기 가능
3. **뒤로 가기**: 이전 단계로 돌아가기 가능
4. **자동 저장**: 각 단계 완료 시 자동 저장
5. **모바일 친화적**: 큰 터치 영역, 간결한 UI

---

## 다음 구현 단계

1. ✅ 온보딩 프로세스 설계 완료
2. ⏳ DB 마이그레이션 (컬럼 추가)
3. ⏳ 온보딩 페이지 컴포넌트 개발
4. ⏳ proxy.ts에 리다이렉트 로직 추가
5. ⏳ 테스트 및 버그 수정

---

**작성일**: 2025-12-07
**작성자**: Claude Code
