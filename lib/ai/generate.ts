'use server'

/**
 * Unified AI JSON generator.
 * Priority: Claude (Anthropic) → OpenAI (fallback)
 *
 * Token usage is automatically logged to ai_usage_logs (non-blocking).
 * Pass opts.meta to identify the calling feature and project.
 */

import Anthropic from '@anthropic-ai/sdk'
import OpenAI    from 'openai'
import { withFrameworkProtocol } from '@/lib/framework-philosophy'
import { createClient } from '@/lib/supabase/server'

type AIProvider = 'claude' | 'openai' | 'none'

/** 기능 레이블 — UI 표시 및 비용 분류 기준 */
export type AIFeature =
  | 'concept_extraction'
  | 'journal_analysis'
  | 'journal_recommendation'
  | 'asset_insights'
  | 'research_questions'
  | 'research_keywords'
  | 'topic_recommendation'
  | 'timeliness_analysis'
  | 'tier_monitoring'
  | 'other'

export interface AIMeta {
  feature:   AIFeature
  projectId?: string
}

interface TokenUsage {
  input_tokens:  number
  output_tokens: number
  provider:      Exclude<AIProvider, 'none'>
  model:         string
}

// ── Provider detection ────────────────────────────────────

function getActiveProvider(): AIProvider {
  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your-anthropic-api-key-here') {
    return 'claude'
  }
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
    return 'openai'
  }
  return 'none'
}

export async function getAIStatus(): Promise<{ provider: AIProvider; model: string | null }> {
  const provider = getActiveProvider()
  const model =
    provider === 'claude' ? 'claude-3-5-haiku-latest' :
    provider === 'openai' ? 'gpt-4o-mini' :
    null
  return { provider, model }
}

// ── Main entry ────────────────────────────────────────────

/**
 * Generates structured JSON via the best available AI provider.
 * Prepends FRAMEWORK protocol unless `skipFrameworkProtocol` is true.
 * Token usage is logged asynchronously (fire-and-forget).
 */
export async function generateJson<T>(
  prompt: string,
  temperature = 0.4,
  opts?: {
    skipFrameworkProtocol?: boolean
    meta?: AIMeta
  },
): Promise<T> {
  const provider = getActiveProvider()

  if (provider === 'none') {
    throw new Error('AI API 키가 설정되지 않았습니다. ANTHROPIC_API_KEY 또는 OPENAI_API_KEY를 설정하세요.')
  }

  const fullPrompt = opts?.skipFrameworkProtocol ? prompt : withFrameworkProtocol(prompt)

  const { text, usage } = provider === 'claude'
    ? await callClaude(fullPrompt, temperature)
    : await callOpenAI(fullPrompt, temperature)

  // 비동기 로깅 — 메인 플로우를 블로킹하지 않음
  if (opts?.meta) {
    logUsage({ ...usage, ...opts.meta }).catch(() => {})
  }

  return parseJson<T>(text)
}

// ── Claude ───────────────────────────────────────────────

async function callClaude(
  prompt: string,
  temperature: number,
): Promise<{ text: string; usage: TokenUsage }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const message = await client.messages.create({
    model:       'claude-3-5-haiku-latest',
    max_tokens:  2048,
    temperature,
    messages:    [{ role: 'user', content: prompt }],
  })

  const block = message.content[0]
  if (block.type !== 'text') throw new Error('Unexpected Claude response type')

  return {
    text: block.text,
    usage: {
      input_tokens:  message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      provider: 'claude',
      model:    'claude-3-5-haiku-latest',
    },
  }
}

// ── OpenAI ───────────────────────────────────────────────

async function callOpenAI(
  prompt: string,
  temperature: number,
): Promise<{ text: string; usage: TokenUsage }> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

  const response = await client.chat.completions.create({
    model:           'gpt-4o-mini',
    messages:        [{ role: 'user', content: prompt }],
    temperature,
    response_format: { type: 'json_object' },
  })

  return {
    text: response.choices[0]?.message?.content ?? '',
    usage: {
      input_tokens:  response.usage?.prompt_tokens     ?? 0,
      output_tokens: response.usage?.completion_tokens ?? 0,
      provider: 'openai',
      model:    'gpt-4o-mini',
    },
  }
}

// ── Usage logger ──────────────────────────────────────────

async function logUsage(params: TokenUsage & AIMeta): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.from('ai_usage_logs').insert({
      project_id:    params.projectId ?? null,
      feature:       params.feature,
      provider:      params.provider,
      model:         params.model,
      input_tokens:  params.input_tokens,
      output_tokens: params.output_tokens,
    })
  } catch {
    // 로깅 실패는 무시 (비핵심 기능)
  }
}

// ── JSON parser ──────────────────────────────────────────

function parseJson<T>(text: string): T {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = codeBlock ? codeBlock[1].trim() : text.trim()

  try {
    return JSON.parse(raw) as T
  } catch {
    const innerMatch = raw.match(/\{[\s\S]*"(?:data|items|results|questions|topics|keywords)":\s*(\[[\s\S]*?\])\s*\}/)
    if (innerMatch) {
      return JSON.parse(innerMatch[1]) as T
    }
    throw new Error(`JSON 파싱 실패: ${raw.slice(0, 200)}`)
  }
}
