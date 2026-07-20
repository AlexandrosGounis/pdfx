import { INK_COLOR, INK_STROKE_WIDTH, TEXT_COLOR, TEXT_FONT_SIZE } from './types'
import type { ElementPoint, ElementRect, InkElement, TextElement } from './types'
import { bboxOfPoints, refineInkPoints } from './geometry'
import { clipMarks } from './text-marks'
import { textBlockSize } from './measure'

const BBOX_PAD_POINTS = 9

export function createInkElement(
  points: ElementPoint[],
  number: number,
  pageWidth: number,
  pageHeight: number
): InkElement | null {
  if (points.length < 2) return null
  const thinned = refineInkPoints(points)
  return {
    id: crypto.randomUUID(),
    kind: 'ink',
    number,
    color: INK_COLOR,
    strokeWidth: INK_STROKE_WIDTH,
    points: thinned,
    bbox: bboxOfPoints(thinned, BBOX_PAD_POINTS / pageWidth, BBOX_PAD_POINTS / pageHeight)
  }
}

function textBbox(
  text: string,
  origin: ElementPoint,
  fontSize: number,
  pageWidth: number,
  pageHeight: number
): ElementRect {
  const size = textBlockSize(text, fontSize)
  const corners = [origin, { x: origin.x + size.w / pageWidth, y: origin.y + size.h / pageHeight }]
  return bboxOfPoints(corners, BBOX_PAD_POINTS / pageWidth, BBOX_PAD_POINTS / pageHeight)
}

export function createTextElement(
  text: string,
  origin: ElementPoint,
  number: number,
  pageWidth: number,
  pageHeight: number
): TextElement | null {
  if (text.trim().length === 0) return null
  return {
    id: crypto.randomUUID(),
    kind: 'text',
    number,
    color: TEXT_COLOR,
    fontSize: TEXT_FONT_SIZE,
    text,
    origin,
    marks: [],
    bbox: textBbox(text, origin, TEXT_FONT_SIZE, pageWidth, pageHeight)
  }
}

export function editedTextElement(
  element: TextElement,
  text: string,
  pageWidth: number,
  pageHeight: number
): TextElement {
  return {
    ...element,
    text,
    marks: clipMarks(element.marks, text.length),
    bbox: textBbox(text, element.origin, element.fontSize, pageWidth, pageHeight)
  }
}
