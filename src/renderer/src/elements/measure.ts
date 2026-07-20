import { TEXT_FONT_FAMILY, TEXT_LINE_HEIGHT, TEXT_MARK_PAD, textLines } from './types'
import type { ElementRect, TextElement } from './types'
import { lineMarkRuns, lineSpans } from './text-marks'
import type { MarkRun } from './text-marks'

let cached: CanvasRenderingContext2D | null = null

function context(): CanvasRenderingContext2D {
  if (!cached) {
    const ctx = document.createElement('canvas').getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    cached = ctx
  }
  return cached
}

export function measureLineWidth(line: string, fontSize: number): number {
  const ctx = context()
  ctx.font = `${fontSize}px ${TEXT_FONT_FAMILY}`
  return ctx.measureText(line).width
}

export function nearestCharOffset(line: string, fontSize: number, x: number): number {
  let previous = 0
  for (let i = 1; i <= line.length; i++) {
    const width = measureLineWidth(line.slice(0, i), fontSize)
    if (width >= x) return x - previous <= width - x ? i - 1 : i
    previous = width
  }
  return line.length
}

export function textBlockSize(text: string, fontSize: number): { w: number; h: number } {
  const lines = textLines(text)
  return {
    w: Math.max(...lines.map((line) => measureLineWidth(line, fontSize))),
    h: lines.length * fontSize * TEXT_LINE_HEIGHT
  }
}

export function findMatchRects(
  element: TextElement,
  query: string,
  pageWidth: number,
  pageHeight: number
): ElementRect[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  const lineHeight = element.fontSize * TEXT_LINE_HEIGHT
  const rects: ElementRect[] = []
  for (const line of lineSpans(element.text)) {
    const haystack = line.text.toLowerCase()
    let from = 0
    for (;;) {
      const at = haystack.indexOf(needle, from)
      if (at === -1) break
      const prefix = measureLineWidth(line.text.slice(0, at), element.fontSize)
      const width = measureLineWidth(line.text.slice(at, at + needle.length), element.fontSize)
      rects.push({
        x: element.origin.x + prefix / pageWidth,
        y: element.origin.y + (line.row * lineHeight) / pageHeight,
        w: width / pageWidth,
        h: lineHeight / pageHeight
      })
      from = at + needle.length
    }
  }
  return rects
}

export interface TextMarkRect extends ElementRect {
  kind: MarkRun['kind']
}

export function textMarkRects(
  element: TextElement,
  pageWidth: number,
  pageHeight: number
): TextMarkRect[] {
  const lineHeight = element.fontSize * TEXT_LINE_HEIGHT
  return lineSpans(element.text).flatMap((line) =>
    lineMarkRuns(line, element.marks).map((run) => {
      const prefix = measureLineWidth(line.text.slice(0, run.start - line.start), element.fontSize)
      const width = measureLineWidth(
        line.text.slice(run.start - line.start, run.end - line.start),
        element.fontSize
      )
      return {
        kind: run.kind,
        x: element.origin.x + (prefix - TEXT_MARK_PAD) / pageWidth,
        y: element.origin.y + (line.row * lineHeight) / pageHeight,
        w: (width + TEXT_MARK_PAD * 2) / pageWidth,
        h: lineHeight / pageHeight
      }
    })
  )
}
