'use client'

import { useState } from 'react'
import { AssetForm } from './asset-form'
import type { Asset, ReferencePaper } from '@/lib/types'

interface Props {
  asset?:           Asset
  projectId?:       string | null
  referencePapers?: Pick<ReferencePaper, 'id' | 'title' | 'year' | 'tier'>[]
  trigger:          React.ReactNode
}

export function AssetDialog({ asset, projectId, referencePapers = [], trigger }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">{trigger}</span>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="mb-5 text-base font-semibold text-zinc-100">{asset ? '자산 수정' : '자산 추가'}</h2>
            <AssetForm
              asset={asset}
              projectId={projectId}
              referencePapers={referencePapers}
              onSuccess={() => setOpen(false)}
              onCancel={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
