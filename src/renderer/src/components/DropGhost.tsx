import { ADD_PAGE_WIDTH, BASE_PAGE_HEIGHT } from '../canvas/layout'
import { DashedBorder } from './dashed-border'
import { PlusIcon } from './icons'

const ROW_PAD_Y = 52 + 20

export interface GhostSize {
  width: number
  height: number
}

interface GhostPageProps extends GhostSize {
  grow?: boolean
}

export function GhostPage({ width, height, grow }: GhostPageProps): React.JSX.Element {
  return (
    <div
      className={'page ghost' + (grow ? ' grow' : '')}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}

interface AddPageGhostProps extends GhostSize {
  onClick: () => void
}

export function AddPageGhost({ width, height, onClick }: AddPageGhostProps): React.JSX.Element {
  return (
    <button
      type="button"
      className="page add-ghost add-page"
      style={{ width, height }}
      title="Add page"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <DashedBorder width={width} height={height} radius={9} />
      <PlusIcon size={24} />
      <span className="add-label">Add page</span>
    </button>
  )
}

interface AddDocGhostProps {
  width: number
  onClick: () => void
}

export function AddDocGhost({ width, onClick }: AddDocGhostProps): React.JSX.Element {
  const height = ROW_PAD_Y + BASE_PAGE_HEIGHT
  return (
    <button
      type="button"
      className="add-doc-row"
      style={{ width, height }}
      title="Add document"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <DashedBorder width={width} height={height} radius={23} />
      <span
        className="add-ghost add-doc-page"
        style={{ width: ADD_PAGE_WIDTH, height: BASE_PAGE_HEIGHT }}
      >
        <PlusIcon size={24} />
        <span className="add-label">Add document</span>
      </span>
    </button>
  )
}

interface GhostRowProps {
  width: number
  pageHeight: number
  pages: GhostSize[]
}

export function GhostRow({ width, pageHeight, pages }: GhostRowProps): React.JSX.Element {
  return (
    <div className="doc-row ghost" style={{ width }} aria-hidden="true">
      <div className="ghost-strip">
        {pages.map((p, i) => (
          <GhostPage key={i} width={p.width} height={pageHeight} />
        ))}
      </div>
    </div>
  )
}
