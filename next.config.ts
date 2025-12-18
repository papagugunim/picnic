import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tlvredffzwimyzsxplbo.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // 성능 최적화
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // 실험적 기능으로 성능 개선
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
  },
  // 정적 생성 최적화
  staticPageGenerationTimeout: 120,
};

export default nextConfig;
