/**
 * 저널 IF 보강 관련 공용 타입·유틸.
 *
 * NOTE: `'use server'` 파일은 async 함수만 export 가능하므로
 *       (Next.js 16 / Turbopack 제약),
 *       sync 유틸과 타입은 반드시 이 파일에 분리한다.
 */

export interface ImpactFactorLookup {
  /** 입력된 원본 저널명 → IF (없으면 null) */
  map: Record<string, number | null>
  /** 신규로 OpenAlex 에서 가져온 건수 */
  fetched: number
  /** 캐시 히트 건수 */
  hits: number
  /** OpenAlex 조회가 실패한(타임아웃/에러) 건수 */
  errors: number
}

/**
 * 저널명 정규화: 대소문자·공백 통일 + 선두 "the " 제거.
 * 캐시 키로 사용하므로 클라이언트/서버 양쪽에서 동일하게 호출해야 한다.
 */
export function normalizeJournalName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\s\u00a0]+/g, ' ')
    .replace(/^the\s+/, '')
    .trim()
}
