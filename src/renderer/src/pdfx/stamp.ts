// SPDX-License-Identifier: MIT
import { degrees, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib'
import { mapPlacementToUserSpace, type Rotation, type VisualBox } from './sign/coords'
import type { Placement, StampAssets } from './sign/types'

function normalizeRotation(angle: number): Rotation {
  const a = ((angle % 360) + 360) % 360
  return (a === 90 || a === 180 || a === 270 ? a : 0) as Rotation
}

function visualBox(page: PDFPage): VisualBox {
  // Placement fractions come from the pdf.js viewport, which is CropBox-based (source.ts).
  // Use CropBox for BOTH the dimensions and the origin offset so cropped pages map correctly.
  const crop = page.getCropBox()
  const rotation = normalizeRotation(page.getRotation().angle)
  const isQuarter = rotation === 90 || rotation === 270
  return {
    visualWidth: isQuarter ? crop.height : crop.width,
    visualHeight: isQuarter ? crop.width : crop.height,
    rotation,
    cropX: crop.x,
    cropY: crop.y
  }
}

/**
 * Draw each placement onto `page`. Image marks (signature/initials) are embedded once per
 * asset id via `embedCache`; `date` marks are drawn as text (requires `font`).
 */
export async function stampPage(
  page: PDFPage,
  placements: Placement[],
  assets: StampAssets,
  embedCache: Map<string, PDFImage>,
  font?: PDFFont
): Promise<void> {
  if (placements.length === 0) return
  const box = visualBox(page)
  const doc = page.doc

  for (const p of placements) {
    const rect = mapPlacementToUserSpace(p, box)
    if (p.kind === 'date' || (p.kind === 'initials' && !p.assetId)) {
      if (!font || !p.text) continue
      page.drawText(p.text, {
        x: rect.x,
        y: rect.y,
        size: rect.height,
        font,
        rotate: degrees(rect.rotate)
      })
      continue
    }
    // image mark (signature / initials)
    if (!p.assetId) continue
    const asset = assets.get(p.assetId)
    if (!asset) continue // missing asset — skip (caller surfaces a toast)
    let img = embedCache.get(p.assetId)
    if (!img) {
      img = await doc.embedPng(asset.png)
      embedCache.set(p.assetId, img)
    }
    page.drawImage(img, {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      rotate: degrees(rect.rotate)
    })
  }
}
