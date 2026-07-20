import { useRef, useState } from 'react'
import type { ElementPoint } from '../../elements/types'
import { TextEditor } from './TextEditor'

interface TypeLayerProps {
  naturalHeight: number
  onCommit: (text: string, origin: ElementPoint) => void
}

interface EditorState {
  origin: ElementPoint
  scale: number
}

export function TypeLayer({ naturalHeight, onCommit }: TypeLayerProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [editor, setEditor] = useState<EditorState | null>(null)

  const editorAt = (event: React.PointerEvent): EditorState | null => {
    const container = containerRef.current
    const bounds = container?.getBoundingClientRect()
    if (!container || !bounds || bounds.width === 0 || bounds.height === 0) return null
    const clamp = (v: number): number => Math.min(1, Math.max(0, v))
    return {
      origin: {
        x: clamp((event.clientX - bounds.left) / bounds.width),
        y: clamp((event.clientY - bounds.top) / bounds.height)
      },
      scale: container.clientHeight / naturalHeight
    }
  }

  return (
    <div
      ref={containerRef}
      className="type-layer"
      onPointerDown={(event) => {
        event.stopPropagation()
        if (event.target !== event.currentTarget) return
        event.preventDefault()
        if (editor) {
          setEditor(null)
          return
        }
        setEditor(editorAt(event))
      }}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {editor && (
        <TextEditor
          origin={editor.origin}
          scale={editor.scale}
          onCommit={(text) => {
            setEditor(null)
            onCommit(text, editor.origin)
          }}
          onCancel={() => setEditor(null)}
        />
      )}
    </div>
  )
}
