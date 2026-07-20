import { useFindState } from '../../search/FindContext'
import { findMatchRects } from '../../elements/measure'
import type { TextElement } from '../../elements/types'

interface ElementFindRectsProps {
  elements: TextElement[]
  naturalWidth: number
  naturalHeight: number
  offset?: { dx: number; dy: number } | null
}

export function ElementFindRects({
  elements,
  naturalWidth,
  naturalHeight,
  offset = null
}: ElementFindRectsProps): React.JSX.Element | null {
  const { active, query } = useFindState()
  if (!active || query.trim().length === 0 || elements.length === 0) return null
  const hits = elements.flatMap((element) =>
    findMatchRects(element, query, naturalWidth, naturalHeight).map((rect, index) => ({
      key: `${element.id}:${index}`,
      rect
    }))
  )
  if (hits.length === 0) return null
  return (
    <div
      className="element-find-rects"
      aria-hidden="true"
      style={
        offset ? { transform: `translate(${offset.dx * 100}%, ${offset.dy * 100}%)` } : undefined
      }
    >
      {hits.map(({ key, rect }) => (
        <div
          key={key}
          className="find-hit"
          style={{
            left: `${rect.x * 100}%`,
            top: `${rect.y * 100}%`,
            width: `${rect.w * 100}%`,
            height: `${rect.h * 100}%`
          }}
        />
      ))}
    </div>
  )
}
