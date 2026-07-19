import { useRef, useState } from 'react'
import { elementLabel } from '../../elements/types'
import type { PageElement } from '../../elements/types'
import { ElementPath } from './ElementPath'
import { useElementDrag } from './use-element-drag'

interface ElementsLayerProps {
  elements: PageElement[]
  naturalWidth: number
  naturalHeight: number
  interactive: boolean
  aboveDraw?: boolean
  zoomScale?: number
  selectedId: string | null
  onSelect: (id: string | null) => void
  onMove?: (id: string, dx: number, dy: number) => void
}

const BBOX_RADIUS = 10

export function ElementsLayer({
  elements,
  naturalWidth,
  naturalHeight,
  interactive,
  aboveDraw = false,
  zoomScale = 1,
  selectedId,
  onSelect,
  onMove
}: ElementsLayerProps): React.JSX.Element | null {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const { offset, startDrag } = useElementDrag(containerRef, onMove)
  if (elements.length === 0) return null

  const activeId = interactive ? (selectedId ?? hoveredId) : null
  const active = activeId ? elements.find((e) => e.id === activeId) : undefined
  const selected = active && active.id === selectedId ? active : undefined
  const inverse = 1 / zoomScale
  const dx = active && offset?.id === active.id ? offset.dx : 0
  const dy = active && offset?.id === active.id ? offset.dy : 0

  const renderPath = (element: PageElement): React.JSX.Element => (
    <ElementPath
      key={element.id}
      element={element}
      width={naturalWidth}
      height={naturalHeight}
      interactive={interactive}
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
    />
  )

  const viewBox = `0 0 ${naturalWidth} ${naturalHeight}`
  return (
    <>
      <div ref={containerRef} className={`elements-layer${aboveDraw ? ' above-draw' : ''}`}>
        <svg viewBox={viewBox} preserveAspectRatio="none" aria-hidden="true">
          {elements.filter((e) => e.id !== activeId).map(renderPath)}
        </svg>
      </div>
      {active && (
        <div className="elements-layer element-overlay">
          <svg viewBox={viewBox} preserveAspectRatio="none" aria-hidden="true">
            {renderPath(active)}
          </svg>
          {selected && (
            <div
              className="element-bbox"
              style={{
                left: `${(selected.bbox.x + dx) * 100}%`,
                top: `${(selected.bbox.y + dy) * 100}%`,
                width: `${selected.bbox.w * 100}%`,
                height: `${selected.bbox.h * 100}%`,
                borderWidth: 2 * inverse,
                borderRadius: BBOX_RADIUS
              }}
            />
          )}
          {selected && (
            <div
              className="element-pill"
              style={{
                left: `${(selected.bbox.x + selected.bbox.w / 2 + dx) * 100}%`,
                top: `${(selected.bbox.y + dy) * 100}%`,
                transform: `translate(-50%, calc(-100% - ${7 * inverse}px)) scale(${inverse})`
              }}
            >
              {elementLabel(selected)}
            </div>
          )}
        </div>
      )}
    </>
  )
}
