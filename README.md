# 🧺 picnic (피크닉)

러시아 거주 한인을 위한 중고거래 및 커뮤니티 플랫폼

## 📋 프로젝트 개요

picnic은 러시아 Moscow와 Saint Petersburg 지역에 거주하는 한인들을 위한 특화된 중고거래 및 커뮤니티 서비스입니다. Apple의 "Liquid Glass" 디자인 언어를 적용하여 세련되고 직관적인 사용자 경험을 제공합니다.

## 🎯 주요 기능

- **중고거래**: 물품 등록, 검색, 거래
- **실시간 채팅**: 1:1 채팅을 통한 거래 협의
- **커뮤니티 게시판**: 정보 공유 및 소통 공간
- **사용자 리뷰**: 거래 후 평가 시스템
- **지역 기반 필터링**: Moscow, Saint Petersburg 및 세부 지역별 검색
- **지도 통합**: Yandex Maps를 통한 위치 기반 서비스

## 🛠 기술 스택

### Frontend
- **Next.js 15**: React 프레임워크 (App Router)
- **TypeScript**: 타입 안전성
- **Tailwind CSS v4**: 유틸리티 기반 스타일링
- **shadcn/ui**: 재사용 가능한 컴포넌트 라이브러리
- **Framer Motion**: 애니메이션
- **next-themes**: 다크모드 지원

### Backend & Database
- **Supabase**:
  - PostgreSQL 데이터베이스
  - 인증 시스템
  - 실시간 구독
  - 파일 스토리지
  - Row Level Security (RLS)

### Forms & Validation
- **react-hook-form**: 폼 상태 관리
- **zod**: 스키마 검증

### UI Libraries
- **Lucide React**: 아이콘
- **date-fns**: 날짜 포맷팅
- **react-dropzone**: 파일 업로드
- **sonner**: 토스트 알림

## 🚀 시작하기

### 사전 요구사항

- Node.js 18 이상
- npm 또는 yarn
- Supabase 계정

### 설치

1. 저장소 클론 및 의존성 설치:

```bash
npm install
```

2. 환경 변수 설정:

`.env.local.example` 파일을 `.env.local`로 복사하고 값을 입력합니다:

```bash
cp .env.local.example .env.local
```

필요한 환경 변수:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=your-yandex-maps-api-key
```

3. 개발 서버 실행:

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인할 수 있습니다.

### Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. SQL 에디터에서 데이터베이스 스키마 실행 (`picnic_project_design.txt` 파일의 스키마 참고)
3. Authentication 설정에서 이메일 인증 활성화
4. Storage에서 `post-images`, `avatars` 버킷 생성

## 📁 프로젝트 구조

```
picnic/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 인증 라우트 그룹
│   │   ├── login/
│   │   └── signup/
│   ├── (main)/            # 메인 앱 라우트 그룹
│   │   ├── feed/          # 피드 페이지
│   │   ├── post/          # 게시글 상세/작성
│   │   ├── community/     # 커뮤니티 게시판
│   │   ├── profile/       # 사용자 프로필
│   │   └── settings/      # 설정
│   ├── api/               # API 라우트
│   ├── globals.css        # 전역 스타일
│   └── layout.tsx         # 루트 레이아웃
├── components/            # React 컴포넌트
│   ├── ui/               # shadcn/ui 컴포넌트
│   ├── layout/           # 레이아웃 컴포넌트
│   ├── post/             # 게시글 관련 컴포넌트
│   ├── chat/             # 채팅 컴포넌트
│   ├── location/         # 위치 관련 컴포넌트
│   └── auth/             # 인증 컴포넌트
├── lib/                   # 유틸리티 및 설정
│   ├── supabase/         # Supabase 클라이언트
│   ├── hooks/            # 커스텀 훅
│   ├── utils.ts          # 유틸리티 함수
│   └── constants.ts      # 상수 정의
├── types/                 # TypeScript 타입 정의
└── public/               # 정적 파일
```

## 🎨 디자인 시스템

### Liquid Glass 효과

프로젝트는 Apple의 Liquid Glass 디자인 언어를 구현합니다:

- `.glass`: 기본 유리 효과
- `.glass-strong`: 강한 유리 효과
- `.gradient-text`: 그라데이션 텍스트

### 테마

- 라이트/다크 모드 지원
- 시스템 설정 자동 감지
- 사용자 설정 저장

## 🗺 지원 지역

- **Moscow** (모스크바): 8개 주요 지역
- **Saint Petersburg** (상트페테르부르크): 5개 주요 지역

## 📦 데이터베이스 스키마

주요 테이블:
- `profiles`: 사용자 프로필
- `posts`: 중고거래 게시글
- `chats`: 채팅방
- `messages`: 채팅 메시지
- `reviews`: 사용자 리뷰
- `board_posts`: 커뮤니티 게시글
- `likes`: 좋아요
- `notifications`: 알림

자세한 스키마는 `picnic_project_design.txt` 파일을 참고하세요.

## 🔒 보안

- Row Level Security (RLS)를 통한 데이터 접근 제어
- 서버/클라이언트 분리된 Supabase 클라이언트
- 인증 미들웨어를 통한 라우트 보호
- 이미지 업로드 검증 및 제한

## 📱 반응형 디자인

- 모바일 우선 디자인
- 태블릿 및 데스크톱 최적화
- PWA 지원 예정

## 🚦 개발 로드맵

- [x] **Week 1**: 프로젝트 설정 및 Boilerplate
- [ ] **Week 2**: 인증 시스템 구현
- [ ] **Week 3**: 게시글 CRUD 및 피드
- [ ] **Week 4**: 게시글 상세 및 실시간 채팅
- [ ] **Week 5**: 프로필 및 리뷰 시스템
- [ ] **Week 6**: 커뮤니티 게시판 및 지도 통합
- [ ] **Week 7**: 테스트 및 배포

## 🧪 테스트

```bash
npm run test
```

## 🏗 빌드

```bash
npm run build
```

## 📄 라이선스

이 프로젝트는 비공개 프로젝트입니다.

## 👥 개발팀

- 개발: picnic team

---

**Made with ❤️ for Korean community in Russia**
