import { useEffect, useRef, useState } from 'react'
import {
  TEXT_COLOR,
  TEXT_FONT_FAMILY,
  TEXT_FONT_SIZE,
  TEXT_LINE_HEIGHT,
  textLines
} from '../../elements/types'
import type { ElementPoint } from '../../elements/types'
import { measureLineWidth } from '../../elements/measure'

interface TextEditorProps {
  origin: ElementPoint
  scale: number
  fontSize?: number
  initialText?: string
  onCommit: (text: string) => void
  onCancel: () => void
}

const MIN_WIDTH_POINTS = 8
const CARET_ALLOWANCE_POINTS = 4

export function TextEditor({
  origin,
  scale,
  fontSize = TEXT_FONT_SIZE,
  initialText = '',
  onCommit,
  onCancel
}: TextEditorProps): React.JSX.Element {
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = useState(initialText)

  useEffect(() => {
    const area = areaRef.current
    if (area) area.setSelectionRange(area.value.length, area.value.length)
  }, [])
  const doneRef = useRef(false)
  const stateRef = useRef({ value, onCommit, onCancel })
  stateRef.current = { value, onCommit, onCancel }

  const finish = (cancelWhenEmpty: boolean): void => {
    if (doneRef.current) return
    const current = stateRef.current
    const text = current.value.replace(/\s+$/, '')
    if (text.trim().length === 0) {
      if (cancelWhenEmpty) {
        doneRef.current = true
        current.onCancel()
      }
      return
    }
    doneRef.current = true
    current.onCommit(text)
  }

  const finishRef = useRef(finish)
  finishRef.current = finish
  const pendingRef = useRef<number | null>(null)
  useEffect(() => {
    if (pendingRef.current !== null) {
      window.clearTimeout(pendingRef.current)
      pendingRef.current = null
    }
    return () => {
      pendingRef.current = window.setTimeout(() => finishRef.current(false), 0)
    }
  }, [])

  const lines = textLines(value)
  const widthPoints = Math.max(
    MIN_WIDTH_POINTS,
    ...lines.map((line) => measureLineWidth(line, fontSize))
  )
  return (
    <textarea
      ref={areaRef}
      className="text-editor"
      autoFocus
      wrap="off"
      spellCheck={false}
      value={value}
      style={{
        left: `${origin.x * 100}%`,
        top: `${origin.y * 100}%`,
        width: (widthPoints + CARET_ALLOWANCE_POINTS) * scale,
        height: lines.length * fontSize * TEXT_LINE_HEIGHT * scale,
        fontSize: fontSize * scale,
        lineHeight: TEXT_LINE_HEIGHT,
        fontFamily: TEXT_FONT_FAMILY,
        color: TEXT_COLOR
      }}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          finish(true)
        }
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    />
  )
}
