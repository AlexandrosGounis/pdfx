// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { buildPdf } from './build'
import type { ExportPage } from './format'
import type { MarkAsset, StampAssets } from './sign/types'

// Strictly-validated 1x1 opaque-black PNG (CRCs + clean inflate verified in review).
const PNG_1x1 = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg=='
  ),
  (c) => c.charCodeAt(0)
)

async function onePagePdfBytes(): Promise<Uint8Array> {
  const d = await PDFDocument.create()
  d.addPage([200, 100])
  return d.save()
}

describe('buildPdf with placements', () => {
  it('stamps a placement and yields a larger PDF than the un-stamped build', async () => {
    const bytes = await onePagePdfBytes()
    const plain: ExportPage[] = [{ bytes, sourceKey: 's', pageIndex: 0 }]
    const stamped: ExportPage[] = [
      {
        bytes,
        sourceKey: 's',
        pageIndex: 0,
        placements: [
          {
            id: 'p1',
            pageId: 'a',
            kind: 'signature',
            xFrac: 0.1,
            yFrac: 0.1,
            wFrac: 0.3,
            hFrac: 0.2,
            assetId: 'sig-1'
          }
        ]
      }
    ]
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

    const plainOut = await buildPdf(plain)
    const stampedOut = await buildPdf(stamped, assets)
    expect(stampedOut.length).toBeGreaterThan(plainOut.length)

    // Still a valid, loadable single-page PDF.
    const reloaded = await PDFDocument.load(stampedOut)
    expect(reloaded.getPageCount()).toBe(1)
  })
})
