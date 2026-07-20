import {
  LineCapStyle,
  LineJoinStyle,
  appendBezierCurve,
  lineTo,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
  setLineCap,
  setLineJoin,
  setLineWidth,
  setStrokingColor,
  stroke
} from 'pdf-lib'
import type { PDFOperator, PDFPage } from 'pdf-lib'
import type { InkElement } from '../../elements/types'
import { smoothPathSegments } from '../../elements/geometry'
import { normalizeRotation, visualPointToUser } from '../redact/geometry'
import { hexColor } from './color'

interface UserPoint {
  x: number
  y: number
}

function quadToCubic(from: UserPoint, control: UserPoint, to: UserPoint): PDFOperator {
  const c1x = from.x + (2 / 3) * (control.x - from.x)
  const c1y = from.y + (2 / 3) * (control.y - from.y)
  const c2x = to.x + (2 / 3) * (control.x - to.x)
  const c2y = to.y + (2 / 3) * (control.y - to.y)
  return appendBezierCurve(c1x, c1y, c2x, c2y, to.x, to.y)
}

export function drawInkElements(page: PDFPage, elements: InkElement[]): void {
  if (elements.length === 0) return
  const box = page.getCropBox()
  const rot = normalizeRotation(page.getRotation().angle)
  const toUser = (p: { x: number; y: number }): UserPoint => visualPointToUser(p.x, p.y, box, rot)
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
