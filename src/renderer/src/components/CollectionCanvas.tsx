import { BASE_PAGE_HEIGHT, MIN_DOC_WIDTH, betweenSlotY } from '../canvas/layout'
import { Canvas } from './Canvas'
import { EmptyState } from './EmptyState'
import { AddDocGhost, GhostRow } from './DropGhost'
import { DocLayer } from './collection/DocLayer'
import { HeaderLayer } from './collection/HeaderLayer'
import { deriveDropGhosts } from './collection/ghost-size'
import type { CanvasHandle } from './Canvas'
import type { CanvasLayout, DropTarget } from '../canvas/layout'
import type { PageRef } from '../app/types'
import type { DocEntry } from '../types'
import type { MarkMap } from '../edit/types'
import type { FormValuesBySource } from '../forms/types'
import type { ElementMap } from '../elements/types'

interface CollectionCanvasProps {
  docs: DocEntry[]
  layout: CanvasLayout
  busy: boolean
  pagesDraggable: boolean
  renderVersion: number
  selected: PageRef | null
  hiddenPageId: string | null
  marks: MarkMap
  formValues: FormValuesBySource
  elements: ElementMap
  dragKind: 'internal' | 'external' | null
  draggingPage: PageRef | null
  dropTarget: DropTarget | null
  collapsedId: string | null
  externalCount: number
  canvasRef: React.Ref<CanvasHandle>
  onScaleChange: (scale: number) => void
  onSettle: () => void
  onBackgroundClick: () => void
  onOpen: () => void
  onSelectPage: (docId: string, pageId: string) => void
  onOpenPage: (docId: string, pageId: string) => void
  onPageDragStart: (docId: string, pageId: string) => void
  onPageDragEnd: () => void
  onAddPage: (docId: string) => void
  onMoveDoc: (docId: string, direction: -1 | 1) => void
  onRemoveDoc: (docId: string) => void
  onRenameDoc: (docId: string, name: string) => void
}

export function CollectionCanvas(props: CollectionCanvasProps): React.JSX.Element {
  const { docs, layout, dragKind, draggingPage, dropTarget, externalCount } = props

  const { intoDocId, intoIndex, betweenIndex, ghostSize, betweenPages } = deriveDropGhosts(
    docs,
    draggingPage,
    dropTarget,
    dragKind,
    externalCount
  )

  if (docs.length === 0) {
    return (
      <>
        <EmptyState busy={props.busy} dragging={dragKind === 'external'} onOpen={props.onOpen} />
        {dragKind === 'external' && (
          <div className="empty-drop-stage">
            <GhostRow width={MIN_DOC_WIDTH} pageHeight={BASE_PAGE_HEIGHT} pages={betweenPages} />
          </div>
        )}
      </>
    )
  }

  return (
    <Canvas
      ref={props.canvasRef}
      contentWidth={layout.contentWidth}
      contentHeight={layout.contentHeight}
      slotHeight={layout.slotHeight}
      dragging={dragKind !== null}
      onScaleChange={props.onScaleChange}
      onSettle={props.onSettle}
      onBackgroundClick={props.onBackgroundClick}
      overlay={
        <HeaderLayer
          items={layout.items}
          betweenIndex={betweenIndex}
          onMove={props.onMoveDoc}
          onRemove={props.onRemoveDoc}
          onRename={props.onRenameDoc}
        />
      }
    >
      <DocLayer
        items={layout.items}
        renderVersion={props.renderVersion}
        selected={props.selected}
        pagesDraggable={props.pagesDraggable}
        collapsedId={props.collapsedId}
        draggingPage={draggingPage}
        hiddenPageId={props.hiddenPageId}
        marks={props.marks}
        formValues={props.formValues}
        elements={props.elements}
        intoDocId={intoDocId}
        intoIndex={intoIndex}
        intoGhostWidth={ghostSize.width}
        intoGhostHeight={ghostSize.height}
        betweenIndex={betweenIndex}
        onSelectPage={props.onSelectPage}
        onOpenPage={props.onOpenPage}
        onPageDragStart={props.onPageDragStart}
        onPageDragEnd={props.onPageDragEnd}
        onAddPage={props.onAddPage}
      />
      {dropTarget?.kind === 'between' && (
        <div
          className="canvas-doc ghost-doc"
          style={{ left: 0, top: betweenSlotY(layout, dropTarget.docIndex), width: MIN_DOC_WIDTH }}
        >
          <GhostRow width={MIN_DOC_WIDTH} pageHeight={BASE_PAGE_HEIGHT} pages={betweenPages} />
        </div>
      )}
      <div
        className="canvas-doc"
        style={{ left: 0, top: betweenSlotY(layout, layout.items.length), width: MIN_DOC_WIDTH }}
      >
        <AddDocGhost width={MIN_DOC_WIDTH} onClick={props.onOpen} />
      </div>
    </Canvas>
  )
}
