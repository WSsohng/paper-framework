import Link from 'next/link'
import { getAssets } from '@/lib/actions/assets'
import { getSelectedProjectId } from '@/lib/selected-project'
import { AssetTypeBadge, TagBadge } from '@/components/ui/badge'
import { AssetDialog } from '@/components/module2/asset-dialog'
import type { AssetType } from '@/lib/types'

export const metadata = { title: 'Asset Library — Academic Factory' }

const TYPE_ORDER: AssetType[] = ['quote', 'reference', 'figure', 'table', 'data', 'note']
const TYPE_LABELS: Record<AssetType, string> = {
  quote: '인용', reference: '참고문헌', figure: '그림', table: '표', data: '데이터', note: '메모',
}

export default async function AssetsPage() {
  const selectedProjectId = await getSelectedProjectId()
  const assets = await getAssets(selectedProjectId)

  const grouped = TYPE_ORDER.reduce<Record<string, typeof assets>>((acc, t) => {
    acc[t] = assets.filter((a) => a.type === t)
    return acc
  }, {})

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-zinc-800 px-8 py-5">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">자산 라이브러리</h1>
          <p className="mt-0.5 text-sm text-zinc-500">{assets.length}개 자산 · 프로젝트 공유</p>
        </div>
        <AssetDialog
          projectId={selectedProjectId}
          trigger={
            <button className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
              + 자산 추가
            </button>
          }
        />
      </div>

      <div className="flex-1 px-8 py-6">
        {assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm text-zinc-500">자산이 없습니다.</p>
            <p className="mt-1 text-xs text-zinc-700">
              {selectedProjectId
                ? '인용구, 그림, 참고문헌, 데이터를 이곳에 모아두세요.'
                : '사이드바에서 프로젝트를 먼저 선택하세요.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {TYPE_ORDER.map((type) => {
              const group = grouped[type]
              if (group.length === 0) return null
              return (
                <div key={type}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">
                    {TYPE_LABELS[type]} · {group.length}
                  </p>
                  <div className="space-y-1.5">
                    {group.map((asset) => (
                      <Link
                        key={asset.id}
                        href={`/assets/${asset.id}`}
                        className="group flex items-start gap-4 rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-3.5 hover:border-zinc-700 transition-colors"
                      >
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100">{asset.title}</p>
                          {asset.source && (
                            <p className="mt-0.5 text-xs text-zinc-600 truncate">{asset.source}</p>
                          )}
                          {asset.tags.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {asset.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}
                            </div>
                          )}
                        </div>
                        <AssetTypeBadge type={asset.type} />
                      </Link>
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
