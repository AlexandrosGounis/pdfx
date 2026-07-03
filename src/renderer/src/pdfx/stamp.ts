// SPDX-License-Identifier: MIT
import { degrees, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib'
import { mapPlacementToUserSpace, type Rotation, type VisualBox } from './sign/coords'
import { isTextPlacement } from './sign/text-placement'
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

export interface StampSkip {
  placementId: string
  reason: 'no_asset_id' | 'missing_asset' | 'embed_failed' | 'missing_font' | 'missing_text'
}

/**
 * Draw each placement onto `page`. Image marks (signature/initials) are embedded once per
 * asset id via `embedCache`; `date` marks are drawn as text (requires `font`).
 *
 * Never throws on a bad/missing asset — placements that can't be rendered are recorded in the
 * returned `StampSkip[]` instead so callers can surface them without aborting the export.
 */
export async function stampPage(
  page: PDFPage,
  placements: Placement[],
  assets: StampAssets,
  embedCache: Map<string, PDFImage>,
  font?: PDFFont
): Promise<StampSkip[]> {
  const skipped: StampSkip[] = []
  if (placements.length === 0) return skipped
  const box = visualBox(page)
  const doc = page.doc

  for (const p of placements) {
    const rect = mapPlacementToUserSpace(p, box)
    if (isTextPlacement(p)) {
      if (!font) {
        skipped.push({ placementId: p.id, reason: 'missing_font' })
        continue
      }
      if (!p.text) {
        skipped.push({ placementId: p.id, reason: 'missing_text' })
        continue
      }
      page.drawText(p.text, {
        x: rect.x,
        y: rect.y,
        size: rect.height,
        font,
        rotate: degrees(rect.rotate)
      })
      continue
    }
    // image mark: an inline png (e.g. a rasterized date) or a library asset (signature / initials)
    let img: PDFImage | undefined
    if (p.png) {
      img = embedCache.get(p.id)
      if (!img) {
        try {
          img = await doc.embedPng(p.png)
        } catch {
          skipped.push({ placementId: p.id, reason: 'embed_failed' })
          continue
        }
        embedCache.set(p.id, img)
      }
    } else {
      if (!p.assetId) {
        skipped.push({ placementId: p.id, reason: 'no_asset_id' })
        continue
      }
      const asset = assets.get(p.assetId)
      if (!asset) {
        skipped.push({ placementId: p.id, reason: 'missing_asset' })
        continue
      }
      img = embedCache.get(p.assetId)
      if (!img) {
        try {
          img = await doc.embedPng(asset.png)
        } catch {
          skipped.push({ placementId: p.id, reason: 'embed_failed' })
          continue
        }
        embedCache.set(p.assetId, img)
      }
    }
    page.drawImage(img, {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      rotate: degrees(rect.rotate)
    })
  }
  return skipped
}
