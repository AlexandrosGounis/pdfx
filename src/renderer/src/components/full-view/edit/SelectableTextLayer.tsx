import { useEffect, useRef } from 'react'
import { TextLayer } from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { EditTool, MarkRect } from '../../../edit/types'
import { selectionRects } from '../../../edit/selection'

interface SelectableTextLayerProps {
  pdf: PDFDocumentProxy
  pageNumber: number
  naturalHeight: number
  tool: EditTool
  onSelect: (rects: MarkRect[]) => void
}

export function SelectableTextLayer({
  pdf,
  pageNumber,
  naturalHeight,
  tool,
  onSelect
}: SelectableTextLayerProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)

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
    const onUp = (): void => {
      const container = containerRef.current
      if (!container) return
      const rects = selectionRects(container)
      if (rects.length === 0) return
      onSelect(rects)
      window.getSelection()?.removeAllRanges()
    }
    window.addEventListener('pointerup', onUp)
    return () => window.removeEventListener('pointerup', onUp)
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
