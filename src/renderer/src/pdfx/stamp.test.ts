// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { stampPage } from './stamp'
import type { MarkAsset, Placement, StampAssets } from './sign/types'

// A minimal valid 1x1 PNG (opaque black), base64-decoded.
// Strictly-validated 1x1 opaque-black PNG (CRCs + clean inflate verified in review).
const PNG_1x1 = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg=='
  ),
  (c) => c.charCodeAt(0)
)

describe('stampPage', () => {
  it('embeds a signature image and increases the saved PDF size', async () => {
    const doc = await PDFDocument.create()
    const page = doc.addPage([200, 100])
    const before = (await doc.save()).length

    const asset: MarkAsset = {
      id: 'sig-1',
      role: 'signature',
      kind: 'draw',
      png: PNG_1x1,
      width: 1,
      height: 1,
      createdAt: '2026-07-02'
    }
    const assets: StampAssets = new Map([[asset.id, asset]])
    const placements: Placement[] = [
      {
        id: 'p1',
        pageId: 'page-a',
        kind: 'signature',
        xFrac: 0.1,
        yFrac: 0.1,
        wFrac: 0.3,
        hFrac: 0.2,
        assetId: 'sig-1'
      }
    ]

    await stampPage(page, placements, assets, new Map())
    const after = (await doc.save()).length
    expect(after).toBeGreaterThan(before)
  })

  it('is a no-op for an empty placement list', async () => {
    const doc = await PDFDocument.create()
    const page = doc.addPage([200, 100])
    await expect(stampPage(page, [], new Map(), new Map())).resolves.toEqual([])
  })

  it('reports a skip instead of throwing when a placement references an unknown assetId', async () => {
    const doc = await PDFDocument.create()
    const page = doc.addPage([200, 100])

    const assets: StampAssets = new Map() // does not contain 'sig-missing'
    const placements: Placement[] = [
      {
        id: 'p-missing',
        pageId: 'page-a',
        kind: 'signature',
        xFrac: 0.1,
        yFrac: 0.1,
        wFrac: 0.3,
        hFrac: 0.2,
        assetId: 'sig-missing'
      }
    ]

    await expect(stampPage(page, placements, assets, new Map())).resolves.toEqual([
      { placementId: 'p-missing', reason: 'missing_asset' }
    ])
  })

  it('reports a skip instead of throwing when the asset png bytes fail to embed', async () => {
    const doc = await PDFDocument.create()
    const page = doc.addPage([200, 100])

    const asset: MarkAsset = {
      id: 'sig-bad',
      role: 'signature',
      kind: 'draw',
      png: new Uint8Array([1, 2, 3]),
      width: 1,
      height: 1,
      createdAt: '2026-07-02'
    }
    const assets: StampAssets = new Map([[asset.id, asset]])
    const placements: Placement[] = [
      {
        id: 'p-bad',
        pageId: 'page-a',
        kind: 'signature',
        xFrac: 0.1,
        yFrac: 0.1,
        wFrac: 0.3,
        hFrac: 0.2,
        assetId: 'sig-bad'
      }
    ]

    await expect(stampPage(page, placements, assets, new Map())).resolves.toEqual([
      { placementId: 'p-bad', reason: 'embed_failed' }
    ])
  })
})
