import { SignJWT, jwtVerify } from 'jose'

export const SITE_SESSION_COOKIE = 'af_session'

/** JWT signing key — set AUTH_SECRET in production (32+ chars recommended). */
export function getAuthSecretKey(): Uint8Array {
  const raw = process.env.AUTH_SECRET
  if (raw && raw.length >= 16) {
    return new TextEncoder().encode(raw)
  }
  // Dev fallback only — never use in production without AUTH_SECRET
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
