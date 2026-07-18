import { uniqueDocName } from '../names'
import type { DocEntry } from '../../types'
import type { PageRef } from '../types'
import type { PagePlacement } from '../undo'

export function movePageInto(
  docs: DocEntry[],
  source: PageRef,
  targetDocId: string,
  index: number
): DocEntry[] {
  const page = docs.find((d) => d.id === source.docId)?.pages.find((p) => p.id === source.pageId)
  if (!page) return docs
  if (source.docId === targetDocId) {
    const di = docs.findIndex((d) => d.id === targetDocId)
    const doc = docs[di]
    const without = doc.pages.filter((p) => p.id !== source.pageId)
    const to = Math.max(0, Math.min(without.length, index))
    const pages = [...without.slice(0, to), page, ...without.slice(to)]
    if (pages.length === doc.pages.length && pages.every((p, i) => p === doc.pages[i])) return docs
    const next = [...docs]
    next[di] = { ...doc, pages }
    return next
  }
  return docs
    .map((d) => {
      if (d.id === source.docId) {
        return { ...d, pages: d.pages.filter((p) => p.id !== source.pageId) }
      }
      if (d.id === targetDocId) {
        const clamped = Math.max(0, Math.min(d.pages.length, index))
        return { ...d, pages: [...d.pages.slice(0, clamped), page, ...d.pages.slice(clamped)] }
      }
      return d
    })
    .filter((d) => d.pages.length > 0)
}

export function movePageToNewDoc(
  docs: DocEntry[],
  source: PageRef,
  docIndex: number,
  newDocId: string
): DocEntry[] {
  const sdi = docs.findIndex((d) => d.id === source.docId)
  if (sdi === -1) return docs
  const sourceDoc = docs[sdi]
  const page = sourceDoc.pages.find((p) => p.id === source.pageId)
  if (!page) return docs
  const remaining = sourceDoc.pages.filter((p) => p.id !== source.pageId)
  let next = docs.map((d) => (d.id === source.docId ? { ...d, pages: remaining } : d))
  let insertAt = docIndex
  if (remaining.length === 0) {
    next = next.filter((d) => d.id !== source.docId)
    if (sdi < docIndex) insertAt -= 1
  }
  insertAt = Math.max(0, Math.min(next.length, insertAt))
  const name = uniqueDocName(sourceDoc.name, new Set(next.map((d) => d.name)))
  const newDoc: DocEntry = { id: newDocId, name, pages: [page] }
  return [...next.slice(0, insertAt), newDoc, ...next.slice(insertAt)]
}

export function pagePlacement(docs: DocEntry[], pageId: string): PagePlacement | null {
  const docIndex = docs.findIndex((d) => d.pages.some((p) => p.id === pageId))
  if (docIndex === -1) return null
  const doc = docs[docIndex]
  return {
    docId: doc.id,
    docName: doc.name,
    docIndex,
    pageIndex: doc.pages.findIndex((p) => p.id === pageId)
  }
}

export function placePage(docs: DocEntry[], pageId: string, at: PagePlacement): DocEntry[] {
  const holder = docs.find((d) => d.pages.some((p) => p.id === pageId))
  if (!holder) return docs
  if (docs.some((d) => d.id === at.docId)) {
    return movePageInto(docs, { docId: holder.id, pageId }, at.docId, at.pageIndex)
  }
  const page = holder.pages.find((p) => p.id === pageId)
  if (!page) return docs
  const remaining = docs
    .map((d) => (d.id === holder.id ? { ...d, pages: d.pages.filter((p) => p.id !== pageId) } : d))
    .filter((d) => d.pages.length > 0)
  const insertAt = Math.max(0, Math.min(remaining.length, at.docIndex))
  const restored: DocEntry = { id: at.docId, name: at.docName, pages: [page] }
  return [...remaining.slice(0, insertAt), restored, ...remaining.slice(insertAt)]
}
