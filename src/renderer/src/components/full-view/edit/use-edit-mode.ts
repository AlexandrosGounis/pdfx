import { useCallback, useRef, useState } from 'react'
import type { EditTool, MarkMap } from '../../../edit/types'

export interface EditMode {
  editing: boolean
  editingRef: React.MutableRefObject<boolean>
  tool: EditTool | null
  canRevert: boolean
  enterEdit: () => void
  finishEdit: () => void
  revert: () => void
  toggleTool: (tool: EditTool) => void
}

export function useEditMode(marks: MarkMap, restore: (map: MarkMap) => void): EditMode {
  const [editing, setEditing] = useState(false)
  const [tool, setTool] = useState<EditTool | null>(null)
  const [baseline, setBaseline] = useState<MarkMap>({})
  const editingRef = useRef(editing)
  editingRef.current = editing
  const marksRef = useRef(marks)
  marksRef.current = marks

  const enterEdit = useCallback(() => {
    setBaseline(marksRef.current)
    setTool(null)
    setEditing(true)
  }, [])

  const finishEdit = useCallback(() => {
    setEditing(false)
    setTool(null)
  }, [])

  const revert = useCallback(() => {
    restore(baseline)
  }, [restore, baseline])

  const toggleTool = useCallback((next: EditTool) => {
    setTool((cur) => (cur === next ? null : next))
  }, [])

  return {
    editing,
    editingRef,
    tool,
    canRevert: editing && marks !== baseline,
    enterEdit,
    finishEdit,
    revert,
    toggleTool
  }
}
