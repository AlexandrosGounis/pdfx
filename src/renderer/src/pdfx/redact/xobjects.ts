import { IDENTITY, multiply, overlapsAny, quadBounds } from './geometry'
import type { Box, Matrix } from './geometry'

export interface XObjectInfo {
  kind: 'image' | 'form' | 'other'
  bbox?: [number, number, number, number]
  matrix?: Matrix
}

export function xobjectFailure(
  info: XObjectInfo | undefined,
  name: string,
  ctm: Matrix,
  rects: Box[]
): string | null {
  if (!info) return `unknown xobject /${name}`
  let device: Box
  if (info.kind === 'image') {
    device = quadBounds(ctm, 0, 0, 1, 1)
  } else if (info.kind === 'form' && info.bbox) {
    const placed = multiply(info.matrix ?? IDENTITY, ctm)
    device = quadBounds(placed, info.bbox[0], info.bbox[1], info.bbox[2], info.bbox[3])
  } else {
    return `xobject /${name} has no usable bbox`
  }
  return overlapsAny(device, rects) ? `${info.kind} xobject overlaps redaction` : null
}

export function inlineImageFailure(ctm: Matrix, rects: Box[]): string | null {
  return overlapsAny(quadBounds(ctm, 0, 0, 1, 1), rects) ? 'inline image overlaps redaction' : null
}
