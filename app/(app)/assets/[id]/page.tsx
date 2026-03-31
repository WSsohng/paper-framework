import { notFound } from 'next/navigation'
import { getAsset } from '@/lib/actions/assets'
import { getSelectedProjectId } from '@/lib/selected-project'
import { AssetTypeBadge, TagBadge } from '@/components/ui/badge'
import { AssetDialog } from '@/components/module2/asset-dialog'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const asset = await getAsset(id)
  return { title: asset ? `${asset.title} — Academic Factory` : 'Asset Not Found' }
}

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [asset, selectedProjectId] = await Promise.all([getAsset(id), getSelectedProjectId()])
  if (!asset) notFound()

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="border-b border-zinc-800 px-8 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-zinc-100">{asset.title}</h1>
            {asset.source && <p className="mt-1 text-sm text-zinc-500">{asset.source}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <AssetTypeBadge type={asset.type} />
            <AssetDialog asset={asset} projectId={selectedProjectId} trigger={
              <button className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">수정</button>
            } />
          </div>
        </div>
        {asset.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {asset.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}
          </div>
        )}
      </div>

      <div className="flex-1 px-8 py-6 max-w-3xl">
        {asset.content ? (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">내용</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">{asset.content}</p>
          </section>
        ) : (
          <div className="py-12 text-center text-sm text-zinc-700">
            내용이 없습니다.
            <AssetDialog asset={asset} projectId={selectedProjectId} trigger={
              <button className="ml-2 text-indigo-400 hover:text-indigo-300">지금 추가 →</button>
            } />
          </div>
        )}
      </div>
    </div>
  )
}
