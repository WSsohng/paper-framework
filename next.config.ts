import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production'

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // 크롤러·봇 색인 거부
          {
            key:   'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet',
          },
          // 클릭재킹 방어
          { key: 'X-Frame-Options', value: 'DENY' },
          // MIME 스니핑 방어
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // 외부 링크 시 Referer URL 최소화
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // 불필요한 브라우저 API 비활성화
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // HTTPS 강제 (프로덕션만)
          ...(isProd
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]
            : []),
        ],
      },
    ]
  },
};

export default nextConfig;
