import type { PageEntry } from '../../types'
import { PageView } from '../PageView'
import { useFindState } from '../../search/FindContext'
import type { View } from './geometry'
import { DOUBLE_CLICK_ZOOM, fitInto, TRANSITION_MS } from './geometry'

interface FullViewPageProps {
  page: PageEntry
  viewport: { w: number; h: number }
  isCurrent: boolean
  view: View
  zoomed: boolean
  interactive: boolean
  animating: boolean
  flip: string | null
  flipTransition: boolean
  renderVersion: number
  resetView: () => void
  applyZoom: (nextZoom: (z: number) => number, focal?: { x: number; y: number }) => void
}

export function FullViewPage(props: FullViewPageProps): React.JSX.Element {
  const { page: p, viewport, isCurrent, view, zoomed, interactive, animating } = props
  const { flip, flipTransition, renderVersion, resetView, applyZoom } = props

  const { active, query, matchingPageIds, getOcrWords } = useFindState()
  const highlight = active && isCurrent && matchingPageIds.has(p.id)

  const size = fitInto(p.width, p.height, viewport)
  let style: React.CSSProperties = { width: size.w, height: size.h }
  if (isCurrent && animating) {
    style = {
      ...style,
      transform: flip ?? 'none',
      transformOrigin: 'top left',
      transition: flipTransition
        ? `transform ${TRANSITION_MS - 20}ms cubic-bezier(0.2, 0, 0, 1)`
        : 'none',
      willChange: 'transform'
    }
  } else if (isCurrent && zoomed) {
    style = {
      ...style,
      transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
      transformOrigin: 'center center',
      willChange: 'transform'
    }
  }
  return (
    <div className="full-slide">
      <div
        className="full-page"
        style={style}
        onDoubleClick={
          isCurrent && interactive
            ? (e) =>
                zoomed
                  ? resetView()
                  : applyZoom(() => DOUBLE_CLICK_ZOOM, { x: e.clientX, y: e.clientY })
            : undefined
        }
      >
        <PageView
          pdf={p.source.pdf}
          pageNumber={p.pageIndex + 1}
          naturalWidth={p.width}
          naturalHeight={p.height}
          version={isCurrent ? renderVersion : 0}
          eager={isCurrent}
          highlightQuery={highlight ? query : undefined}
          ocrWords={highlight ? getOcrWords(`${p.source.id}:${p.pageIndex}`) : undefined}
        />
      </div>
    </div>
  )
}
