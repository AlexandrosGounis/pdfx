import { memo } from 'react'
import type { DocEntry } from '../types'
import type { MarkMap } from '../edit/types'
import type { FormValuesBySource } from '../forms/types'
import type { ElementMap } from '../elements/types'
import { ADD_PAGE_WIDTH } from '../canvas/layout'
import { AddPageGhost, GhostPage } from './DropGhost'
import { PageCell } from './page-cell'
import { useFindState } from '../search/FindContext'

interface DocumentRowProps {
  doc: DocEntry
  pageHeight: number
  renderVersion: number
  selectedPageId: string | null
  pagesDraggable: boolean
  collapseId: string | null
  hiddenPageId: string | null
  marks: MarkMap
  formValues: FormValuesBySource
  elements: ElementMap
  intoGhost: { index: number; width: number; height: number } | null
  onSelectPage: (docId: string, pageId: string) => void
  onOpenPage: (docId: string, pageId: string) => void
  onPageDragStart: (docId: string, pageId: string) => void
  onPageDragEnd: () => void
  onAddPage: (docId: string) => void
}

function DocumentRowImpl({
  doc,
  pageHeight,
  renderVersion,
  selectedPageId,
  pagesDraggable,
  collapseId,
  hiddenPageId,
  marks,
  formValues,
  elements,
  intoGhost,
  onSelectPage,
  onOpenPage,
  onPageDragStart,
  onPageDragEnd,
  onAddPage
}: DocumentRowProps): React.JSX.Element {
  const { active, query, matchingDocIds, matchingPageIds, getOcrWords } = useFindState()
  const docDimmed = active && !matchingDocIds.has(doc.id)

  const strip: React.JSX.Element[] = []
  let visible = 0
  const emitGhost = (): void => {
    if (intoGhost && intoGhost.index === visible) {
      strip.push(
        <GhostPage key="__into_ghost" width={intoGhost.width} height={intoGhost.height} grow />
      )
    }
  }
  for (const page of doc.pages) {
    const collapsed = page.id === collapseId
    const matches = active && matchingPageIds.has(page.id)
    if (!collapsed) emitGhost()
    strip.push(
      <PageCell
        key={page.id}
        docId={doc.id}
        page={page}
        pageHeight={pageHeight}
        renderVersion={renderVersion}
        selected={page.id === selectedPageId}
        collapsed={collapsed}
        hidden={page.id === hiddenPageId}
        dimmed={active && !docDimmed && !matchingPageIds.has(page.id)}
        highlightQuery={matches ? query : undefined}
        ocrWords={matches ? getOcrWords(`${page.source.id}:${page.pageIndex}`) : undefined}
        marks={marks[page.id]}
        formValues={formValues[page.source.id]}
        elements={elements[page.id]}
        pagesDraggable={pagesDraggable}
        visibleNumber={visible + 1}
        onSelectPage={onSelectPage}
        onOpenPage={onOpenPage}
        onPageDragStart={onPageDragStart}
        onPageDragEnd={onPageDragEnd}
      />
    )
    if (!collapsed) visible++
  }
  emitGhost()
  strip.push(
    <AddPageGhost
      key="__add_page"
      width={ADD_PAGE_WIDTH}
      height={pageHeight}
      onClick={() => onAddPage(doc.id)}
    />
  )

  return (
    <section className={docDimmed ? 'doc-row dimmed' : 'doc-row'}>
      <div className="page-strip">
        <div className="page-strip-inner">{strip}</div>
      </div>
    </section>
  )
}

export const DocumentRow = memo(DocumentRowImpl)
