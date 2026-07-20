import { TEXT_BASELINE, TEXT_FONT_FAMILY, TEXT_LINE_HEIGHT } from '../../elements/types'
import type { TextElement } from '../../elements/types'
import { lineSpans } from '../../elements/text-marks'
import type { TextSpan } from '../../elements/text-marks'
import type { MarkKind } from '../../edit/types'
import { SelectPreview } from './SelectPreview'

interface ElementTextProps {
  element: TextElement
  width: number
  height: number
  interactive: boolean
  markTool: MarkKind | null
  preview: TextSpan | null
  hovered: boolean
  selected: boolean
  zoomScale: number
  offset: { dx: number; dy: number } | null
  onHover: (id: string | null) => void
  onDragStart: (id: string, clientX: number, clientY: number) => void
  onMarkDragStart: (element: TextElement, clientX: number, clientY: number, detail: number) => void
  onEdit: (id: string) => void
}

const OUTLINE_WIDTH = 3

export function ElementText({
  element,
  width,
  height,
  interactive,
  markTool,
  preview,
  hovered,
  selected,
  zoomScale,
  offset,
  onHover,
  onDragStart,
  onMarkDragStart,
  onEdit
}: ElementTextProps): React.JSX.Element {
  const lineHeight = element.fontSize * TEXT_LINE_HEIGHT
  const originX = element.origin.x * width
  const originY = element.origin.y * height
  const bbox = {
    x: element.bbox.x * width,
    y: element.bbox.y * height,
    w: element.bbox.w * width,
    h: element.bbox.h * height
  }
  const renderSpans = (): React.JSX.Element[] =>
    lineSpans(element.text).map((line) => (
      <tspan
        key={line.start}
        x={originX}
        y={originY + TEXT_BASELINE * element.fontSize + line.row * lineHeight}
      >
        {line.text}
      </tspan>
    ))
  return (
    <g transform={offset ? `translate(${offset.dx * width} ${offset.dy * height})` : undefined}>
      {(hovered || selected) && (
        <text
          className="element-outline"
          fontSize={element.fontSize}
          fontFamily={TEXT_FONT_FAMILY}
          fill="none"
          strokeWidth={OUTLINE_WIDTH / zoomScale}
          strokeLinejoin="round"
          xmlSpace="preserve"
        >
          {renderSpans()}
        </text>
      )}
      {markTool && preview && (
        <SelectPreview
          element={element}
          span={preview}
          markTool={markTool}
          width={width}
          height={height}
        />
      )}
      <text
        fill={element.color}
        fontSize={element.fontSize}
        fontFamily={TEXT_FONT_FAMILY}
        xmlSpace="preserve"
      >
        {renderSpans()}
      </text>
      {(interactive || markTool) && (
        <rect
          className="element-hit"
          x={bbox.x}
          y={bbox.y}
          width={bbox.w}
          height={bbox.h}
          fill="transparent"
          style={{ cursor: markTool ? 'text' : selected ? 'move' : 'default' }}
          onPointerEnter={markTool ? undefined : () => onHover(element.id)}
          onPointerLeave={markTool ? undefined : () => onHover(null)}
          onPointerDown={(e) => {
            e.stopPropagation()
            if (markTool) onMarkDragStart(element, e.clientX, e.clientY, 1)
            else onDragStart(element.id, e.clientX, e.clientY)
          }}
          onMouseDown={(e) => {
            e.stopPropagation()
            if (e.detail < 2) return
            e.preventDefault()
            if (markTool) onMarkDragStart(element, e.clientX, e.clientY, e.detail)
            else onEdit(element.id)
          }}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        />
      )}
    </g>
  )
}
