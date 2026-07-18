import { BlendMode, rgb } from 'pdf-lib'
import type { PDFPage, RGB } from 'pdf-lib'
import { MARK_COLORS } from '../edit/types'
import type { Mark } from '../edit/types'
import { normalizeRotation, visualRectToUser } from './redact/geometry'

function hexColor(hex: string): RGB {
  const v = parseInt(hex.slice(1), 16)
  return rgb(((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255)
}

export function drawMarks(page: PDFPage, marks: Mark[] | undefined): void {
  if (!marks || marks.length === 0) return
  const box = page.getCropBox()
  const rot = normalizeRotation(page.getRotation().angle)
  for (const mark of marks) {
    const color = hexColor(MARK_COLORS[mark.color])
    for (const r of mark.rects) {
      const user = visualRectToUser(r, box, rot)
      page.drawRectangle({
        x: user.x,
        y: user.y,
        width: user.w,
        height: user.h,
        color,
        blendMode: mark.kind === 'highlight' ? BlendMode.Multiply : BlendMode.Normal
      })
    }
  }
}
