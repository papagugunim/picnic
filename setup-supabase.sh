#!/bin/bash

# Supabase 마이그레이션 자동화 설정 스크립트
# 이 스크립트를 실행하면 Supabase CLI를 통해 마이그레이션을 자동으로 적용합니다

echo "🚀 Supabase 마이그레이션 설정을 시작합니다..."

# 1. Supabase 로그인 (브라우저가 열립니다)
echo "1️⃣ Supabase에 로그인합니다..."
supabase login

# 2. 프로젝트 연결
echo "2️⃣ 프로젝트를 연결합니다..."
supabase link --project-ref tlvredffzwimyzsxplbo

# 3. 마이그레이션 적용
echo "3️⃣ 마이그레이션을 적용합니다..."
supabase db push

echo "✅ 완료! 이제 앞으로는 'supabase db push' 명령어로 마이그레이션을 적용할 수 있습니다."
