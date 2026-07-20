import { elementLabel } from '../../elements/types'
import type { PageElement } from '../../elements/types'

interface ElementPillProps {
  element: PageElement
  dx: number
  dy: number
  inverse: number
}

const PILL_GAP = 7

export function ElementPill({ element, dx, dy, inverse }: ElementPillProps): React.JSX.Element {
  return (
    <div
      className="element-pill"
      style={{
        left: `${(element.bbox.x + element.bbox.w / 2 + dx) * 100}%`,
        top: `${(element.bbox.y + dy) * 100}%`,
        transform: `translate(-50%, calc(-100% - ${PILL_GAP * inverse}px)) scale(${inverse})`
      }}
    >
      {elementLabel(element)}
    </div>
  )
}
