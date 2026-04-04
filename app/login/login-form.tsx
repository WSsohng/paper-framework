'use client'

import { useActionState } from 'react'
import { login, type LoginState } from '@/lib/actions/site-auth'

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, null)

  return (
    <div className="relative w-full max-w-md">
      {/* Card */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 shadow-2xl shadow-black/40 backdrop-blur-sm">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(99,102,241,0.08)_0%,transparent_50%,rgba(99,102,241,0.04)_100%)]" />
        <div className="relative px-8 py-10">
          <div className="mb-8 text-center">
            <p className="text-xs font-medium tracking-[0.2em] text-indigo-400 uppercase mb-3">
              Private workspace
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              Paper<span className="text-indigo-400">Factory</span>
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              연구 데이터에 접근하려면 비밀번호를 입력하세요.
            </p>
          </div>

          <form action={formAction} className="space-y-5">
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-xs font-medium text-zinc-500"
              >
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                autoFocus
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-4 py-3.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none ring-0 transition-colors focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30"
              />
            </div>

            {state?.error && (
              <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? (
                <>
                  <Spinner />
                  확인 중…
                </>
              ) : (
                '입장'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[11px] leading-relaxed text-zinc-600">
            이 화면은 사이트 전체를 보호합니다.
            {process.env.NODE_ENV === 'development' && (
              <>
                <br />
                <span className="text-zinc-700">
                  로컬에서 로그인을 끄려면 .env.local의 SITE_PASSWORD를 비우세요.
                </span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
