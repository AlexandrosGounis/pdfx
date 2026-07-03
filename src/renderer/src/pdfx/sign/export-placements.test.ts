// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest'
import { placementsByPage, collectAssets } from './export-placements'
import type { Placement, MarkAsset } from './types'

const P = (over: Partial<Placement>): Placement => ({
  id: over.id ?? 'p',
  pageId: over.pageId ?? 'A',
  kind: over.kind ?? 'signature',
  xFrac: 0.1,
  yFrac: 0.1,
  wFrac: 0.2,
  hFrac: 0.1,
  ...over
})

describe('placementsByPage', () => {
  it('puts a placement only on its own page', () => {
    const map = placementsByPage(['A', 'B'], [P({ id: 's', pageId: 'A' })])
    expect(map.get('A')!.map((p) => p.id)).toEqual(['s'])
    expect(map.get('B')).toEqual([])
  })

  it('expands an apply-to-all initials onto every page (re-targeted pageId)', () => {
    const map = placementsByPage(
      ['A', 'B'],
      [P({ id: 'ini', pageId: 'A', kind: 'initials', appliedToAllPages: true, assetId: 'x' })]
    )
    expect(map.get('A')!.map((p) => p.id)).toEqual(['ini'])
    expect(map.get('B')!.map((p) => [p.id, p.pageId])).toEqual([['ini', 'B']])
  })
})

describe('collectAssets', () => {
  it('maps only referenced, existing assets (deduped)', () => {
    const marks: MarkAsset[] = [
      { id: 'x', role: 'signature', kind: 'draw', png: new Uint8Array([1]), width: 1, height: 1, createdAt: 'd' },
      { id: 'y', role: 'initials', kind: 'type', png: new Uint8Array([2]), width: 1, height: 1, createdAt: 'd' }
    ]
    const assets = collectAssets(
      [P({ assetId: 'x' }), P({ id: 'p2', assetId: 'x' }), P({ id: 'p3', assetId: 'missing' })],
      marks
    )
    // 'x' included once (deduped); 'missing' has no mark; 'y' is unreferenced -> excluded.
    expect([...assets.keys()]).toEqual(['x'])
  })
})
