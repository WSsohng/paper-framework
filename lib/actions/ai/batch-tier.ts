'use server'

import { createClient } from '@/lib/supabase/server'
import { generateJson } from '@/lib/ai/generate'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/types'

interface PaperTierResult {
  id: string
  tier: 1 | 2 | 3
  reason: string
}

interface BatchTierResponse {
  papers: PaperTierResult[]
}

/**
 * T레벨 판단 기준
 * T1 (핵심): 분야 최고 저널, 높은 인용수, 연구에 직접 필수적인 논문
 * T2 (주요): 좋은 저널, 적당한 인용수, 중요 참고문헌
 * T3 (배경): 배경지식, 낮은 저널 또는 인용수, 간접적 참고
 */
export async function batchClassifyTiers(
  projectId: string,
  researchIntent: string,
  forceAll = false,
): Promise<ActionResult<{ processed: number; skipped: number }>> {
  const supabase = await createClient()

  const query = supabase
    .from('reference_papers')
    .select('id, title, journal, year, abstract, notes, citation_count')
    .eq('project_id', projectId)

  if (!forceAll) {
    query.is('tier', null)
  }

  const { data: papers, error } = await query

  if (error) return { success: false, error: error.message }
  if (!papers || papers.length === 0) {
    return { success: true, data: { processed: 0, skipped: 0 } }
  }

  // 25편씩 배치 처리 (토큰 한도 고려)
  const BATCH_SIZE = 25
  let totalProcessed = 0

  for (let i = 0; i < papers.length; i += BATCH_SIZE) {
    const batch = papers.slice(i, i + BATCH_SIZE)

    const paperList = batch.map((p) => ({
      id:             p.id,
      title:          p.title,
      journal:        p.journal ?? '불명',
      year:           p.year ?? null,
      citation_count: p.citation_count ?? null,
      abstract:       p.abstract ? p.abstract.slice(0, 300) : (p.notes?.slice(0, 200) ?? null),
    }))

    const prompt = `당신은 학술 논문의 품질과 중요도를 평가하는 전문가입니다.
아래 연구 의도를 기반으로 각 논문에 T레벨(티어)을 배정하세요.

[연구 의도]
${researchIntent}

[평가 기준]
T1 (핵심): 분야 최상위 저널(Nature/Science/Cell 계열, IF>10), 높은 인용수(200↑), 연구에 직접 필수적
T2 (주요): 좋은 전문 저널(IF 3~10), 적당한 인용수(50~200), 중요 참고문헌
T3 (배경): 그 외 저널 또는 인용수 낮음, 배경지식·간접 참고용

⚠ 주의: 인용수와 저널 수준이 없으면 제목·초록·주제로 상대적으로 판단하세요.
  동일 배치 내에서 상대적 중요도를 비교해 배정해도 됩니다.

[논문 목록]
${JSON.stringify(paperList, null, 2)}

아래 JSON 형식으로만 응답 (설명 없이):
{
  "papers": [
    { "id": "uuid", "tier": 1, "reason": "판단근거 한 문장" },
    ...
  ]
}`

    let result: BatchTierResponse
    try {
      result = await generateJson<BatchTierResponse>(prompt, 0.2, {
        skipFrameworkProtocol: true,
        meta: { feature: 'tier_monitoring', projectId },
        maxTokens: 2048,
      })
    } catch {
      continue
    }

    if (!result?.papers?.length) continue

    // DB 업데이트
    for (const item of result.papers) {
      if (![1, 2, 3].includes(item.tier)) continue
      await supabase
        .from('reference_papers')
        .update({ tier: item.tier })
        .eq('id', item.id)
        .eq('project_id', projectId)
      totalProcessed++
    }

    // API 부하 방지
    if (i + BATCH_SIZE < papers.length) {
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  revalidatePath('/reference-papers')
  revalidatePath('/dashboard')

  return {
    success: true,
    data: {
      processed: totalProcessed,
      skipped:   papers.length - totalProcessed,
    },
  }
}
