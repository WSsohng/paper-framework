'use server'

/**
 * Unified AI JSON generator — Claude (Anthropic) only.
 * Token usage is automatically logged to ai_usage_logs (non-blocking).
 */

import Anthropic from '@anthropic-ai/sdk'
import { withFrameworkProtocol } from '@/lib/framework-philosophy'
import { createClient } from '@/lib/supabase/server'

/**
 * 기능 레이블 — UI 표시 및 비용 분류 기준.
 * Phase 1(2026-04-18): orphan feature 2건 제거
 *   - `search_keywords`   (extract-keywords.ts, research-keywords.ts 파일 삭제)
 *   - `research_keywords` (타입엔 있었으나 실 호출 파일 없음)
 * 과거 ai_usage_logs.feature 레코드는 text 컬럼이라 그대로 보존됨.
 */
export type AIFeature =
  | 'concept_extraction'
  | 'journal_analysis'
  | 'journal_recommendation'
  | 'asset_insights'
  | 'research_questions'
  | 'topic_recommendation'
  | 'timeliness_analysis'
  | 'tier_monitoring'
  | 'relevance_tagging'
  | 'track_monitoring'
  | 'search_plan'
  | 'search_synthesis'
  | 'paper_verification'
  | 'hypothesis_generation'
  | 'other'

export interface AIMeta {
  feature:    AIFeature
  projectId?: string
}

interface TokenUsage {
  input_tokens:  number
  output_tokens: number
  model:         string
}

// ── Provider status ───────────────────────────────────────

export async function getAIStatus(): Promise<{ provider: 'claude' | 'none'; model: string | null }> {
  const hasKey = !!process.env.ANTHROPIC_API_KEY &&
    process.env.ANTHROPIC_API_KEY !== 'your-anthropic-api-key-here'
  return hasKey
    ? { provider: 'claude', model: CLAUDE_MODEL }
    : { provider: 'none',  model: null }
}

// ── Main entry ────────────────────────────────────────────

/**
 * Generates structured JSON via Claude.
 * Prepends FRAMEWORK protocol unless `skipFrameworkProtocol` is true.
 * Token usage is logged asynchronously (fire-and-forget).
 */
export async function generateJson<T>(
  prompt: string,
  temperature = 0.4,
  opts?: {
    skipFrameworkProtocol?: boolean
    meta?: AIMeta
    maxTokens?: number
  },
): Promise<T> {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-anthropic-api-key-here') {
    throw new Error('AI API 키가 설정되지 않았습니다. ANTHROPIC_API_KEY를 설정하세요.')
  }

  const fullPrompt = opts?.skipFrameworkProtocol ? prompt : withFrameworkProtocol(prompt)
  const { text, usage } = await callClaude(fullPrompt, temperature, opts?.maxTokens)

  if (opts?.meta) {
    logUsage({ ...usage, ...opts.meta }).catch(() => {})
  }

  return parseJson<T>(text)
}

// ── Claude ────────────────────────────────────────────────

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'
const MAX_RETRIES  = 3

async function callClaude(
  prompt: string,
  temperature: number,
  maxTokens = 2048,
): Promise<{ text: string; usage: TokenUsage }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  let lastError: unknown
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const message = await client.messages.create({
        model:      CLAUDE_MODEL,
        max_tokens: maxTokens,
        temperature,
        messages:   [{ role: 'user', content: prompt }],
      })

      const block = message.content[0]
      if (block.type !== 'text') throw new Error('Unexpected Claude response type')

      return {
        text: block.text,
        usage: {
          input_tokens:  message.usage.input_tokens,
          output_tokens: message.usage.output_tokens,
          model:         CLAUDE_MODEL,
        },
      }
    } catch (err: unknown) {
      lastError = err
      const status = (err as { status?: number })?.status
      // 429 rate limit 또는 529 overloaded → 재시도
      if ((status === 429 || status === 529) && attempt < MAX_RETRIES - 1) {
        const waitMs = (attempt + 1) * 5000  // 5s, 10s, 15s
        await new Promise(resolve => setTimeout(resolve, waitMs))
        continue
      }
      throw err
    }
  }
  throw lastError
}

// ── Usage logger ──────────────────────────────────────────

async function logUsage(params: TokenUsage & AIMeta): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.from('ai_usage_logs').insert({
      project_id:    params.projectId ?? null,
      feature:       params.feature,
      provider:      'claude',
      model:         params.model,
      input_tokens:  params.input_tokens,
      output_tokens: params.output_tokens,
    })
  } catch {
    // 로깅 실패는 무시 (비핵심 기능)
  }
}

// ── JSON parser ───────────────────────────────────────────

function parseJson<T>(text: string): T {
  // 코드 펜스 제거 (non-greedy가 긴 JSON을 못잡는 경우 대비해 greedy 우선 시도)
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]+?)```/) ??
                    text.match(/```(?:json)?\s*([\s\S]+)$/)
  const raw = codeBlock ? codeBlock[1].trim() : text.trim()

  try {
    return JSON.parse(raw) as T
  } catch {
    // 1) 배열이 객체 키 안에 래핑된 경우: { "journals": [...] } 등 임의 키 허용
    const innerMatch = raw.match(/"(?:\w+)":\s*(\[[\s\S]*\])/)
    if (innerMatch) {
      try { return JSON.parse(innerMatch[1]) as T } catch { /* fall through */ }
    }
    // 2) 배열만 추출 시도
    const arrayMatch = raw.match(/(\[[\s\S]*\])/)
    if (arrayMatch) {
      try { return JSON.parse(arrayMatch[1]) as T } catch { /* fall through */ }
    }
    throw new Error(`JSON 파싱 실패: ${raw.slice(0, 200)}`)
  }
}
