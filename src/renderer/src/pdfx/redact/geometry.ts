import type { MarkRect } from '../../edit/types'

export type Matrix = [number, number, number, number, number, number]

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]

export function multiply(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[1] * b[2],
    a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2],
    a[2] * b[1] + a[3] * b[3],
    a[4] * b[0] + a[5] * b[2] + b[4],
    a[4] * b[1] + a[5] * b[3] + b[5]
  ]
}

export function translation(tx: number, ty: number): Matrix {
  return [1, 0, 0, 1, tx, ty]
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export function quadBounds(m: Matrix, x0: number, y0: number, x1: number, y1: number): Box {
  const xs = [
    m[0] * x0 + m[2] * y0 + m[4],
    m[0] * x1 + m[2] * y0 + m[4],
    m[0] * x0 + m[2] * y1 + m[4],
    m[0] * x1 + m[2] * y1 + m[4]
  ]
  const ys = [
    m[1] * x0 + m[3] * y0 + m[5],
    m[1] * x1 + m[3] * y0 + m[5],
    m[1] * x0 + m[3] * y1 + m[5],
    m[1] * x1 + m[3] * y1 + m[5]
  ]
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

export function intersectionArea(a: Box, b: Box): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return w > 0 && h > 0 ? w * h : 0
}

export function overlapsAny(box: Box, rects: Box[]): boolean {
  return rects.some((r) => intersectionArea(box, r) > 1e-6)
}

export function coveredFraction(box: Box, rects: Box[]): number {
  const area = box.w * box.h
  if (area <= 0) return 0
  let max = 0
  for (const r of rects) max = Math.max(max, intersectionArea(box, r) / area)
  return max
}

export interface CropBox {
  x: number
  y: number
  width: number
  height: number
}

function mapPoint(
  x: number,
  y: number,
  w: number,
  h: number,
  rot: number
): { x: number; y: number } {
  if (rot === 90) return { x: y, y: x }
  if (rot === 180) return { x: w - x, y }
  if (rot === 270) return { x: w - y, y: h - x }
  return { x, y: h - y }
}

export function visualPointToUser(
  nx: number,
  ny: number,
  box: CropBox,
  rot: number
): { x: number; y: number } {
  const sideways = rot === 90 || rot === 270
  const vw = sideways ? box.height : box.width
  const vh = sideways ? box.width : box.height
  const p = mapPoint(nx * vw, ny * vh, box.width, box.height, rot)
  return { x: box.x + p.x, y: box.y + p.y }
}

export function visualRectToUser(r: MarkRect, box: CropBox, rot: number): Box {
  const sideways = rot === 90 || rot === 270
  const vw = sideways ? box.height : box.width
  const vh = sideways ? box.width : box.height
  const a = mapPoint(r.x * vw, r.y * vh, box.width, box.height, rot)
  const b = mapPoint((r.x + r.w) * vw, (r.y + r.h) * vh, box.width, box.height, rot)
  return {
    x: box.x + Math.min(a.x, b.x),
    y: box.y + Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y)
  }
}

export function normalizeRotation(angle: number): number {
  return ((Math.round(angle) % 360) + 360) % 360
}
