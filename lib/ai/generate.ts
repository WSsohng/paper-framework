'use server'

/**
 * Unified AI JSON generator.
 * Priority: Claude (Anthropic) → OpenAI (fallback)
 * Claude is the primary reasoning engine; OpenAI is the fallback.
 */

import Anthropic from '@anthropic-ai/sdk'
import OpenAI    from 'openai'
import { withFrameworkProtocol } from '@/lib/framework-philosophy'

type AIProvider = 'claude' | 'openai' | 'none'

function getActiveProvider(): AIProvider {
  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your-anthropic-api-key-here') {
    return 'claude'
  }
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
    return 'openai'
  }
  return 'none'
}

/**
 * Generates structured JSON via the best available AI provider.
 * Prepends FRAMEWORK protocol unless `skipFrameworkProtocol` is true.
 */
export async function generateJson<T>(
  prompt: string,
  temperature = 0.4,
  opts?: { skipFrameworkProtocol?: boolean },
): Promise<T> {
  const provider = getActiveProvider()

  if (provider === 'none') {
    throw new Error('AI API 키가 설정되지 않았습니다. ANTHROPIC_API_KEY 또는 OPENAI_API_KEY를 설정하세요.')
  }

  const fullPrompt = opts?.skipFrameworkProtocol ? prompt : withFrameworkProtocol(prompt)

  const text = provider === 'claude'
    ? await callClaude(fullPrompt, temperature)
    : await callOpenAI(fullPrompt, temperature)

  return parseJson<T>(text)
}

// ── Claude ───────────────────────────────────────────────

async function callClaude(prompt: string, temperature: number): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const message = await client.messages.create({
    model:       'claude-3-5-haiku-latest',
    max_tokens:  2048,
    temperature,
    messages:    [{ role: 'user', content: prompt }],
  })

  const block = message.content[0]
  if (block.type !== 'text') throw new Error('Unexpected Claude response type')
  return block.text
}

// ── OpenAI ───────────────────────────────────────────────

async function callOpenAI(prompt: string, temperature: number): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

  const response = await client.chat.completions.create({
    model:           'gpt-4o-mini',
    messages:        [{ role: 'user', content: prompt }],
    temperature,
    response_format: { type: 'json_object' },
  })

  return response.choices[0]?.message?.content ?? ''
}

// ── JSON parser ──────────────────────────────────────────

function parseJson<T>(text: string): T {
  // Extract JSON from markdown code blocks if present
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = codeBlock ? codeBlock[1].trim() : text.trim()

  try {
    const parsed = JSON.parse(raw) as T
    return parsed
  } catch {
    // Sometimes the model wraps in an outer object — unwrap
    const innerMatch = raw.match(/\{[\s\S]*"(?:data|items|results|questions|topics|keywords)":\s*(\[[\s\S]*?\])\s*\}/)
    if (innerMatch) {
      return JSON.parse(innerMatch[1]) as T
    }
    throw new Error(`JSON 파싱 실패: ${raw.slice(0, 200)}`)
  }
}
