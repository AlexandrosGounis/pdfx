import { useRef } from 'react'
import type { DocEntry } from '../../types'
import type { View } from './geometry'
import type { EditTool, MarkMap, MarkRect } from '../../edit/types'
import type { FieldValue, FormValues, FormValuesBySource } from '../../forms/types'
import { FullViewPage } from './FullViewPage'
import { useFullViewDrag } from './use-full-view-drag'

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
  selectTool: EditTool | null
  onMark: (pageId: string, rects: MarkRect[]) => void
  formValues: FormValuesBySource
  onFieldChange: (sourceId: string, fieldName: string, value: FieldValue) => void
  setView: React.Dispatch<React.SetStateAction<View>>
  resetView: () => void
  applyZoom: (nextZoom: (z: number) => number, focal?: { x: number; y: number }) => void
  runClose: () => void
}

const isEditableElement = (el: Element | null): boolean =>
  !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')

export function FullViewPages(props: FullViewPagesProps): React.JSX.Element {
  const { scrollRef, drag, draggedRef, docs, viewport, di, pi } = props
  const { view, fit, vw, vh, zoomed, interactive, animating, flip, flipTransition } = props
  const { renderVersion, marks, selectTool, onMark, formValues, onFieldChange } = props
  const { setView, resetView, applyZoom, runClose } = props
  const editableFocusRef = useRef(false)

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
      onPointerDownCapture={() => {
        editableFocusRef.current = isEditableElement(document.activeElement)
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={(e) => {
        const wasTyping = editableFocusRef.current
        editableFocusRef.current = false
        if (draggedRef.current) {
          draggedRef.current = false
          return
        }
        if (wasTyping) return
        if (!(e.target as HTMLElement).closest('.full-page')) runClose()
      }}
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
              resetView={resetView}
              applyZoom={applyZoom}
            />
          ))}
        </section>
      ))}
    </div>
  )
}
