import type { DocEntry } from '../../types'
import type { View } from './geometry'
import type { EditTool, MarkMap, MarkRect } from '../../edit/types'
import { FullViewPage } from './FullViewPage'
import { useFullViewDrag } from './use-full-view-drag'

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
  setView: React.Dispatch<React.SetStateAction<View>>
  resetView: () => void
  applyZoom: (nextZoom: (z: number) => number, focal?: { x: number; y: number }) => void
  runClose: () => void
}

export function FullViewPages(props: FullViewPagesProps): React.JSX.Element {
  const { scrollRef, drag, draggedRef, docs, viewport, di, pi } = props
  const { view, fit, vw, vh, zoomed, interactive, animating, flip, flipTransition } = props
  const { renderVersion, marks, selectTool, onMark } = props
  const { setView, resetView, applyZoom, runClose } = props

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
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={(e) => {
        if (draggedRef.current) {
          draggedRef.current = false
          return
        }
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
              resetView={resetView}
              applyZoom={applyZoom}
            />
          ))}
        </section>
      ))}
    </div>
  )
}
