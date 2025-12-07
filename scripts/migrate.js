#!/usr/bin/env node

/**
 * Supabase 마이그레이션 자동 실행 스크립트
 * 사용법: node scripts/migrate.js
 */

const https = require('https');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsdnJlZGZmendpbXl6c3hwbGJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDk0ODMxNiwiZXhwIjoyMDgwNTI0MzE2fQ.0tW6rSqJkN0YPP8LpZYCqJqCqJqCqJqCqJqCqJqCqJo'; // 임시 - 실제 service_role key 필요

const SQL = `
-- Update handle_new_user function to include city and metro_station
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, city, metro_station)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'metro_station'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

const projectRef = SUPABASE_URL.match(/https:\/\/(.+)\.supabase\.co/)[1];

const options = {
  hostname: `${projectRef}.supabase.co`,
  path: '/rest/v1/rpc/exec_sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  },
};

console.log('🚀 Supabase 마이그레이션 실행 중...');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ 마이그레이션 완료!');
    } else {
      console.error('❌ 에러:', res.statusCode, data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ 네트워크 에러:', e);
});

req.write(JSON.stringify({ query: SQL }));
req.end();
