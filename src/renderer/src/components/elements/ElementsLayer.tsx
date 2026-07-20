import { useRef, useState } from 'react'
import type { MarkKind } from '../../edit/types'
import type { PageElement, TextElement } from '../../elements/types'
import type { TextSpan } from '../../elements/text-marks'
import { ElementNode } from './ElementNode'
import { ElementDecorations } from './ElementDecorations'
import { ElementPill } from './ElementPill'
import { EditTextLayer } from './EditTextLayer'
import { useElementDrag } from './use-element-drag'
import { useMarkDrag } from './use-mark-drag'

interface ElementsLayerProps {
  elements: PageElement[]
  naturalWidth: number
  naturalHeight: number
  interactive: boolean
  aboveDraw?: boolean
  zoomScale?: number
  selectedId: string | null
  markTool?: MarkKind | null
  onSelect: (id: string | null) => void
  onMove?: (id: string, dx: number, dy: number) => void
  onMarkText?: (id: string, span: TextSpan) => void
  onUpdateText?: (id: string, text: string) => void
}

const textElements = (list: PageElement[]): TextElement[] =>
  list.filter((e): e is TextElement => e.kind === 'text')

export function ElementsLayer({
  elements,
  naturalWidth,
  naturalHeight,
  interactive,
  aboveDraw = false,
  zoomScale = 1,
  selectedId,
  markTool = null,
  onSelect,
  onMove,
  onMarkText,
  onUpdateText
}: ElementsLayerProps): React.JSX.Element | null {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { offset, startDrag } = useElementDrag(containerRef, onMove)
  const { markPreview, startMarkDrag } = useMarkDrag(
    containerRef,
    naturalWidth,
    naturalHeight,
    onMarkText
  )
  if (elements.length === 0) return null

  const editing = editingId ? textElements(elements).find((e) => e.id === editingId) : undefined
  const visible = editing ? elements.filter((e) => e.id !== editing.id) : elements
  const activeId = interactive ? (selectedId ?? hoveredId) : null
  const active = activeId ? visible.find((e) => e.id === activeId) : undefined
  const selected = active && active.id === selectedId ? active : undefined
  const inverse = 1 / zoomScale
  const dx = active && offset?.id === active.id ? offset.dx : 0
  const dy = active && offset?.id === active.id ? offset.dy : 0

  const renderElement = (element: PageElement): React.JSX.Element => (
    <ElementNode
      key={element.id}
      element={element}
      width={naturalWidth}
      height={naturalHeight}
      interactive={interactive}
      markTool={markTool}
      preview={markPreview?.elementId === element.id ? markPreview.span : null}
      hovered={interactive && element.id === hoveredId}
      selected={interactive && element.id === selectedId}
      zoomScale={zoomScale}
      offset={offset?.id === element.id ? offset : null}
      onHover={setHoveredId}
      onDragStart={(id, clientX, clientY) => {
        onSelect(id)
        const target = elements.find((e) => e.id === id)
        if (target) startDrag(id, target.bbox, clientX, clientY)
      }}
      onMarkDragStart={startMarkDrag}
      onEdit={(id) => onUpdateText && setEditingId(id)}
    />
  )

  const rest = visible.filter((e) => e.id !== activeId)
  const viewBox = `0 0 ${naturalWidth} ${naturalHeight}`
  return (
    <>
      <div ref={containerRef} className={`elements-layer${aboveDraw ? ' above-draw' : ''}`}>
        <svg viewBox={viewBox} preserveAspectRatio="none" aria-hidden="true">
          {rest.map(renderElement)}
        </svg>
        <ElementDecorations
          elements={textElements(rest)}
          naturalWidth={naturalWidth}
          naturalHeight={naturalHeight}
        />
      </div>
      {active && (
        <div className="elements-layer element-overlay">
          <svg viewBox={viewBox} preserveAspectRatio="none" aria-hidden="true">
            {renderElement(active)}
          </svg>
          <ElementDecorations
            elements={textElements([active])}
            naturalWidth={naturalWidth}
            naturalHeight={naturalHeight}
            offset={offset?.id === active.id ? offset : null}
          />
          {selected && <ElementPill element={selected} dx={dx} dy={dy} inverse={inverse} />}
        </div>
      )}
      {editing && onUpdateText && (
        <EditTextLayer
          element={editing}
          naturalHeight={naturalHeight}
          onCommit={(text) => {
            setEditingId(null)
            onUpdateText(editing.id, text)
          }}
        />
      )}
    </>
  )
}
