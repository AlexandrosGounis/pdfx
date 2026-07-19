import type { ElementPoint, ElementRect } from './types'

export function bboxOfPoints(points: ElementPoint[], padX: number, padY: number): ElementRect {
  let minX = 1
  let minY = 1
  let maxX = 0
  let maxY = 0
  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  const x = Math.max(0, minX - padX)
  const y = Math.max(0, minY - padY)
  return {
    x,
    y,
    w: Math.min(1, maxX + padX) - x,
    h: Math.min(1, maxY + padY) - y
  }
}

export type PathSegment =
  | { kind: 'move'; to: ElementPoint }
  | { kind: 'quad'; control: ElementPoint; to: ElementPoint }
  | { kind: 'line'; to: ElementPoint }

export function smoothPathSegments(points: ElementPoint[]): PathSegment[] {
  if (points.length === 0) return []
  const segments: PathSegment[] = [{ kind: 'move', to: points[0] }]
  if (points.length === 1) {
    segments.push({ kind: 'line', to: points[0] })
    return segments
  }
  for (let i = 1; i < points.length - 1; i++) {
    const mid = {
      x: (points[i].x + points[i + 1].x) / 2,
      y: (points[i].y + points[i + 1].y) / 2
    }
    segments.push({ kind: 'quad', control: points[i], to: mid })
  }
  segments.push({ kind: 'line', to: points[points.length - 1] })
  return segments
}

export function smoothPathData(points: ElementPoint[], width: number, height: number): string {
  const at = (p: ElementPoint): string => `${round(p.x * width)} ${round(p.y * height)}`
  return smoothPathSegments(points)
    .map((segment) =>
      segment.kind === 'move'
        ? `M ${at(segment.to)}`
        : segment.kind === 'quad'
          ? `Q ${at(segment.control)} ${at(segment.to)}`
          : `L ${at(segment.to)}`
    )
    .join(' ')
}

export function smoothPoints(points: ElementPoint[]): ElementPoint[] {
  if (points.length < 3) return points
  const smoothed: ElementPoint[] = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    smoothed.push({
      x: points[i - 1].x * 0.25 + points[i].x * 0.5 + points[i + 1].x * 0.25,
      y: points[i - 1].y * 0.25 + points[i].y * 0.5 + points[i + 1].y * 0.25
    })
  }
  smoothed.push(points[points.length - 1])
  return smoothed
}

export function thinPoints(points: ElementPoint[], minDistance: number): ElementPoint[] {
  if (points.length <= 2) return points
  const kept: ElementPoint[] = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const last = kept[kept.length - 1]
    const dx = points[i].x - last.x
    const dy = points[i].y - last.y
    if (Math.hypot(dx, dy) >= minDistance) kept.push(points[i])
  }
  kept.push(points[points.length - 1])
  return kept
}

const round = (value: number): number => Math.round(value * 100) / 100
