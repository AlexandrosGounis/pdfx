import { useCallback, useRef, useState } from 'react'
import * as docOps from './doc-ops/docs'
import * as pageOps from './doc-ops/pages'
import * as moveOps from './doc-ops/move'
import { useClipboard } from './useClipboard'
import { ACTIONS } from './undo'
import type { PagePlacement, UndoEntry } from './undo'
import type { SelectedTarget } from './selection'
import type { PageRef } from './types'
import type { DocEntry, PageEntry } from '../types'

export function useCollection(
  flash: (message: string) => void,
  pushUndo: (entry: UndoEntry) => void
) {
  const [docs, setDocs] = useState<DocEntry[]>([])
  const [selected, setSelected] = useState<PageRef | null>(null)
  const docsRef = useRef(docs)
  docsRef.current = docs

  const { copySelected, pasteAfterSelected } = useClipboard(
    docs,
    selected,
    setDocs,
    setSelected,
    flash
  )

  const selectPage = useCallback((docId: string, pageId: string) => {
    setSelected({ docId, pageId })
  }, [])

  const clearSelection = useCallback(() => setSelected(null), [])

  const removeDoc = useCallback((id: string) => {
    setDocs((prev) => docOps.removeDoc(prev, id))
    setSelected((sel) => (sel?.docId === id ? null : sel))
  }, [])

  const renameDoc = useCallback((id: string, name: string) => {
    setDocs((prev) => docOps.renameDoc(prev, id, name))
  }, [])

  const moveDoc = useCallback((id: string, direction: -1 | 1) => {
    setDocs((prev) => docOps.reorderDoc(prev, id, direction))
  }, [])

  const deletePage = useCallback(
    (target: PageRef) => {
      const doc = docs.find((d) => d.id === target.docId)
      const index = doc?.pages.findIndex((p) => p.id === target.pageId) ?? -1
      if (!doc || index === -1) return
      const pages = doc.pages.filter((p) => p.id !== target.pageId)
      const neighbor = pages[Math.min(index, pages.length - 1)]
      setDocs((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, pages } : d)).filter((d) => d.pages.length > 0)
      )
      setSelected(neighbor ? { docId: doc.id, pageId: neighbor.id } : null)
    },
    [docs]
  )

  const insertPagesAfter = useCallback((target: SelectedTarget, entries: PageEntry[]) => {
    if (entries.length === 0) return
    setDocs((prev) => pageOps.insertPagesAfter(prev, target.doc.id, target.index, entries))
    setSelected({ docId: target.doc.id, pageId: entries[entries.length - 1].id })
  }, [])

  const appendPagesToDoc = useCallback((docId: string, entries: PageEntry[]) => {
    if (entries.length === 0) return
    setDocs((prev) => pageOps.appendPages(prev, docId, entries))
    setSelected({ docId, pageId: entries[entries.length - 1].id })
  }, [])

  const insertPagesIntoDoc = useCallback((docId: string, index: number, entries: PageEntry[]) => {
    if (entries.length === 0) return
    setDocs((prev) => pageOps.insertPagesIntoDoc(prev, docId, index, entries))
    setSelected({ docId, pageId: entries[entries.length - 1].id })
  }, [])

  const recordPageMove = useCallback(
    (prev: DocEntry[], next: DocEntry[], pageId: string) => {
      const from = moveOps.pagePlacement(prev, pageId)
      const to = moveOps.pagePlacement(next, pageId)
      if (!from || !to) return
      pushUndo({ action: ACTIONS.MOVE_PAGE, value: pageId, payload: { pageId, from, to } })
    },
    [pushUndo]
  )

  const movePageInto = useCallback(
    (source: PageRef, targetDocId: string, index: number) => {
      const prev = docsRef.current
      const next = moveOps.movePageInto(prev, source, targetDocId, index)
      if (next !== prev) {
        recordPageMove(prev, next, source.pageId)
        setDocs(next)
      }
      setSelected({ docId: targetDocId, pageId: source.pageId })
    },
    [recordPageMove]
  )

  const movePageToNewDoc = useCallback(
    (source: PageRef, docIndex: number) => {
      const prev = docsRef.current
      const newDocId = crypto.randomUUID()
      const next = moveOps.movePageToNewDoc(prev, source, docIndex, newDocId)
      if (next === prev) return
      recordPageMove(prev, next, source.pageId)
      setDocs(next)
      setSelected({ docId: newDocId, pageId: source.pageId })
    },
    [recordPageMove]
  )

  const placePageAt = useCallback((pageId: string, at: PagePlacement) => {
    const prev = docsRef.current
    const next = moveOps.placePage(prev, pageId, at)
    if (next === prev) return
    setDocs(next)
    setSelected({ docId: at.docId, pageId })
  }, [])

  const spliceDocsAfter = useCallback((anchorDocId: string | null, newDocs: DocEntry[]) => {
    if (newDocs.length === 0) return
    setDocs((prev) => docOps.spliceDocsAfter(prev, anchorDocId, newDocs))
    const last = newDocs[newDocs.length - 1]
    setSelected({ docId: last.id, pageId: last.pages[last.pages.length - 1].id })
  }, [])

  return {
    docs,
    setDocs,
    docsRef,
    selected,
    setSelected,
    selectPage,
    clearSelection,
    removeDoc,
    renameDoc,
    moveDoc,
    deletePage,
    copySelected,
    pasteAfterSelected,
    insertPagesAfter,
    appendPagesToDoc,
    insertPagesIntoDoc,
    movePageInto,
    movePageToNewDoc,
    placePageAt,
    spliceDocsAfter
  }
}

export type Collection = ReturnType<typeof useCollection>
