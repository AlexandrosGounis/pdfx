import { DEFAULT_MARK_COLORS, MARK_COLORS } from '../../edit/types'
import { textMarkRects } from '../../elements/measure'
import type { TextElement } from '../../elements/types'

interface ElementMarkRectsProps {
  elements: TextElement[]
  naturalWidth: number
  naturalHeight: number
  offset?: { dx: number; dy: number } | null
}

export function ElementMarkRects({
  elements,
  naturalWidth,
  naturalHeight,
  offset = null
}: ElementMarkRectsProps): React.JSX.Element | null {
  const marked = elements.filter((e) => e.marks.length > 0)
  if (marked.length === 0) return null
  return (
    <div
      className="element-marks"
      aria-hidden="true"
      style={
        offset ? { transform: `translate(${offset.dx * 100}%, ${offset.dy * 100}%)` } : undefined
      }
    >
      {marked.map((element) =>
        textMarkRects(element, naturalWidth, naturalHeight).map((r, index) => (
          <div
            key={`${element.id}:${index}`}
            className="mark-rect"
            style={{
              left: `${r.x * 100}%`,
              top: `${r.y * 100}%`,
              width: `${r.w * 100}%`,
              height: `${r.h * 100}%`,
              backgroundColor: MARK_COLORS[DEFAULT_MARK_COLORS[r.kind]]
            }}
          />
        ))
      )}
    </div>
  )
}
