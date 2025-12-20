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
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js', 'react', 'react-dom'],
  },
  // 정적 생성 최적화
  staticPageGenerationTimeout: 120,
  // Gzip 압축 활성화
  compress: true,
  // PoweredBy 헤더 제거 (보안)
  poweredByHeader: false,
  // React Strict Mode
  reactStrictMode: true,
  // SWC Minify 사용
  swcMinify: true,
  // 웹팩 최적화
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 클라이언트 번들 분할 최적화
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // React Framework 청크
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // Supabase 청크
            supabase: {
              name: 'supabase',
              chunks: 'all',
              test: /[\\/]node_modules[\\/]@supabase[\\/]/,
              priority: 30,
            },
            // UI 라이브러리 청크
            ui: {
              name: 'ui',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](lucide-react|framer-motion)[\\/]/,
              priority: 20,
            },
            // 공통 청크 (2회 이상 사용)
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      }
    }
    return config
  },
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
