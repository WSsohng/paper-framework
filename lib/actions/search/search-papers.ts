'use server'

/**
 * Paper search router — provider를 환경변수로 선택
 *
 * SEARCH_PROVIDER=semantic_scholar  → Semantic Scholar (API 키 필요)
 * SEARCH_PROVIDER=openalex          → OpenAlex (키 불필요, 임시 대체)
 * (미설정)                           → Semantic Scholar 키 있으면 SS, 없으면 OpenAlex
 */

import { searchPapers       as searchSS,       type SearchOptions, type PaperSearchResult } from './semantic-scholar'
import { searchPapersOpenAlex                  } from './openalex'

export type { SearchOptions, PaperSearchResult } from './semantic-scholar'
export type { FoundPaper                        } from './semantic-scholar'

function getProvider(): 'semantic_scholar' | 'openalex' {
  const explicit = process.env.SEARCH_PROVIDER
  if (explicit === 'semantic_scholar') return 'semantic_scholar'
  if (explicit === 'openalex')         return 'openalex'
  // 자동 선택: SS API 키 있으면 SS, 없으면 OpenAlex
  return process.env.SEMANTIC_SCHOLAR_API_KEY ? 'semantic_scholar' : 'openalex'
}

export async function searchPapers(
  keyword: string,
  limitOrOpts: number | SearchOptions = 15,
): Promise<PaperSearchResult> {
  const provider = getProvider()
  if (provider === 'semantic_scholar') {
    return searchSS(keyword, limitOrOpts)
  }
  return searchPapersOpenAlex(keyword, limitOrOpts)
}

export function getSearchProviderName(): string {
  return getProvider() === 'semantic_scholar' ? 'Semantic Scholar' : 'OpenAlex'
}
