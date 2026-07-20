import { useLayoutEffect, useRef, useState } from 'react'
import type { TextElement } from '../../elements/types'
import { TextEditor } from './TextEditor'

interface EditTextLayerProps {
  element: TextElement
  naturalHeight: number
  onCommit: (text: string) => void
}

export function EditTextLayer({
  element,
  naturalHeight,
  onCommit
}: EditTextLayerProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState<number | null>(null)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (container && container.clientHeight > 0) setScale(container.clientHeight / naturalHeight)
  }, [naturalHeight])

  return (
    <div
      ref={containerRef}
      className="type-layer edit-text-layer"
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {scale !== null && (
        <TextEditor
          origin={element.origin}
          scale={scale}
          fontSize={element.fontSize}
          initialText={element.text}
          onCommit={onCommit}
          onCancel={() => onCommit('')}
        />
      )}
    </div>
  )
}
