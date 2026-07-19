import { useEffect, useRef } from 'react'
import type { MarkKind } from '../../../edit/types'
import { HighlighterIcon, TapeIcon } from '../../icons'

export function ToolCursor({ tool }: { tool: MarkKind }): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const move = (e: PointerEvent): void => {
      const overPage = e.target instanceof Element && e.target.closest('.full-page') !== null
      el.style.opacity = overPage ? '1' : '0'
      el.style.transform = `translate(${e.clientX + 12}px, ${e.clientY - 24}px)`
    }
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [])

  return (
    <div ref={ref} className={`edit-cursor ${tool}`} aria-hidden="true">
      {tool === 'redact' ? <TapeIcon size={16} /> : <HighlighterIcon size={16} />}
    </div>
  )
}
