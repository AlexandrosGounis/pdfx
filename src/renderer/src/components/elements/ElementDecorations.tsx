import { ElementMarkRects } from './ElementMarkRects'
import { ElementFindRects } from './ElementFindRects'
import type { TextElement } from '../../elements/types'

interface ElementDecorationsProps {
  elements: TextElement[]
  naturalWidth: number
  naturalHeight: number
  offset?: { dx: number; dy: number } | null
}

export function ElementDecorations(props: ElementDecorationsProps): React.JSX.Element {
  return (
    <>
      <ElementMarkRects {...props} />
      <ElementFindRects {...props} />
    </>
  )
}
