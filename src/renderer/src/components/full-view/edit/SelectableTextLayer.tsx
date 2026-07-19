import { useEffect, useRef } from 'react'
import { TextLayer } from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { MarkKind, MarkRect } from '../../../edit/types'
import { selectionRects } from '../../../edit/selection'

interface SelectableTextLayerProps {
  pdf: PDFDocumentProxy
  pageNumber: number
  naturalHeight: number
  tool: MarkKind
  onSelect: (rects: MarkRect[], drag: MarkRect | null) => void
}

interface Point {
  x: number
  y: number
}

function dragRect(container: HTMLElement, start: Point, end: Point): MarkRect | null {
  const bounds = container.getBoundingClientRect()
  if (bounds.width === 0 || bounds.height === 0) return null
  const clamp = (v: number): number => Math.min(1, Math.max(0, v))
  const x1 = clamp((Math.min(start.x, end.x) - bounds.left) / bounds.width)
  const x2 = clamp((Math.max(start.x, end.x) - bounds.left) / bounds.width)
  const y1 = clamp((Math.min(start.y, end.y) - bounds.top) / bounds.height)
  const y2 = clamp((Math.max(start.y, end.y) - bounds.top) / bounds.height)
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
}

export function SelectableTextLayer({
  pdf,
  pageNumber,
  naturalHeight,
  tool,
  onSelect
}: SelectableTextLayerProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<Point | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    let layer: TextLayer | null = null
    let builtHeight = 0

    const build = async (): Promise<void> => {
      const height = container.clientHeight
      if (height === 0 || height === builtHeight) return
      builtHeight = height
      const scale = height / naturalHeight
      const page = await pdf.getPage(pageNumber)
      if (cancelled) return
      const textContent = await page.getTextContent({ includeMarkedContent: false })
      if (cancelled) return
      layer?.cancel()
      container.replaceChildren()
      container.style.setProperty('--total-scale-factor', String(scale))
      layer = new TextLayer({
        textContentSource: textContent,
        container,
        viewport: page.getViewport({ scale })
      })
      await layer.render()
    }

    const observer = new ResizeObserver(() => void build())
    observer.observe(container)

    return () => {
      cancelled = true
      observer.disconnect()
      layer?.cancel()
      container.replaceChildren()
    }
  }, [pdf, pageNumber, naturalHeight])

  useEffect(() => {
    const onDown = (event: PointerEvent): void => {
      const container = containerRef.current
      if (!container) return
      const page = container.closest('.full-page')
      dragStartRef.current =
        page && event.target instanceof Node && page.contains(event.target)
          ? { x: event.clientX, y: event.clientY }
          : null
    }
    const onUp = (event: PointerEvent): void => {
      const container = containerRef.current
      if (!container) return
      const start = dragStartRef.current
      dragStartRef.current = null
      const rects = selectionRects(container)
      const drag = start ? dragRect(container, start, { x: event.clientX, y: event.clientY }) : null
      if (rects.length === 0 && !drag) return
      onSelect(rects, drag)
      if (rects.length > 0) window.getSelection()?.removeAllRanges()
    }
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('pointerup', onUp)
    }
  }, [onSelect])

  return (
    <div
      ref={containerRef}
      className={`find-layer edit-select-layer ${tool}`}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    />
  )
}
