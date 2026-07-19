import { useCallback, useEffect, useRef, useState } from 'react'
import type { ElementRect } from '../../elements/types'

interface DragState {
  id: string
  startX: number
  startY: number
  width: number
  height: number
  limits: { minX: number; maxX: number; minY: number; maxY: number }
  dx: number
  dy: number
}

export interface ElementDrag {
  offset: { id: string; dx: number; dy: number } | null
  startDrag: (id: string, bbox: ElementRect, clientX: number, clientY: number) => void
}

const COMMIT_THRESHOLD = 0.0005

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

export function useElementDrag(
  containerRef: React.RefObject<HTMLDivElement | null>,
  onMove: ((id: string, dx: number, dy: number) => void) | undefined
): ElementDrag {
  const [drag, setDrag] = useState<DragState | null>(null)
  const dragRef = useRef(drag)
  dragRef.current = drag

  const startDrag = useCallback(
    (id: string, bbox: ElementRect, clientX: number, clientY: number) => {
      if (!onMove) return
      const bounds = containerRef.current?.getBoundingClientRect()
      if (!bounds || bounds.width === 0 || bounds.height === 0) return
      setDrag({
        id,
        startX: clientX,
        startY: clientY,
        width: bounds.width,
        height: bounds.height,
        limits: {
          minX: -bbox.x,
          maxX: 1 - bbox.x - bbox.w,
          minY: -bbox.y,
          maxY: 1 - bbox.y - bbox.h
        },
        dx: 0,
        dy: 0
      })
    },
    [containerRef, onMove]
  )

  const active = drag !== null
  useEffect(() => {
    if (!active) return
    const onPointerMove = (event: PointerEvent): void => {
      setDrag((cur) =>
        cur
          ? {
              ...cur,
              dx: clamp((event.clientX - cur.startX) / cur.width, cur.limits.minX, cur.limits.maxX),
              dy: clamp((event.clientY - cur.startY) / cur.height, cur.limits.minY, cur.limits.maxY)
            }
          : cur
      )
    }
    const onPointerUp = (): void => {
      const cur = dragRef.current
      if (
        cur &&
        onMove &&
        (Math.abs(cur.dx) > COMMIT_THRESHOLD || Math.abs(cur.dy) > COMMIT_THRESHOLD)
      ) {
        onMove(cur.id, cur.dx, cur.dy)
      }
      setDrag(null)
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [active, onMove])

  return { offset: drag ? { id: drag.id, dx: drag.dx, dy: drag.dy } : null, startDrag }
}
