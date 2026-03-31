import type { MetadataRoute } from 'next'

/**
 * 연구/노하우 배포 시 검색엔진 크롤링을 거부합니다.
 * (봇이 이 규칙을 따르는 것은 자발적입니다 — 실제 보호는 인증·접근 제어가 담당합니다.)
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        disallow:  '/',
      },
    ],
  }
}
