import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import PostHogProvider from "@/components/analytics/PostHogProvider";

export const metadata: Metadata = {
  title: "picnic - 해외 한인 커뮤니티",
  description: "해외 거주 도시 기반 한국인 교민 플랫폼",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/android-chrome-192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/android-chrome-512x512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" },
    ],
    shortcut: [{ url: "/favicon.ico" }],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isProduction = process.env.NODE_ENV === 'production'
  const supabaseOrigin = (() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!url) return null
    try {
      return new URL(url).origin
    } catch {
      return null
    }
  })()
  const posthogOrigin = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const key = 'theme';
                const current = localStorage.getItem(key);
                if (current === 'white') localStorage.setItem(key, 'light');
                if (current === 'black') localStorage.setItem(key, 'dark');
              } catch (_) {}
            `,
          }}
        />
        {supabaseOrigin && (
          <>
            <link rel="preconnect" href={supabaseOrigin} crossOrigin="" />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        )}
        <link rel="preconnect" href={posthogOrigin} crossOrigin="" />
        <link rel="dns-prefetch" href={posthogOrigin} />
      </head>
      <body className="antialiased">
        <PostHogProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            themes={['light', 'dark']}
          >
            {children}
            <Toaster position="top-center" richColors />
          </ThemeProvider>
        </PostHogProvider>
        {/* 개발 환경에서는 Analytics 비활성화 - 속도 개선 */}
        {isProduction && (
          <>
            <SpeedInsights />
            <Analytics />
          </>
        )}
      </body>
    </html>
  );
}
