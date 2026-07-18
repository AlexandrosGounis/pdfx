import type { Mark } from '../edit/types'
import { MARK_COLORS } from '../edit/types'

interface MarkLayerProps {
  marks: Mark[]
}

export function MarkLayer({ marks }: MarkLayerProps): React.JSX.Element {
  return (
    <div className="mark-layer" aria-hidden="true">
      {marks.map((m) =>
        m.rects.map((r, i) => (
          <div
            key={`${m.id}:${i}`}
            className={`mark-rect ${m.kind}`}
            style={{
              left: `${r.x * 100}%`,
              top: `${r.y * 100}%`,
              width: `${r.w * 100}%`,
              height: `${r.h * 100}%`,
              backgroundColor: MARK_COLORS[m.color]
            }}
          />
        ))
      )}
    </div>
  )
}
