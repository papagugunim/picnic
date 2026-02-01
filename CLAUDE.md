# 🧺 Picnic 프로젝트 컨텍스트

## 프로젝트 개요
러시아 거주 한인을 위한 중고거래 및 커뮤니티 플랫폼

## 기술 스택
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage

## 디렉토리 구조
```
app/
├── (auth)/         # 인증 (로그인, 회원가입)
├── (main)/         # 메인 앱
│   ├── feed/       # 중고거래 피드
│   ├── post/       # 게시글 상세/작성
│   ├── community/  # 동네생활
│   ├── chat/       # 채팅
│   ├── profile/    # 프로필
│   └── settings/   # 설정
└── api/            # API 라우트

components/
├── ui/             # shadcn/ui 컴포넌트
├── layout/         # Header, BottomNav 등
├── post/           # 게시글 컴포넌트
├── chat/           # 채팅 컴포넌트
└── community/      # 커뮤니티 컴포넌트

lib/
├── supabase/       # Supabase 클라이언트
├── hooks/          # 커스텀 훅
├── utils.ts        # 유틸리티
└── constants.ts    # 상수
```

## 주요 파일
- `middleware.ts` - 인증 미들웨어
- `lib/supabase/client.ts` - 클라이언트 Supabase
- `lib/supabase/server.ts` - 서버 Supabase
- `types/database.ts` - Supabase 타입

## 커스텀 슬래시 커맨드
- `/review [파일]` - 코드 리뷰
- `/fix-ts` - TypeScript 에러 수정
- `/optimize [컴포넌트]` - 성능 최적화
- `/db [요청]` - 데이터베이스 작업
- `/component [설명]` - 컴포넌트 생성
- `/api [설명]` - API 라우트 생성
- `/ui [설명]` - UI/UX 디자인
- `/deploy` - 배포 체크

## 코딩 컨벤션
- TypeScript strict mode
- 함수형 컴포넌트 + hooks
- Server Component 우선
- 'use client' 최소화
- cn() 유틸리티로 클래스 병합

## Supabase 테이블
- `profiles` - 사용자 프로필
- `posts` - 중고거래 게시글
- `board_posts` - 커뮤니티 게시글
- `comments` - 댓글
- `likes` - 좋아요
- `chats` / `messages` - 채팅
- `notifications` - 알림

## 환경 변수
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_YANDEX_MAPS_API_KEY
```

## 배포
- Vercel (자동 배포)
- main 브랜치 push 시 배포
