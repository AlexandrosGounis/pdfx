import { useEffect, useRef, useState } from 'react'
import { TextLayer } from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'

interface TextLayerHighlightProps {
  pdf: PDFDocumentProxy
  pageNumber: number
  naturalHeight: number
  query: string
}

function paint(div: HTMLElement, needle: string): void {
  const text = div.dataset.text ?? (div.dataset.text = div.textContent ?? '')
  const at = needle ? text.toLowerCase().indexOf(needle) : -1
  if (at === -1) {
    if (div.childElementCount > 0) div.textContent = text
    return
  }
  const fragment = document.createDocumentFragment()
  let cursor = 0
  for (let from = at; from !== -1; from = text.toLowerCase().indexOf(needle, cursor)) {
    if (from > cursor) fragment.append(text.slice(cursor, from))
    const hit = document.createElement('span')
    hit.className = 'find-hit'
    hit.textContent = text.slice(from, from + needle.length)
    fragment.append(hit)
    cursor = from + needle.length
  }
  if (cursor < text.length) fragment.append(text.slice(cursor))
  div.replaceChildren(fragment)
}

export function TextLayerHighlight({
  pdf,
  pageNumber,
  naturalHeight,
  query
}: TextLayerHighlightProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const divsRef = useRef<HTMLElement[]>([])
  const [built, setBuilt] = useState(0)

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
      if (cancelled) return
      divsRef.current = layer.textDivs
      setBuilt((n) => n + 1)
    }

    const observer = new ResizeObserver(() => void build())
    observer.observe(container)

    return () => {
      cancelled = true
      observer.disconnect()
      layer?.cancel()
      container.replaceChildren()
      divsRef.current = []
    }
  }, [pdf, pageNumber, naturalHeight])

  useEffect(() => {
    const needle = query.trim().toLowerCase()
    for (const div of divsRef.current) paint(div, needle)
  }, [query, built])

  return <div ref={containerRef} className="find-layer" aria-hidden="true" />
}
