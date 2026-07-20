import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from '../icons'
import { isMac } from './geometry'
import type { EditTool } from '../../edit/types'

interface FullViewChromeProps {
  chromeOpacity: number
  docName: string
  pi: number
  pageCount: number
  editing: boolean
  tool: EditTool | null
  canRevert: boolean
  onEnterEdit: () => void
  onFinishEdit: () => void
  onRevert: () => void
  onToggleTool: (tool: EditTool) => void
  runClose: () => void
  navByKey: (axis: 'x' | 'y', dir: 1 | -1) => void
}

export function FullViewChrome({
  chromeOpacity,
  docName,
  pi,
  pageCount,
  editing,
  tool,
  canRevert,
  onEnterEdit,
  onFinishEdit,
  onRevert,
  onToggleTool,
  runClose,
  navByKey
}: FullViewChromeProps): React.JSX.Element {
  return (
    <div className="full-chrome" style={{ opacity: chromeOpacity }}>
      <header className={`full-bar${isMac ? ' mac' : ''}`}>
        <span className="full-title">{docName}</span>
        <div className="full-actions">
          {editing ? (
            <>
              <button
                className={`btn glass${tool === 'draw' ? ' on' : ''}`}
                aria-pressed={tool === 'draw'}
                onClick={() => onToggleTool('draw')}
              >
                Sign
              </button>
              <button
                className={`btn glass${tool === 'text' ? ' on' : ''}`}
                aria-pressed={tool === 'text'}
                onClick={() => onToggleTool('text')}
              >
                Add Text
              </button>
              <button
                className={`btn glass${tool === 'highlight' ? ' on' : ''}`}
                aria-pressed={tool === 'highlight'}
                onClick={() => onToggleTool('highlight')}
              >
                Highlight
              </button>
              <button
                className={`btn glass${tool === 'redact' ? ' on' : ''}`}
                aria-pressed={tool === 'redact'}
                onClick={() => onToggleTool('redact')}
              >
                Hide Text
              </button>
              <button className="btn glass" disabled={!canRevert} onClick={onRevert}>
                Revert
              </button>
              <button className="btn yellow" onClick={onFinishEdit}>
                Done
              </button>
            </>
          ) : (
            <button className="btn glass" onClick={onEnterEdit}>
              Edit
            </button>
          )}
          <button className="icon-btn" title="Close (Esc)" onClick={runClose}>
            <CloseIcon size={16} />
          </button>
        </div>
      </header>

      <button
        className="full-nav prev"
        disabled={pi === 0}
        onClick={() => navByKey('x', -1)}
        title="Previous page (←)"
      >
        <ChevronLeftIcon size={18} />
      </button>
      <button
        className="full-nav next"
        disabled={pi === pageCount - 1}
        onClick={() => navByKey('x', 1)}
        title="Next page (→)"
      >
        <ChevronRightIcon size={18} />
      </button>

      <div className="full-count">
        {pi + 1} / {pageCount}
      </div>
    </div>
  )
}
