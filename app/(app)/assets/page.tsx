import Link from 'next/link'
import { getAssets } from '@/lib/actions/assets'
import { getReferencePapers } from '@/lib/actions/reference-papers'
import { getSelectedProjectId } from '@/lib/selected-project'
import { AssetTypeBadge, PaperTierBadge, TagBadge } from '@/components/ui/badge'
import { AssetDialog } from '@/components/module2/asset-dialog'
import type { Asset, AssetSection, AssetType } from '@/lib/types'
import { ASSET_SECTION_LABELS } from '@/lib/types'
import { AssetInsightButton } from '@/components/module2/asset-insight-button'

export const metadata = { title: 'Asset Library — Academic Factory' }

const TYPE_ORDER: AssetType[] = ['quote', 'reference', 'figure', 'table', 'data', 'note']
const TYPE_LABELS: Record<AssetType, string> = {
  quote: '인용구', reference: '참고문헌', figure: '그림', table: '표', data: '데이터', note: '메모',
}

const SECTION_ORDER: (AssetSection | '__none')[] = [
  'intro', 'methods', 'results', 'discussion', 'conclusion', 'supplementary', '__none',
]
const SECTION_LABEL_MAP: Record<AssetSection | '__none', string> = {
  ...ASSET_SECTION_LABELS,
  __none: '섹션 미지정',
}

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { view } = await searchParams
  const isSectionView = view === 'section'

  const selectedProjectId = await getSelectedProjectId()
  const [assets, refPapers] = await Promise.all([
    getAssets(selectedProjectId),
    selectedProjectId ? getReferencePapers(selectedProjectId) : Promise.resolve([]),
  ])

  // 섹션별 그루핑
  const bySection = SECTION_ORDER.reduce<Record<string, Asset[]>>((acc, s) => {
    acc[s] = assets.filter((a) =>
      s === '__none' ? !a.paper_section : a.paper_section === s,
    )
    return acc
  }, {})

  // 유형별 그루핑
  const byType = TYPE_ORDER.reduce<Record<string, Asset[]>>((acc, t) => {
    acc[t] = assets.filter((a) => a.type === t)
    return acc
  }, {})

  const refPaperPickList: { id: string; title: string; year: number | null; tier: import('@/lib/types').PaperTier | null }[] =
    refPapers.map((p) => ({
      id: p.id, title: p.title, year: p.year,
      tier: p.tier as import('@/lib/types').PaperTier | null,
    }))

  // 연결된 참고문헌 수
  const linkedCount = assets.filter((a) => a.reference_paper_id).length
  const sectionedCount = assets.filter((a) => a.paper_section).length

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-8 py-5">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">자산 라이브러리</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span>{assets.length}개 자산</span>
            {linkedCount > 0 && (
              <span className="text-indigo-400">· 출처 연결 {linkedCount}개</span>
            )}
            {sectionedCount > 0 && (
              <span className="text-zinc-500">· 섹션 지정 {sectionedCount}개</span>
            )}
            <span className="text-zinc-700">· 프로젝트 공유</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* AI 인사이트 추출 버튼 */}
          {selectedProjectId && refPapers.some((p) => p.abstract || p.notes) && (
            <AssetInsightButton
              projectId={selectedProjectId}
              referencePapers={refPapers
                .filter((p) => p.abstract || p.notes)
                .map((p) => ({ id: p.id, title: p.title, abstract: p.abstract, notes: p.notes, tier: p.tier }))}
              existingAssetTitles={assets.map((a) => a.title)}
            />
          )}
          <AssetDialog
            projectId={selectedProjectId}
            referencePapers={refPaperPickList}
            trigger={
              <button className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
                + 자산 추가
              </button>
            }
          />
        </div>
      </div>

      {/* 뷰 탭 */}
      <div className="flex gap-0 border-b border-zinc-800 px-8">
        <Link
          href="/assets"
          className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            !isSectionView
              ? 'border-indigo-500 text-indigo-300'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          유형별
        </Link>
        <Link
          href="/assets?view=section"
          className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            isSectionView
              ? 'border-indigo-500 text-indigo-300'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          섹션별
          <span className="ml-1.5 rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
            논문 섹션
          </span>
        </Link>
      </div>

      <div className="flex-1 px-8 py-6">
        {assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <p className="text-sm text-zinc-500">자산이 없습니다.</p>
            <p className="text-xs text-zinc-700">
              {selectedProjectId
                ? '인용구, 그림, 참고문헌, 데이터를 이곳에 모아두세요.\n참고문헌과 연결하면 AI 초고 생성 시 자동으로 반영됩니다.'
                : '사이드바에서 프로젝트를 먼저 선택하세요.'}
            </p>
          </div>
        ) : isSectionView ? (
          /* ── 섹션별 뷰 ── */
          <div className="space-y-8">
            {SECTION_ORDER.map((sec) => {
              const group = bySection[sec]
              if (!group || group.length === 0) return null
              const label = SECTION_LABEL_MAP[sec]
              return (
                <div key={sec}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">
                    {label} · {group.length}
                  </p>
                  <div className="space-y-1.5">
                    {group.map((asset) => (
                      <AssetRow
                        key={asset.id}
                        asset={asset}
                        projectId={selectedProjectId}
                        refPaperPickList={refPaperPickList}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ── 유형별 뷰 ── */
          <div className="space-y-8">
            {TYPE_ORDER.map((type) => {
              const group = byType[type]
              if (!group || group.length === 0) return null
              return (
                <div key={type}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">
                    {TYPE_LABELS[type]} · {group.length}
                  </p>
                  <div className="space-y-1.5">
                    {group.map((asset) => (
                      <AssetRow
                        key={asset.id}
                        asset={asset}
                        projectId={selectedProjectId}
                        refPaperPickList={refPaperPickList}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── 공통 자산 행 컴포넌트 ──────────────────────────────────
type PickedRef = { id: string; title: string; year: number | null; tier: import('@/lib/types').PaperTier | null }

function AssetRow({
  asset,
  projectId,
  refPaperPickList,
}: {
  asset: Asset
  projectId: string | null | undefined
  refPaperPickList: PickedRef[]
}) {
  const sectionLabel = asset.paper_section
    ? ASSET_SECTION_LABELS[asset.paper_section]
    : null

  return (
    <div className="group flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3.5 hover:border-zinc-700 transition-colors">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-600/70" />
      <div className="flex-1 min-w-0">
        <Link href={`/assets/${asset.id}`} className="block">
          <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100 leading-snug">
            {asset.title}
          </p>
        </Link>

        {/* 출처: 참고문헌 연결 우선, 없으면 source 텍스트 */}
        {asset.reference_paper ? (
          <div className="mt-0.5 flex items-center gap-1.5">
            <PaperTierBadge tier={asset.reference_paper.tier ?? null} />
            <span className="text-xs text-zinc-600 truncate">
              {asset.reference_paper.title}
              {asset.reference_paper.year ? ` (${asset.reference_paper.year})` : ''}
            </span>
          </div>
        ) : asset.source ? (
          <p className="mt-0.5 text-xs text-zinc-600 truncate">{asset.source}</p>
        ) : null}

        {/* 섹션 + 태그 */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {sectionLabel && (
            <span className="rounded-full border border-zinc-700/50 bg-zinc-800/50 px-2 py-0.5 text-[10px] text-zinc-500">
              {sectionLabel}
            </span>
          )}
          {asset.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <AssetTypeBadge type={asset.type} />
        <AssetDialog
          asset={asset}
          projectId={projectId}
          referencePapers={refPaperPickList}
          trigger={
            <button className="text-[11px] text-zinc-600 hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-all">
              수정
            </button>
          }
        />
      </div>
    </div>
  )
}
