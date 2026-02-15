# Picnic Today RU Live News

러시아 현지 뉴스를 3시간마다 자동 수집해 한국어로 번역해 보여주는 서비스입니다.

## 핵심 기능
- FastAPI + Jinja2 기반 Today 페이지
- **3시간 주기 자동 업데이트 (하루 8회)**
- 러시아 뉴스 RSS + 텔레그램 채널 병행 수집
- 사회 / 경제 / 문화 중심 분류
- 정치성 키워드 제외 필터
- 모스크바 연관도 기반 우선 노출
- DeepL 기반 한국어 자동 번역
- SQLite 저장 + 배치 노출

## 데이터 소스
- RSS: RIA, Interfax, The Moscow Times RU, TASS
- Telegram: `@mosguru`, `@moscowach`

## 실행
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 환경 변수
- `DEEPL_API_KEY` (권장)
- `DEEPL_API_URL` (기본: `https://api-free.deepl.com/v2/translate`)
- `FETCH_INTERVAL_HOURS` (기본: `3`)
- `NEWS_BATCH_SIZE` (기본: `24`)
- `NEWS_FETCH_TIMEOUT` (기본: `12`)
- `RSS_ENTRY_LIMIT` (기본: `80`)
- `TELEGRAM_ENTRY_LIMIT` (기본: `40`)
- `FEED_RIA`
- `FEED_INTERFAX`
- `FEED_MOSCOWTIMES`
- `FEED_TASS`
- `TG_CHANNEL_MOSGURU`
- `TG_CHANNEL_MOSCOWACH`

## API
- `GET /api/today-news` : 투데이 뉴스 피드
- `POST /api/refresh` : 즉시 수집 트리거
- `GET /api/search?q=...` : 누적 검색
- `GET /api/health` : 상태 확인
