import { useRef } from 'react'

interface CloseGuard {
  onPressCapture: (event: React.PointerEvent) => void
  onClick: (event: React.MouseEvent) => void
}

const isEditableElement = (el: Element | null): boolean =>
  !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')

export function useCloseGuard(
  hasSelection: boolean,
  draggedRef: React.MutableRefObject<boolean>,
  runClose: () => void
): CloseGuard {
  const pressRef = useRef({ typing: false, selected: false, insidePage: false })

  const onPressCapture = (event: React.PointerEvent): void => {
    pressRef.current = {
      typing: isEditableElement(document.activeElement),
      selected: hasSelection,
      insidePage: !!(event.target as HTMLElement).closest('.full-page')
    }
  }

  const onClick = (event: React.MouseEvent): void => {
    const press = pressRef.current
    pressRef.current = { typing: false, selected: false, insidePage: false }
    if (draggedRef.current) {
      draggedRef.current = false
      return
    }
    if (press.typing || press.selected || press.insidePage || hasSelection) return
    if (!(event.target as HTMLElement).closest('.full-page')) runClose()
  }

  return { onPressCapture, onClick }
}
