import { SignJWT, jwtVerify } from 'jose'

export const SITE_SESSION_COOKIE = 'af_session'

/** JWT signing key — set AUTH_SECRET in production (32+ chars recommended). */
export function getAuthSecretKey(): Uint8Array {
  const raw = process.env.AUTH_SECRET

  if (process.env.NODE_ENV === 'production' && (!raw || raw.length < 16)) {
    throw new Error(
      '[PaperFactory] AUTH_SECRET 환경변수가 설정되지 않았습니다. ' +
      '프로덕션 배포 시 최소 16자 이상의 AUTH_SECRET을 설정하세요.',
    )
  }

  if (raw && raw.length >= 16) {
    return new TextEncoder().encode(raw)
  }

  // 개발 환경 전용 fallback — 프로덕션에서는 위 throw로 차단됨
  return new TextEncoder().encode(
    'dev-only-insecure-key-set-AUTH_SECRET-in-production',
  )
}

export async function createSiteSessionToken(): Promise<string> {
  return new SignJWT({ sub: 'site', typ: 'site-gate' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getAuthSecretKey())
}

export async function verifySiteSessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getAuthSecretKey())
    return true
  } catch {
    return false
  }
}
