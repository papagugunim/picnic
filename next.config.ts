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
    // 이미지 최적화 (AVIF → WebP fallback)
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 31536000, // 1년 캐시
  },
  // 프로덕션 빌드 최적화
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // 실험적 기능
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js', 'dayjs', 'sonner'],
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  // 정적 생성 최적화
  staticPageGenerationTimeout: 120,
  // Gzip 압축 활성화
  compress: true,
  // PoweredBy 헤더 제거 (보안)
  poweredByHeader: false,
  // React Strict Mode
  reactStrictMode: true,
  // HTTP 헤더 최적화
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains'
          },
        ],
      },
    ]
  },
};

export default nextConfig;
