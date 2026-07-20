import { useCallback } from 'react'
import type { DocEntry } from '../../types'
import type { View } from './geometry'
import {
  clamp,
  EDIT_PAN_ALLOWANCE,
  fitInto,
  flipTo,
  MAX_ZOOM,
  MIN_ZOOM,
  TRANSITION_MS
} from './geometry'

interface ControlsOptions {
  scrollRef: React.RefObject<HTMLDivElement | null>
  closingRef: React.MutableRefObject<boolean>
  editingRef: React.MutableRefObject<boolean>
  docsRef: React.MutableRefObject<DocEntry[]>
  vpRef: React.MutableRefObject<{ w: number; h: number }>
  curRef: React.MutableRefObject<{ di: number; pi: number }>
  phaseRef: React.MutableRefObject<'opening' | 'open' | 'closing'>
  setView: React.Dispatch<React.SetStateAction<View>>
  setPhase: (phase: 'opening' | 'open' | 'closing') => void
  setFlip: (flip: string | null) => void
  setFlipTransition: (on: boolean) => void
  setRevealed: (on: boolean) => void
  onClose: () => void
}

export interface FullViewControls {
  resetView: () => void
  applyZoom: (nextZoom: (z: number) => number, focal?: { x: number; y: number }) => void
  panBy: (dx: number, dy: number) => void
  navByKey: (axis: 'x' | 'y', dir: 1 | -1) => void
  runClose: () => void
}

export function useFullViewControls(opts: ControlsOptions): FullViewControls {
  const { scrollRef, closingRef, editingRef, docsRef, vpRef, curRef, phaseRef } = opts
  const { setView, setPhase, setFlip, setFlipTransition, setRevealed, onClose } = opts

  const resetView = useCallback(() => setView({ zoom: 1, x: 0, y: 0 }), [])

  const applyZoom = useCallback(
    (nextZoom: (z: number) => number, focal?: { x: number; y: number }) => {
      setView((v) => {
        const nz = clamp(nextZoom(v.zoom), MIN_ZOOM, MAX_ZOOM)
        if (nz === v.zoom) return v
        const vp = vpRef.current
        const { di: cdi, pi: cpi } = curRef.current
        const p = docsRef.current[cdi].pages[cpi]
        const b = fitInto(p.width, p.height, vp)
        const r = nz / v.zoom
        const cx = focal ? focal.x : vp.w / 2
        const cy = focal ? focal.y : vp.h / 2
        const dx = cx - vp.w / 2
        const dy = cy - vp.h / 2
        const maxX = Math.max(0, (b.w * nz - vp.w) / 2)
        const maxY = Math.max(0, (b.h * nz - vp.h) / 2)
        const allowY = editingRef.current ? EDIT_PAN_ALLOWANCE : 0
        return {
          zoom: nz,
          x: clamp(dx * (1 - r) + r * v.x, -maxX, maxX),
          y: clamp(dy * (1 - r) + r * v.y, -maxY, maxY + allowY)
        }
      })
    },
    []
  )

  const panBy = useCallback((dx: number, dy: number) => {
    const vp = vpRef.current
    const { di: cdi, pi: cpi } = curRef.current
    const p = docsRef.current[cdi].pages[cpi]
    const b = fitInto(p.width, p.height, vp)
    setView((v) => {
      const maxX = Math.max(0, (b.w * v.zoom - vp.w) / 2)
      const maxY = Math.max(0, (b.h * v.zoom - vp.h) / 2)
      const allowY = editingRef.current ? EDIT_PAN_ALLOWANCE : 0
      return { ...v, x: clamp(v.x + dx, -maxX, maxX), y: clamp(v.y + dy, -maxY, maxY + allowY) }
    })
  }, [])

  const navByKey = useCallback((axis: 'x' | 'y', dir: 1 | -1) => {
    const sc = scrollRef.current
    if (!sc) return
    const { di: cdi, pi: cpi } = curRef.current
    if (axis === 'x') {
      const docEl = sc.children[cdi] as HTMLElement | undefined
      if (!docEl) return
      const target = clamp(cpi + dir, 0, docsRef.current[cdi].pages.length - 1)
      const slide = docEl.children[target] as HTMLElement | undefined
      if (slide) docEl.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' })
    } else {
      const target = clamp(cdi + dir, 0, docsRef.current.length - 1)
      const docEl = sc.children[target] as HTMLElement | undefined
      if (docEl) sc.scrollTo({ top: docEl.offsetTop, behavior: 'smooth' })
    }
  }, [])

  const runClose = useCallback(() => {
    if (closingRef.current || phaseRef.current !== 'open') return
    closingRef.current = true
    const { di: cdi, pi: cpi } = curRef.current
    const p = docsRef.current[cdi].pages[cpi]
    const el = document.querySelector(`[data-page-id="${CSS.escape(p.id)}"]`)
    const r = el?.getBoundingClientRect()
    if (!r || r.width === 0) {
      onClose()
      return
    }
    const vp = vpRef.current
    const target = flipTo(fitInto(p.width, p.height, vp), vp, r)
    setView({ zoom: 1, x: 0, y: 0 })
    setPhase('closing')
    setFlip(null)
    setFlipTransition(false)
    requestAnimationFrame(() => {
      setFlip(target)
      setFlipTransition(true)
      setRevealed(false)
    })
    window.setTimeout(onClose, TRANSITION_MS + 20)
  }, [onClose])

  return { resetView, applyZoom, panBy, navByKey, runClose }
}
