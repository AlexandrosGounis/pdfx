import { flushSync } from 'react-dom'

const FLIP_MS = 320
const FLIP_EASE = 'cubic-bezier(0.2, 0, 0, 1)'

export function flipPages(apply: () => void): void {
  const before = new Map<string, DOMRect>()
  for (const el of document.querySelectorAll<HTMLElement>('[data-page-id]')) {
    const id = el.dataset.pageId
    if (id) before.set(id, el.getBoundingClientRect())
  }
  flushSync(apply)
  for (const el of document.querySelectorAll<HTMLElement>('[data-page-id]')) {
    const id = el.dataset.pageId
    const prev = id ? before.get(id) : undefined
    if (!prev) continue
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || el.offsetWidth === 0) continue
    const scale = rect.width / el.offsetWidth
    const dx = (prev.left - rect.left) / scale
    const dy = (prev.top - rect.top) / scale
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue
    el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
      duration: FLIP_MS,
      easing: FLIP_EASE
    })
  }
}
