'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { timingSafeEqual } from 'crypto'
import {
  SITE_SESSION_COOKIE,
  createSiteSessionToken,
} from '@/lib/auth/site-session'

function safePasswordCompare(input: string, expected: string): boolean {
  try {
    const a = Buffer.from(input, 'utf8')
    const b = Buffer.from(expected, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export type LoginState = { error: string } | null

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = (formData.get('password') as string) ?? ''
  const expected = process.env.SITE_PASSWORD

  if (!expected) {
    return { error: '서버에 SITE_PASSWORD가 설정되지 않았습니다.' }
  }

  if (!password || !safePasswordCompare(password, expected)) {
    return { error: '비밀번호가 올바르지 않습니다.' }
  }

  const token = await createSiteSessionToken()
  const store = await cookies()
  store.set(SITE_SESSION_COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   60 * 60 * 24 * 7, // 7 days
  })

  redirect('/dashboard')
}

export async function logout() {
  const store = await cookies()
  store.delete(SITE_SESSION_COOKIE)
  redirect('/login')
}
