import { useCallback, useEffect, useRef, useState } from 'react'

export interface SelectedElement {
  pageId: string
  elementId: string
}

const isEditableTarget = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')
}

export function useElementSelection(
  toolArmed: boolean,
  onDelete: (pageId: string, elementId: string) => void
) {
  const [selected, setSelected] = useState<SelectedElement | null>(null)
  const selectedRef = useRef(selected)
  selectedRef.current = selected

  const selectElement = useCallback((pageId: string, elementId: string | null) => {
    setSelected(elementId ? { pageId, elementId } : null)
  }, [])

  useEffect(() => {
    if (toolArmed) setSelected(null)
  }, [toolArmed])

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const current = selectedRef.current
      if (!current || isEditableTarget(event.target)) return
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault()
        event.stopPropagation()
        onDelete(current.pageId, current.elementId)
        setSelected(null)
      } else if (event.key === 'Escape') {
        event.stopPropagation()
        setSelected(null)
      }
    }
    const onPointerDown = (event: PointerEvent): void => {
      if (!selectedRef.current) return
      const target = event.target instanceof Element ? event.target : null
      if (!target?.closest('.element-hit, .element-pill')) setSelected(null)
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [onDelete])

  return { selected, selectElement }
}
