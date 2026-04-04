/**
 * ConceptChip — AI 추출 개념 키워드 태그
 * 개념 문자열을 해시해서 일관된 색상 배정 (재렌더링해도 동일)
 */

function hashColor(str: string): string {
  const COLORS = [
    'bg-sky-900/50 text-sky-300 ring-sky-700/40',
    'bg-violet-900/50 text-violet-300 ring-violet-700/40',
    'bg-emerald-900/50 text-emerald-300 ring-emerald-700/40',
    'bg-rose-900/50 text-rose-300 ring-rose-700/40',
    'bg-amber-900/50 text-amber-300 ring-amber-700/40',
    'bg-cyan-900/50 text-cyan-300 ring-cyan-700/40',
    'bg-indigo-900/50 text-indigo-300 ring-indigo-700/40',
    'bg-teal-900/50 text-teal-300 ring-teal-700/40',
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  }
  return COLORS[hash % COLORS.length]
}

interface ConceptChipProps {
  concept: string
  size?: 'sm' | 'xs'
}

export function ConceptChip({ concept, size = 'sm' }: ConceptChipProps) {
  const color = hashColor(concept)
  const sizeClass = size === 'xs'
    ? 'px-1.5 py-0.5 text-[10px]'
    : 'px-2 py-0.5 text-[11px]'

  return (
    <span
      className={`inline-flex items-center rounded ring-1 font-medium leading-tight ${color} ${sizeClass}`}
    >
      {concept}
    </span>
  )
}

interface ConceptChipListProps {
  concepts: string[]
  max?: number
  size?: 'sm' | 'xs'
  className?: string
}

export function ConceptChipList({ concepts, max = 6, size = 'sm', className = '' }: ConceptChipListProps) {
  if (!concepts || concepts.length === 0) return null

  const visible = concepts.slice(0, max)
  const overflow = concepts.length - max

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {visible.map((c) => (
        <ConceptChip key={c} concept={c} size={size} />
      ))}
      {overflow > 0 && (
        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium text-zinc-500 ring-1 ring-zinc-700/40 bg-zinc-800/50">
          +{overflow}
        </span>
      )}
    </div>
  )
}
