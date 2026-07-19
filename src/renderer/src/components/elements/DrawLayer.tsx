import { useRef, useState } from 'react'
import { refineInkPoints, smoothPathData } from '../../elements/geometry'
import { INK_COLOR, INK_STROKE_WIDTH } from '../../elements/types'
import type { ElementPoint } from '../../elements/types'

interface DrawLayerProps {
  naturalWidth: number
  naturalHeight: number
  onCommit: (points: ElementPoint[]) => void
}

export function DrawLayer({
  naturalWidth,
  naturalHeight,
  onCommit
}: DrawLayerProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [stroke, setStroke] = useState<ElementPoint[] | null>(null)

  const pointFrom = (event: React.PointerEvent): ElementPoint | null => {
    const bounds = containerRef.current?.getBoundingClientRect()
    if (!bounds || bounds.width === 0 || bounds.height === 0) return null
    const clamp = (v: number): number => Math.min(1, Math.max(0, v))
    return {
      x: clamp((event.clientX - bounds.left) / bounds.width),
      y: clamp((event.clientY - bounds.top) / bounds.height)
    }
  }

  return (
    <div
      ref={containerRef}
      className="draw-layer"
      onPointerDown={(event) => {
        event.stopPropagation()
        const point = pointFrom(event)
        if (!point) return
        event.currentTarget.setPointerCapture(event.pointerId)
        setStroke([point])
      }}
      onPointerMove={(event) => {
        if (!stroke) return
        const point = pointFrom(event)
        if (point) setStroke([...stroke, point])
      }}
      onPointerUp={(event) => {
        event.stopPropagation()
        if (stroke) onCommit(stroke)
        setStroke(null)
      }}
      onPointerCancel={() => setStroke(null)}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {stroke && (
        <svg
          viewBox={`0 0 ${naturalWidth} ${naturalHeight}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d={smoothPathData(refineInkPoints(stroke), naturalWidth, naturalHeight)}
            fill="none"
            stroke={INK_COLOR}
            strokeWidth={INK_STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  )
}
