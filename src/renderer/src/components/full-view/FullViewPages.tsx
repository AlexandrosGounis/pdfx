import type { DocEntry } from '../../types'
import type { View } from './geometry'
import type { EditTool, MarkMap, MarkRect } from '../../edit/types'
import type { FieldValue, FormValues, FormValuesBySource } from '../../forms/types'
import type { ElementMap, ElementPoint } from '../../elements/types'
import type { TextSpan } from '../../elements/text-marks'
import { FullViewPage } from './FullViewPage'
import { useFullViewDrag } from './use-full-view-drag'
import { useCloseGuard } from './use-close-guard'

const NO_VALUES: FormValues = {}

interface FullViewPagesProps {
  scrollRef: React.RefObject<HTMLDivElement | null>
  drag: React.MutableRefObject<{ x: number; y: number; panX: number; panY: number } | null>
  draggedRef: React.MutableRefObject<boolean>
  docs: DocEntry[]
  viewport: { w: number; h: number }
  di: number
  pi: number
  view: View
  fit: { w: number; h: number }
  vw: number
  vh: number
  zoomed: boolean
  interactive: boolean
  animating: boolean
  flip: string | null
  flipTransition: boolean
  renderVersion: number
  marks: MarkMap
  hasSelection: boolean
  selectTool: EditTool | null
  onMark: (pageId: string, rects: MarkRect[]) => void
  formValues: FormValuesBySource
  onFieldChange: (sourceId: string, fieldName: string, value: FieldValue) => void
  elements: ElementMap
  selectedElementId: string | null
  onSelectElement: (pageId: string, id: string | null) => void
  onMoveElement: (pageId: string, id: string, dx: number, dy: number) => void
  onDraw: (pageId: string, points: ElementPoint[], pageWidth: number, pageHeight: number) => void
  onAddText: (
    pageId: string,
    text: string,
    origin: ElementPoint,
    pageWidth: number,
    pageHeight: number
  ) => void
  onMarkText: (pageId: string, id: string, span: TextSpan) => void
  onUpdateText: (
    pageId: string,
    id: string,
    text: string,
    pageWidth: number,
    pageHeight: number
  ) => void
  setView: React.Dispatch<React.SetStateAction<View>>
  resetView: () => void
  applyZoom: (nextZoom: (z: number) => number, focal?: { x: number; y: number }) => void
  runClose: () => void
}

export function FullViewPages(props: FullViewPagesProps): React.JSX.Element {
  const { scrollRef, drag, draggedRef, docs, viewport, di, pi } = props
  const { view, fit, vw, vh, zoomed, interactive, animating, flip, flipTransition } = props
  const { renderVersion, marks, hasSelection, selectTool, onMark, formValues, onFieldChange } =
    props
  const { elements, selectedElementId, onSelectElement, onMoveElement, onDraw } = props
  const { onAddText, onMarkText, onUpdateText } = props
  const { setView, resetView, applyZoom, runClose } = props
  const closeGuard = useCloseGuard(hasSelection, draggedRef, runClose)

  const { onPointerDown, onPointerMove, endDrag } = useFullViewDrag({
    drag,
    draggedRef,
    view,
    fit,
    vw,
    vh,
    zoomed,
    interactive,
    setView
  })

  return (
    <div
      className={`full-scroll${zoomed || animating ? ' locked' : ''}${zoomed ? ' pannable' : ''}`}
      ref={scrollRef}
      onPointerDownCapture={closeGuard.onPressCapture}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={closeGuard.onClick}
    >
      {docs.map((d, ddi) => (
        <section className="full-doc" key={d.id}>
          {d.pages.map((p, ppi) => (
            <FullViewPage
              key={p.id}
              page={p}
              viewport={viewport}
              isCurrent={ddi === di && ppi === pi}
              view={view}
              zoomed={zoomed}
              interactive={interactive}
              animating={animating}
              flip={flip}
              flipTransition={flipTransition}
              renderVersion={renderVersion}
              marks={marks[p.id]}
              selectTool={selectTool}
              onMark={(rects) => onMark(p.id, rects)}
              formValues={formValues[p.source.id] ?? NO_VALUES}
              onField={(fieldName, value) => onFieldChange(p.source.id, fieldName, value)}
              elements={elements[p.id]}
              selectedElementId={selectedElementId}
              onSelectElement={(id) => onSelectElement(p.id, id)}
              onMoveElement={(id, dx, dy) => onMoveElement(p.id, id, dx, dy)}
              onDraw={(points) => onDraw(p.id, points, p.width, p.height)}
              onAddText={(text, origin) => onAddText(p.id, text, origin, p.width, p.height)}
              onMarkText={(id, span) => onMarkText(p.id, id, span)}
              onUpdateText={(id, text) => onUpdateText(p.id, id, text, p.width, p.height)}
              resetView={resetView}
              applyZoom={applyZoom}
            />
          ))}
        </section>
      ))}
    </div>
  )
}
