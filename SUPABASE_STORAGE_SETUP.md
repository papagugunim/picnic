# Supabase Storage 설정 가이드

## 1. Storage 버킷 생성

### Step 1: Supabase 대시보드 접속
1. https://supabase.com 접속
2. picnic 프로젝트 선택
3. 왼쪽 메뉴에서 **Storage** 클릭

### Step 2: 새 버킷 생성
1. **"New bucket"** 버튼 클릭
2. 버킷 정보 입력:
   - **Name**: `post-images`
   - **Public bucket**: ✅ 체크 (공개 접근 허용)
   - **Allowed MIME types**: `image/*` (모든 이미지 타입 허용)
   - **Max file size**: `5 MB` (파일당 최대 5MB)

3. **"Create bucket"** 클릭

### Step 3: RLS 정책 설정

버킷 생성 후, **Policies** 탭에서 다음 정책들을 추가합니다:

#### 정책 1: 모든 사용자가 이미지를 볼 수 있음
```sql
-- Policy name: Public Access
-- Operation: SELECT
-- Target roles: public

CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'post-images');
```

#### 정책 2: 인증된 사용자만 이미지 업로드 가능
```sql
-- Policy name: Authenticated users can upload
-- Operation: INSERT
-- Target roles: authenticated

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post-images');
```

#### 정책 3: 사용자는 자신의 이미지만 업데이트 가능
```sql
-- Policy name: Users can update own images
-- Operation: UPDATE
-- Target roles: authenticated

CREATE POLICY "Users can update own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

#### 정책 4: 사용자는 자신의 이미지만 삭제 가능
```sql
-- Policy name: Users can delete own images
-- Operation: DELETE
-- Target roles: authenticated

CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 2. 이미지 URL 구조

업로드된 이미지는 다음과 같은 구조로 저장됩니다:

```
post-images/
  └── {user_id}/
      └── {post_id}/
          ├── image1.jpg
          ├── image2.jpg
          └── image3.jpg
```

**공개 URL 예시**:
```
https://tlvredffzwimyzsxplbo.supabase.co/storage/v1/object/public/post-images/{user_id}/{post_id}/image1.jpg
```

---

## 3. 이미지 업로드 제한사항

- **파일 크기**: 최대 5MB per 이미지
- **파일 개수**: 게시물당 최대 5개
- **허용 형식**: JPG, JPEG, PNG, WEBP, GIF
- **권장 해상도**: 최대 1920x1080 (자동 리사이징 예정)

---

## 4. 환경 변수 확인

`.env.local` 파일에 다음 변수들이 있는지 확인:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tlvredffzwimyzsxplbo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 5. 확인 방법

Storage 버킷이 제대로 생성되었는지 확인:

1. Supabase 대시보드 → Storage
2. `post-images` 버킷이 보이는지 확인
3. 버킷 클릭 → Policies 탭에서 4개의 정책이 있는지 확인

---

## 완료! ✅

이제 애플리케이션에서 이미지를 업로드할 수 있습니다!
