import {
  LineCapStyle,
  LineJoinStyle,
  appendBezierCurve,
  lineTo,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  setLineCap,
  setLineJoin,
  setLineWidth,
  setStrokingColor,
  stroke
} from 'pdf-lib'
import type { PDFOperator, PDFPage } from 'pdf-lib'
import type { PageElement } from '../elements/types'
import { smoothPathSegments } from '../elements/geometry'
import { normalizeRotation, visualPointToUser } from './redact/geometry'

interface UserPoint {
  x: number
  y: number
}

function hexColor(hex: string): ReturnType<typeof rgb> {
  const v = parseInt(hex.slice(1), 16)
  return rgb(((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255)
}

function quadToCubic(from: UserPoint, control: UserPoint, to: UserPoint): PDFOperator {
  const c1x = from.x + (2 / 3) * (control.x - from.x)
  const c1y = from.y + (2 / 3) * (control.y - from.y)
  const c2x = to.x + (2 / 3) * (control.x - to.x)
  const c2y = to.y + (2 / 3) * (control.y - to.y)
  return appendBezierCurve(c1x, c1y, c2x, c2y, to.x, to.y)
}

export function drawElements(page: PDFPage, elements: PageElement[] | undefined): void {
  if (!elements || elements.length === 0) return
  const box = page.getCropBox()
  const rot = normalizeRotation(page.getRotation().angle)
  const toUser = (p: { x: number; y: number }): UserPoint =>
    visualPointToUser(p.x, p.y, box, rot)
  const operators: PDFOperator[] = [
    pushGraphicsState(),
    setLineCap(LineCapStyle.Round),
    setLineJoin(LineJoinStyle.Round)
  ]
  for (const element of elements) {
    if (element.points.length < 2) continue
    operators.push(setStrokingColor(hexColor(element.color)))
    operators.push(setLineWidth(element.strokeWidth))
    let current: UserPoint = { x: 0, y: 0 }
    for (const segment of smoothPathSegments(element.points)) {
      const to = toUser(segment.to)
      if (segment.kind === 'move') {
        operators.push(moveTo(to.x, to.y))
      } else if (segment.kind === 'quad') {
        operators.push(quadToCubic(current, toUser(segment.control), to))
      } else {
        operators.push(lineTo(to.x, to.y))
      }
      current = to
    }
    operators.push(stroke())
  }
  operators.push(popGraphicsState())
  page.pushOperators(...operators)
}
