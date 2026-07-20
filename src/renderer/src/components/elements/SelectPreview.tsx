import { TEXT_LINE_HEIGHT } from '../../elements/types'
import type { TextElement } from '../../elements/types'
import { lineSpans } from '../../elements/text-marks'
import type { TextSpan } from '../../elements/text-marks'
import { measureLineWidth } from '../../elements/measure'
import type { MarkKind } from '../../edit/types'

interface SelectPreviewProps {
  element: TextElement
  span: TextSpan
  markTool: MarkKind
  width: number
  height: number
}

export function SelectPreview({
  element,
  span,
  markTool,
  width,
  height
}: SelectPreviewProps): React.JSX.Element {
  const lineHeight = element.fontSize * TEXT_LINE_HEIGHT
  const originX = element.origin.x * width
  const originY = element.origin.y * height
  return (
    <>
      {lineSpans(element.text).flatMap((line) => {
        const from = Math.max(span.start, line.start)
        const to = Math.min(span.end, line.end)
        if (to <= from) return []
        const prefix = measureLineWidth(line.text.slice(0, from - line.start), element.fontSize)
        const w = measureLineWidth(
          line.text.slice(from - line.start, to - line.start),
          element.fontSize
        )
        return [
          <rect
            key={line.start}
            className={`text-select-preview ${markTool}`}
            x={originX + prefix}
            y={originY + line.row * lineHeight}
            width={w}
            height={lineHeight}
          />
        ]
      })}
    </>
  )
}
