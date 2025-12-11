-- Create sample community post: Moscow Metro Guide
-- This is a helpful guide for new residents about using Moscow Metro

INSERT INTO community_posts (user_id, title, content, category, created_at)
SELECT
  id as user_id,
  '모스크바 지하철 타는 방법 완벽 가이드 🚇' as title,
  '안녕하세요! 모스크바에 처음 오신 분들을 위해 지하철 이용 방법을 정리해봤습니다.

📍 **트로이카 카드 구매**
- 지하철역 창구에서 "트로이카" 카드를 구매하세요
- 카드 보증금: 50루블 (환불 가능)
- 충전은 창구 또는 자동 충전기에서 가능합니다

🎫 **요금 체계**
- 1회권: 62루블
- 2회권: 124루블
- 무제한 1일권: 265루블
- 무제한 3일권: 500루블
- 월정액: 약 2,800루블

🚇 **탑승 방법**
1. 트로이카 카드를 개찰구 센서에 찍습니다
2. 초록불이 들어오면 통과하세요
3. 플랫폼에서 열차 방향을 확인하세요
4. 문이 열리면 먼저 내리는 사람을 기다린 후 탑승

⏰ **운행 시간**
- 오전 5:30 ~ 새벽 1:00
- 출퇴근 시간에는 1-2분 간격으로 운행
- 한산한 시간에는 3-5분 간격

💡 **꿀팁**
- 환승은 무료이고 횟수 제한이 없습니다!
- 러시아어로 "스탄시야(станция)"는 역을 의미합니다
- Yandex Metro 앱을 다운받으면 길찾기가 편해요
- 지하철 안은 정말 깨끗하고 아름다워요. 역마다 독특한 디자인을 감상해보세요!

궁금한 점 있으시면 댓글로 물어보세요! 😊' as content,
  'info' as category,
  NOW() - INTERVAL ''2 hours'' as created_at
FROM profiles
WHERE email = 'thesmin@naver.com'
LIMIT 1;
