import { BlendMode, degrees } from 'pdf-lib'
import type { PDFFont, PDFPage } from 'pdf-lib'
import { DEFAULT_MARK_COLORS, MARK_COLORS } from '../../edit/types'
import { TEXT_BASELINE, TEXT_LINE_HEIGHT, TEXT_MARK_PAD } from '../../elements/types'
import type { TextElement } from '../../elements/types'
import { lineMarkRuns, lineSpans, visibleSpans } from '../../elements/text-marks'
import { normalizeRotation, visualPointToUser, visualRectToUser } from '../redact/geometry'
import { hexColor } from './color'

function encodableText(text: string, font: PDFFont): string {
  const charset = new Set(font.getCharacterSet())
  const swapped = text
    .split('')
    .map((ch) => (ch === '\n' || charset.has(ch.codePointAt(0) as number) ? ch : ' '))
    .join('')
  if (swapped !== text) {
    console.warn('[pdfx] replaced characters unsupported by the export font')
  }
  return swapped
}

export function drawTextElement(page: PDFPage, element: TextElement, font: PDFFont): void {
  const box = page.getCropBox()
  const rot = normalizeRotation(page.getRotation().angle)
  const sideways = rot === 90 || rot === 270
  const vw = sideways ? box.height : box.width
  const vh = sideways ? box.width : box.height
  const size = element.fontSize
  const lineHeight = size * TEXT_LINE_HEIGHT
  const originX = element.origin.x * vw
  const originY = element.origin.y * vh
  const text = encodableText(element.text, font)
  const measure = (from: number, to: number): number =>
    from < to ? font.widthOfTextAtSize(text.slice(from, to), size) : 0
  const textColor = hexColor(element.color)

  for (const line of lineSpans(text)) {
    const top = originY + line.row * lineHeight
    const runs = lineMarkRuns(line, element.marks)
    for (const run of runs) {
      const left = originX + measure(line.start, run.start)
      const user = visualRectToUser(
        {
          x: (left - TEXT_MARK_PAD) / vw,
          y: top / vh,
          w: (measure(run.start, run.end) + TEXT_MARK_PAD * 2) / vw,
          h: lineHeight / vh
        },
        box,
        rot
      )
      page.drawRectangle({
        x: user.x,
        y: user.y,
        width: user.w,
        height: user.h,
        color: hexColor(MARK_COLORS[DEFAULT_MARK_COLORS[run.kind]]),
        blendMode: run.kind === 'highlight' ? BlendMode.Multiply : BlendMode.Normal
      })
    }
    const baseline = top + TEXT_BASELINE * size
    for (const span of visibleSpans(line, runs)) {
      const value = text.slice(span.start, span.end)
      if (value.trim().length === 0) continue
      const left = originX + measure(line.start, span.start)
      const position = visualPointToUser(left / vw, baseline / vh, box, rot)
      page.drawText(value, {
        x: position.x,
        y: position.y,
        size,
        font,
        color: textColor,
        rotate: degrees(rot)
      })
    }
  }
}
