import { useEffect } from 'react'
import type { PageRef } from './types'

interface KeyboardShortcutDeps {
  active: boolean
  selected: PageRef | null
  onDeletePage: (target: PageRef) => void
  onCopy: () => void
  onPaste: () => void
  onClearSelection: () => void
  findOpen: boolean
  onOpenFind: () => void
  onCloseFind: () => void
}

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')
}

export function useKeyboardShortcuts({
  active,
  selected,
  onDeletePage,
  onCopy,
  onPaste,
  onClearSelection,
  findOpen,
  onOpenFind,
  onCloseFind
}: KeyboardShortcutDeps): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const mod = event.metaKey || event.ctrlKey
      if (mod && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        onOpenFind()
        return
      }
      if (active && findOpen && event.key === 'Escape') {
        event.preventDefault()
        onCloseFind()
        return
      }
      if (!active || isEditableTarget(event.target)) return
      if ((event.key === 'Backspace' || event.key === 'Delete') && selected) {
        event.preventDefault()
        onDeletePage(selected)
      } else if (mod && event.key.toLowerCase() === 'c' && selected) {
        onCopy()
      } else if (mod && event.key.toLowerCase() === 'v') {
        onPaste()
      } else if (event.key === 'Escape') {
        onClearSelection()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    active,
    selected,
    onDeletePage,
    onCopy,
    onPaste,
    onClearSelection,
    findOpen,
    onOpenFind,
    onCloseFind
  ])
}
