import { useCallback, useRef } from 'react'
import type { Mark, MarkMap } from '../edit/types'
import type { PageElement } from '../elements/types'

export const ACTIONS = {
  MARK: 'mark',
  MOVE_PAGE: 'move-page',
  ELEMENT: 'element'
} as const

export interface PagePlacement {
  docId: string
  docName: string
  docIndex: number
  pageIndex: number
}

export interface MovePagePayload {
  pageId: string
  from: PagePlacement
  to: PagePlacement
}

export type MarkUndoEntry =
  | {
      action: typeof ACTIONS.MARK
      value: 'add' | 'remove'
      payload: { pageId: string; marks: Mark[] }
    }
  | {
      action: typeof ACTIONS.MARK
      value: 'restore'
      payload: { before: MarkMap; after: MarkMap }
    }

export type MovePageUndoEntry = {
  action: typeof ACTIONS.MOVE_PAGE
  value: string
  payload: MovePagePayload
}

export type ElementUndoEntry =
  | {
      action: typeof ACTIONS.ELEMENT
      value: 'add' | 'remove'
      payload: { pageId: string; element: PageElement }
    }
  | {
      action: typeof ACTIONS.ELEMENT
      value: 'move' | 'mark' | 'edit'
      payload: { pageId: string; before: PageElement; after: PageElement }
    }

export type UndoEntry = MarkUndoEntry | MovePageUndoEntry | ElementUndoEntry

const UNDO_CAP = 30

export function useUndoStack() {
  const stackRef = useRef<UndoEntry[]>([])
  const cursorRef = useRef(0)

  const push = useCallback((entry: UndoEntry): void => {
    const stack = stackRef.current
    stack.length = cursorRef.current
    stack.push(entry)
    if (stack.length > UNDO_CAP) stack.shift()
    cursorRef.current = stack.length
  }, [])

  const undo = useCallback((): UndoEntry | undefined => {
    if (cursorRef.current === 0) return undefined
    cursorRef.current -= 1
    return stackRef.current[cursorRef.current]
  }, [])

  const redo = useCallback((): UndoEntry | undefined => {
    const stack = stackRef.current
    if (cursorRef.current >= stack.length) return undefined
    const entry = stack[cursorRef.current]
    cursorRef.current += 1
    return entry
  }, [])

  return { push, undo, redo }
}

export type UndoStack = ReturnType<typeof useUndoStack>
