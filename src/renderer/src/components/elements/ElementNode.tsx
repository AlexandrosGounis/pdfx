import type { MarkKind } from '../../edit/types'
import type { PageElement, TextElement } from '../../elements/types'
import type { TextSpan } from '../../elements/text-marks'
import { ElementPath } from './ElementPath'
import { ElementText } from './ElementText'

interface ElementNodeProps {
  element: PageElement
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

export function ElementNode({
  element,
  markTool,
  preview,
  onMarkDragStart,
  onEdit,
  ...shared
}: ElementNodeProps): React.JSX.Element {
  return element.kind === 'ink' ? (
    <ElementPath element={element} {...shared} />
  ) : (
    <ElementText
      element={element}
      markTool={markTool}
      preview={preview}
      onMarkDragStart={onMarkDragStart}
      onEdit={onEdit}
      {...shared}
    />
  )
}
