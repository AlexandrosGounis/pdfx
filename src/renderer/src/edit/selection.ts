import type { MarkRect } from './types'

const LINE_OVERLAP = 0.5
const JOIN_GAP = 0.005
const TOGGLE_OVERLAP = 0.3

function sameLine(a: MarkRect, b: MarkRect): boolean {
  const overlap = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return overlap >= LINE_OVERLAP * Math.min(a.h, b.h)
}

function union(a: MarkRect, b: MarkRect): MarkRect {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return {
    x,
    y,
    w: Math.max(a.x + a.w, b.x + b.w) - x,
    h: Math.max(a.y + a.h, b.y + b.h) - y
  }
}

function mergeLines(rects: MarkRect[]): MarkRect[] {
  const sorted = [...rects].sort((a, b) => a.y - b.y || a.x - b.x)
  const merged: MarkRect[] = []
  for (const rect of sorted) {
    const target = merged.find(
      (m) =>
        sameLine(m, rect) && rect.x <= m.x + m.w + JOIN_GAP && m.x <= rect.x + rect.w + JOIN_GAP
    )
    if (target) Object.assign(target, union(target, rect))
    else merged.push({ ...rect })
  }
  return merged
}

export function rectsOverlap(a: MarkRect, b: MarkRect): boolean {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  if (w <= 0 || h <= 0) return false
  return w * h >= TOGGLE_OVERLAP * Math.min(a.w * a.h, b.w * b.h)
}

export function selectionRects(container: HTMLElement): MarkRect[] {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return []
  const bounds = container.getBoundingClientRect()
  if (bounds.width === 0 || bounds.height === 0) return []
  const rects: MarkRect[] = []
  for (let i = 0; i < selection.rangeCount; i++) {
    for (const r of selection.getRangeAt(i).getClientRects()) {
      const left = Math.max(r.left, bounds.left)
      const top = Math.max(r.top, bounds.top)
      const right = Math.min(r.right, bounds.right)
      const bottom = Math.min(r.bottom, bounds.bottom)
      if (right - left < 1 || bottom - top < 1) continue
      rects.push({
        x: (left - bounds.left) / bounds.width,
        y: (top - bounds.top) / bounds.height,
        w: (right - left) / bounds.width,
        h: (bottom - top) / bounds.height
      })
    }
  }
  return mergeLines(rects)
}
