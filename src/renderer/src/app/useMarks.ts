import { useCallback, useRef, useState } from 'react'
import { DEFAULT_MARK_COLORS } from '../edit/types'
import type { MarkKind, MarkMap, MarkRect } from '../edit/types'
import { rectsOverlap } from '../edit/selection'
import { ACTIONS } from './undo'
import type { MarkUndoEntry, UndoEntry } from './undo'

export function useMarks(pushUndo: (entry: UndoEntry) => void) {
  const [marks, setMarks] = useState<MarkMap>({})
  const marksRef = useRef(marks)
  marksRef.current = marks

  const toggleMark = useCallback(
    (pageId: string, kind: MarkKind, rects: MarkRect[]) => {
      if (rects.length === 0) return
      const map = marksRef.current
      const page = map[pageId] ?? []
      const removed = page.filter(
        (m) => m.kind === kind && m.rects.some((a) => rects.some((b) => rectsOverlap(a, b)))
      )
      if (removed.length > 0) {
        pushUndo({ action: ACTIONS.MARK, value: 'remove', payload: { pageId, marks: removed } })
        setMarks({ ...map, [pageId]: page.filter((m) => !removed.includes(m)) })
      } else {
        const added = { id: crypto.randomUUID(), kind, color: DEFAULT_MARK_COLORS[kind], rects }
        pushUndo({ action: ACTIONS.MARK, value: 'add', payload: { pageId, marks: [added] } })
        setMarks({ ...map, [pageId]: [...page, added] })
      }
    },
    [pushUndo]
  )

  const restoreMarks = useCallback(
    (map: MarkMap) => {
      const prev = marksRef.current
      if (prev === map) return
      pushUndo({ action: ACTIONS.MARK, value: 'restore', payload: { before: prev, after: map } })
      setMarks(map)
    },
    [pushUndo]
  )

  const applyEntry = useCallback((entry: MarkUndoEntry, direction: 'undo' | 'redo') => {
    if (entry.value === 'restore') {
      setMarks(direction === 'undo' ? entry.payload.before : entry.payload.after)
      return
    }
    const { pageId, marks: entries } = entry.payload
    const map = marksRef.current
    const page = map[pageId] ?? []
    const remove = (entry.value === 'add') === (direction === 'undo')
    const kept = page.filter((m) => !entries.some((e) => e.id === m.id))
    setMarks({ ...map, [pageId]: remove ? kept : [...kept, ...entries] })
  }, [])

  const applyUndo = useCallback((entry: MarkUndoEntry) => applyEntry(entry, 'undo'), [applyEntry])
  const applyRedo = useCallback((entry: MarkUndoEntry) => applyEntry(entry, 'redo'), [applyEntry])

  return { marks, toggleMark, restoreMarks, applyUndo, applyRedo }
}

export type MarkState = ReturnType<typeof useMarks>
