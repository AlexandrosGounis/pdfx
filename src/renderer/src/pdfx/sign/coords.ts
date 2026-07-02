// SPDX-License-Identifier: MIT
export type Rotation = 0 | 90 | 180 | 270

export interface VisualBox {
  /** Page size as displayed (rotation already applied — matches the pdf.js viewport). */
  visualWidth: number
  visualHeight: number
  rotation: Rotation
  /** MediaBox/CropBox lower-left origin offset in points (default 0). */
  cropX?: number
  cropY?: number
}

export interface DrawRect {
  x: number
  y: number
  width: number
  height: number
  rotate: Rotation
}

/**
 * Map a top-left-fraction placement (in the rotation-applied VISUAL space, as the
 * FullView editor sees it) to pdf-lib drawImage/drawText params in UNROTATED PDF user
 * space (bottom-left origin). Pass the result straight into `page.drawImage(img, { x, y,
 * width, height, rotate: degrees(r.rotate) })`.
 */
export function mapPlacementToUserSpace(
  frac: { xFrac: number; yFrac: number; wFrac: number; hFrac: number },
  box: VisualBox
): DrawRect {
  const cropX = box.cropX ?? 0
  const cropY = box.cropY ?? 0
  const w = frac.wFrac * box.visualWidth
  const h = frac.hFrac * box.visualHeight
  const left = frac.xFrac * box.visualWidth
  const top = frac.yFrac * box.visualHeight

  const isQuarter = box.rotation === 90 || box.rotation === 270
  const mediaW = isQuarter ? box.visualHeight : box.visualWidth
  const mediaH = isQuarter ? box.visualWidth : box.visualHeight

  let x: number
  let y: number
  // Anchor = the image's pre-rotation bottom-left corner, mapped from the visual box's
  // bottom-left through the inverse of the page's /Rotate (verified against pdf-lib 1.17.1
  // draw-op order: translate(x,y) -> rotate -> drawObject).
  switch (box.rotation) {
    case 90:
      x = top + h
      y = left
      break
    case 180:
      x = mediaW - left
      y = top + h
      break
    case 270:
      x = mediaW - top - h
      y = mediaH - left
      break
    default: // 0 (and any unexpected angle, clamped to 0 upstream)
      x = left
      y = mediaH - top - h
  }
  return { x: x + cropX, y: y + cropY, width: w, height: h, rotate: box.rotation }
}
