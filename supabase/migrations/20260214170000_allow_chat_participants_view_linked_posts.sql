-- 채팅 참여자가 연결된 게시글(활성/예약/판매완료 포함)을 조회할 수 있도록 허용
-- 목적: 채팅 목록/채팅방 상단에서 판매글 썸네일이 누락되지 않게 보장

CREATE POLICY "Chat participants can view linked posts"
  ON posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM chat_rooms cr
      WHERE cr.post_id = posts.id
        AND (cr.user1_id = auth.uid() OR cr.user2_id = auth.uid())
    )
  );

