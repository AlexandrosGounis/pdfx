import { memo } from 'react'
import { BASE_PAGE_HEIGHT, DOC_SLOT } from '../../canvas/layout'
import { DocumentRow } from '../DocumentRow'
import type { DocPlacement } from '../../canvas/layout'
import type { PageRef } from '../../app/types'
import type { MarkMap } from '../../edit/types'

interface DocLayerProps {
  items: DocPlacement[]
  renderVersion: number
  selected: PageRef | null
  pagesDraggable: boolean
  collapsedId: string | null
  draggingPage: PageRef | null
  hiddenPageId: string | null
  marks: MarkMap
  intoDocId: string | null
  intoIndex: number
  intoGhostWidth: number
  intoGhostHeight: number
  betweenIndex: number
  onSelectPage: (docId: string, pageId: string) => void
  onOpenPage: (docId: string, pageId: string) => void
  onPageDragStart: (docId: string, pageId: string) => void
  onPageDragEnd: () => void
  onAddPage: (docId: string) => void
}

function DocLayerImpl(props: DocLayerProps): React.JSX.Element {
  const { items, intoDocId, intoIndex, intoGhostWidth, intoGhostHeight, betweenIndex } = props
  return (
    <>
      {items.map((item, index) => {
        const doc = item.doc
        const shifted = betweenIndex !== -1 && index >= betweenIndex
        return (
          <div
            key={doc.id}
            className="canvas-doc"
            style={{
              left: item.x,
              top: item.y,
              width: item.width,
              transform: shifted ? `translateY(${DOC_SLOT}px)` : undefined
            }}
          >
            <DocumentRow
              doc={doc}
              pageHeight={BASE_PAGE_HEIGHT}
              renderVersion={props.renderVersion}
              selectedPageId={props.selected?.docId === doc.id ? props.selected.pageId : null}
              pagesDraggable={props.pagesDraggable}
              collapseId={
                props.collapsedId && props.draggingPage?.docId === doc.id ? props.collapsedId : null
              }
              hiddenPageId={
                props.hiddenPageId && doc.pages.some((p) => p.id === props.hiddenPageId)
                  ? props.hiddenPageId
                  : null
              }
              marks={props.marks}
              intoGhost={
                intoDocId === doc.id
                  ? { index: intoIndex, width: intoGhostWidth, height: intoGhostHeight }
                  : null
              }
              onSelectPage={props.onSelectPage}
              onOpenPage={props.onOpenPage}
              onPageDragStart={props.onPageDragStart}
              onPageDragEnd={props.onPageDragEnd}
              onAddPage={props.onAddPage}
            />
          </div>
        )
      })}
    </>
  )
}

export const DocLayer = memo(DocLayerImpl)
