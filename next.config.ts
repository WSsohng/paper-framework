import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * 연구/내부 배포용: 크롤러·봇에 색인 거부를 HTTP로도 명시합니다.
   * (브라우저 사용자에게는 영향 없음 — 검색엔진·일부 봇이 참고)
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key:   'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
