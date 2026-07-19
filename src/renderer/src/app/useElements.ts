import { useCallback, useRef, useState } from 'react'
import { INK_COLOR, INK_STROKE_WIDTH } from '../elements/types'
import type { ElementMap, ElementPoint, PageElement } from '../elements/types'
import { bboxOfPoints, refineInkPoints } from '../elements/geometry'
import { ACTIONS } from './undo'
import type { ElementUndoEntry, UndoEntry } from './undo'

const BBOX_PAD_POINTS = 9

export function useElements(pushUndo: (entry: UndoEntry) => void) {
  const [elements, setElements] = useState<ElementMap>({})
  const elementsRef = useRef(elements)
  elementsRef.current = elements
  const nextNumberRef = useRef(1)

  const addInk = useCallback(
    (
      pageId: string,
      points: ElementPoint[],
      pageWidth: number,
      pageHeight: number
    ): PageElement | null => {
      if (points.length < 2) return null
      const thinned = refineInkPoints(points)
      const element: PageElement = {
        id: crypto.randomUUID(),
        kind: 'ink',
        number: nextNumberRef.current++,
        color: INK_COLOR,
        strokeWidth: INK_STROKE_WIDTH,
        points: thinned,
        bbox: bboxOfPoints(thinned, BBOX_PAD_POINTS / pageWidth, BBOX_PAD_POINTS / pageHeight)
      }
      pushUndo({ action: ACTIONS.ELEMENT, value: 'add', payload: { pageId, element } })
      const map = elementsRef.current
      setElements({ ...map, [pageId]: [...(map[pageId] ?? []), element] })
      return element
    },
    [pushUndo]
  )

  const removeElement = useCallback(
    (pageId: string, elementId: string) => {
      const map = elementsRef.current
      const element = map[pageId]?.find((e) => e.id === elementId)
      if (!element) return
      pushUndo({ action: ACTIONS.ELEMENT, value: 'remove', payload: { pageId, element } })
      setElements({ ...map, [pageId]: map[pageId].filter((e) => e.id !== elementId) })
    },
    [pushUndo]
  )

  const moveElement = useCallback(
    (pageId: string, elementId: string, dx: number, dy: number) => {
      const map = elementsRef.current
      const element = map[pageId]?.find((e) => e.id === elementId)
      if (!element) return
      const moved: PageElement = {
        ...element,
        points: element.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
        bbox: { ...element.bbox, x: element.bbox.x + dx, y: element.bbox.y + dy }
      }
      pushUndo({
        action: ACTIONS.ELEMENT,
        value: 'move',
        payload: { pageId, before: element, after: moved }
      })
      setElements({ ...map, [pageId]: map[pageId].map((e) => (e.id === elementId ? moved : e)) })
    },
    [pushUndo]
  )

  const applyEntry = useCallback((entry: ElementUndoEntry, direction: 'undo' | 'redo') => {
    const map = elementsRef.current
    const page = map[entry.payload.pageId] ?? []
    if (entry.value === 'move') {
      const target = direction === 'undo' ? entry.payload.before : entry.payload.after
      setElements({
        ...map,
        [entry.payload.pageId]: page.map((e) => (e.id === target.id ? target : e))
      })
      return
    }
    const { element } = entry.payload
    const remove = (entry.value === 'add') === (direction === 'undo')
    const kept = page.filter((e) => e.id !== element.id)
    setElements({ ...map, [entry.payload.pageId]: remove ? kept : [...kept, element] })
  }, [])

  const applyUndo = useCallback(
    (entry: ElementUndoEntry) => applyEntry(entry, 'undo'),
    [applyEntry]
  )
  const applyRedo = useCallback(
    (entry: ElementUndoEntry) => applyEntry(entry, 'redo'),
    [applyEntry]
  )

  return { elements, addInk, removeElement, moveElement, applyUndo, applyRedo }
}

export type ElementState = ReturnType<typeof useElements>
