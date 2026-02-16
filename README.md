# Picnic Today RU Live News

러시아 현지 뉴스를 3시간마다 자동 수집해 한국어로 번역해 보여주는 서비스입니다.

## 핵심 기능
- FastAPI + Jinja2 기반 Today 페이지
- **3시간 주기 자동 업데이트 (하루 8회)**
- 러시아 뉴스 RSS 중심 수집 (기본)
- 사회 / 경제 / 문화 / 날씨 중심 분류
- 정치성 키워드 제외 필터
- 모스크바 연관도 기반 우선 노출
- DeepL 기반 한국어 자동 번역
- SQLite 저장 + 배치 노출

## 데이터 소스
- RSS: RIA, Interfax, The Moscow Times RU, TASS
- 날씨 RSS: Гидрометцентр, Google News Weather(Moscow/Russia)
- Telegram: `ENABLE_TELEGRAM_SOURCE=1` 일 때만 수집
- VC.RU RSS: `ENABLE_VC_SOURCE=1` 일 때만 보조 소스로 수집

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
- `DEEPL_TIMEOUT` (기본: `4`)
- `DEEPL_RETRIES` (기본: `1`)
- `GOOGLE_TRANSLATE_FALLBACK` (기본: `1`, DeepL 실패 시 구글 공개 번역 엔드포인트 폴백)
- `GOOGLE_TRANSLATE_TIMEOUT` (기본: `4`)
- `FETCH_INTERVAL_HOURS` (기본: `3`)
- `NEWS_BATCH_SIZE` (기본: `24`)
- `NEWS_FETCH_TIMEOUT` (기본: `2`)
- `FAST_FETCH_TIMEOUT` (기본: `1.5`, 워밍업 시 빠른 소스 요청 타임아웃)
- `RSS_ENTRY_LIMIT` (기본: `12`)
- `TELEGRAM_ENTRY_LIMIT` (기본: `12`)
- `INLINE_TRANSLATION_LIMIT` (기본: `40`, 수집 시 인라인 번역 최대 호출 수)
- `ENABLE_TELEGRAM_SOURCE` (기본: `0`, Telegram 소스 포함 여부)
- `ENABLE_VC_SOURCE` (기본: `0`, VC.RU 보조 소스 포함 여부)
- `VC_ENTRY_LIMIT` (기본: `8`, vc.ru 소스에서 회차당 최대 수집 건수)
- `FEED_VC_RU` (기본: `https://vc.ru/rss`)
- `FEED_RIA`
- `FEED_INTERFAX`
- `FEED_MOSCOWTIMES`
- `FEED_TASS`
- `FEED_HYDROMET_WEATHER`
- `FEED_GOOGLE_WEATHER_MOSCOW`
- `FEED_GOOGLE_WEATHER_RUSSIA`
- `TG_CHANNEL_MOSGURU`
- `TG_CHANNEL_MOSCOWACH`

## VC.RU 수집 정책
- 기본 비활성(`ENABLE_VC_SOURCE=0`)이며, 켜도 **보조 소스**로만 동작합니다.
- 개인 블로그 경로(`/id...`)와 일부 노이즈 경로(예: crypto/invest/politics 계열)는 제외합니다.
- 모스크바 연관도가 낮은 항목은 경제/날씨 주제일 때만 제한적으로 통과시킵니다.

## API
- `GET /api/today-news` : 투데이 뉴스 피드
- `GET /api/archive` : 지난 뉴스 아카이브(무한 스크롤용)
- `POST /api/refresh` : 즉시 수집 트리거
- `GET /api/search?q=...` : 누적 검색
- `GET /api/health` : 상태 확인

## 데이터 보관
- 모든 수집 뉴스는 `items` 테이블에 누적 저장되며 `/search`와 `/api/archive`에서 조회됩니다.
- Vercel Serverless 기본 경로는 휘발성(`/tmp`)이므로 배포 간 장기 보관이 필요하면 외부 영구 DB를 연결해야 합니다.
- `NEWS_DB_PATH` 환경변수로 영구 저장 경로를 지정할 수 있습니다.
