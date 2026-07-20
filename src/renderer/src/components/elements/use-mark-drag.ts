import { useCallback, useEffect, useRef, useState } from 'react'
import { TEXT_LINE_HEIGHT } from '../../elements/types'
import type { TextElement } from '../../elements/types'
import { lineSpanAt, lineSpans, wordSpanAt } from '../../elements/text-marks'
import type { TextSpan } from '../../elements/text-marks'
import { nearestCharOffset } from '../../elements/measure'

interface MarkDragState {
  element: TextElement
  anchor: TextSpan
  span: TextSpan
}

export interface MarkPreview {
  elementId: string
  span: TextSpan
}

export interface MarkDrag {
  markPreview: MarkPreview | null
  startMarkDrag: (element: TextElement, clientX: number, clientY: number, detail: number) => void
}

export function useMarkDrag(
  containerRef: React.RefObject<HTMLDivElement | null>,
  naturalWidth: number,
  naturalHeight: number,
  onMarkText: ((id: string, span: TextSpan) => void) | undefined
): MarkDrag {
  const [drag, setDrag] = useState<MarkDragState | null>(null)
  const dragRef = useRef(drag)
  dragRef.current = drag

  const charAt = (element: TextElement, clientX: number, clientY: number): number => {
    const bounds = containerRef.current?.getBoundingClientRect()
    if (!bounds || bounds.width === 0 || bounds.height === 0) return 0
    const px = ((clientX - bounds.left) / bounds.width) * naturalWidth
    const py = ((clientY - bounds.top) / bounds.height) * naturalHeight
    const lines = lineSpans(element.text)
    const lineHeight = element.fontSize * TEXT_LINE_HEIGHT
    const row = Math.min(
      lines.length - 1,
      Math.max(0, Math.floor((py - element.origin.y * naturalHeight) / lineHeight))
    )
    const line = lines[row]
    const local = px - element.origin.x * naturalWidth
    return line.start + nearestCharOffset(line.text, element.fontSize, local)
  }
  const charAtRef = useRef(charAt)
  charAtRef.current = charAt

  const startMarkDrag = useCallback(
    (element: TextElement, clientX: number, clientY: number, detail: number): void => {
      const index = charAtRef.current(element, clientX, clientY)
      const anchor =
        detail >= 3
          ? lineSpanAt(element.text, index)
          : detail === 2
            ? wordSpanAt(element.text, index)
            : { start: index, end: index }
      setDrag({ element, anchor, span: anchor })
    },
    []
  )

  const active = drag !== null
  useEffect(() => {
    if (!active) return
    const onPointerMove = (event: PointerEvent): void => {
      setDrag((cur) => {
        if (!cur) return cur
        const focus = charAtRef.current(cur.element, event.clientX, event.clientY)
        return {
          ...cur,
          span: {
            start: Math.min(cur.anchor.start, focus),
            end: Math.max(cur.anchor.end, focus)
          }
        }
      })
    }
    const onPointerUp = (): void => {
      const cur = dragRef.current
      if (cur && onMarkText && cur.span.end > cur.span.start) {
        onMarkText(cur.element.id, cur.span)
      }
      setDrag(null)
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [active, onMarkText])

  return {
    markPreview:
      drag && drag.span.end > drag.span.start
        ? { elementId: drag.element.id, span: drag.span }
        : null,
    startMarkDrag
  }
}
