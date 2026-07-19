import { smoothPathData } from '../../elements/geometry'
import type { PageElement } from '../../elements/types'

interface ElementPathProps {
  element: PageElement
  width: number
  height: number
  interactive: boolean
  hovered: boolean
  selected: boolean
  zoomScale: number
  offset: { dx: number; dy: number } | null
  onHover: (id: string | null) => void
  onDragStart: (id: string, clientX: number, clientY: number) => void
}

const HIT_PADDING = 8
const OUTLINE_PADDING = 4

export function ElementPath({
  element,
  width,
  height,
  interactive,
  hovered,
  selected,
  zoomScale,
  offset,
  onHover,
  onDragStart
}: ElementPathProps): React.JSX.Element {
  const d = smoothPathData(element.points, width, height)
  const outlined = hovered || selected
  return (
    <g transform={offset ? `translate(${offset.dx * width} ${offset.dy * height})` : undefined}>
      {outlined && (
        <path
          className="element-outline"
          d={d}
          fill="none"
          strokeWidth={element.strokeWidth + OUTLINE_PADDING / zoomScale}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <path
        d={d}
        fill="none"
        stroke={element.color}
        strokeWidth={element.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {interactive && (
        <path
          className="element-hit"
          d={d}
          fill="none"
          stroke="transparent"
          strokeWidth={element.strokeWidth + HIT_PADDING / zoomScale}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ cursor: selected ? 'move' : 'default' }}
          onPointerEnter={() => onHover(element.id)}
          onPointerLeave={() => onHover(null)}
          onPointerDown={(e) => {
            e.stopPropagation()
            onDragStart(element.id, e.clientX, e.clientY)
          }}
          onDoubleClick={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </g>
  )
}
