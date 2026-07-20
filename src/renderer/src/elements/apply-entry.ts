import type { ElementUndoEntry } from '../app/undo'
import type { PageElement } from './types'

export function applyElementEntry(
  page: PageElement[],
  entry: ElementUndoEntry,
  direction: 'undo' | 'redo'
): PageElement[] {
  if (entry.value === 'add' || entry.value === 'remove') {
    const { element } = entry.payload
    const remove = (entry.value === 'add') === (direction === 'undo')
    const kept = page.filter((e) => e.id !== element.id)
    return remove ? kept : [...kept, element]
  }
  if (entry.value === 'move' || entry.value === 'mark' || entry.value === 'edit') {
    const target = direction === 'undo' ? entry.payload.before : entry.payload.after
    return page.map((e) => (e.id === target.id ? target : e))
  }
  return page
}
