// SPDX-License-Identifier: MIT
import { useEffect, useMemo, useRef, useState } from 'react'
import SignaturePad from 'signature_pad'
import { CloseIcon } from '../icons'
import { useMarkLibrary } from '../../app/useMarkLibrary'
import { typedSignatureToPng, fileToTrimmedPng, trimToPng } from './signature-render'
import type { MarkAsset, MarkKind, MarkRole } from '../../pdfx/sign/types'

type CaptureTab = 'draw' | 'type' | 'upload' | 'saved'

interface SignatureCaptureProps {
  onClose: () => void
  onPick?: (mark: MarkAsset) => void
}

const ROLES: Array<{ value: MarkRole; label: string }> = [
  { value: 'signature', label: 'Signature' },
  { value: 'initials', label: 'Initials' }
]

const TABS: Array<{ value: CaptureTab; label: string }> = [
  { value: 'draw', label: 'Draw' },
  { value: 'type', label: 'Type' },
  { value: 'upload', label: 'Upload' },
  { value: 'saved', label: 'Saved' }
]

// Returns an object URL for `blob` for the component's lifetime, revoking the previous
// one whenever `blob` changes and on unmount. Guarded: environments without
// URL.createObjectURL (jsdom in tests) get `null` instead of a thrown error.
function useObjectUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blob || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])

  return url
}

export function SignatureCapture({ onClose, onPick }: SignatureCaptureProps): React.JSX.Element {
  const { marks, loading, error, save, remove } = useMarkLibrary()

  const [role, setRole] = useState<MarkRole>('signature')
  const [tab, setTab] = useState<CaptureTab>('draw')
  const [typedText, setTypedText] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [drawEmpty, setDrawEmpty] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const padRef = useRef<SignaturePad | null>(null)

  // Close on Esc, matching the app's other overlay (FullView).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // Wire signature_pad to the draw canvas once on mount. The canvas stays mounted
  // (just visually hidden) while other tabs are active, so a drawing survives tab
  // switches. Guarded: jsdom (component tests) has no real 2d context, so this
  // becomes a safe no-op instead of throwing when `new SignaturePad(...)` would
  // otherwise dereference a null context.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.max(Math.round((rect.width || canvas.clientWidth || 500) * ratio), 1)
    canvas.height = Math.max(Math.round((rect.height || canvas.clientHeight || 200) * ratio), 1)

    const ctx = canvas.getContext('2d')
    if (!ctx) return // No real canvas support (jsdom) — leave the draw tab visually inert.
    ctx.scale(ratio, ratio)

    const pad = new SignaturePad(canvas, { backgroundColor: 'rgba(0,0,0,0)' })
    padRef.current = pad
    const syncEmpty = (): void => setDrawEmpty(pad.isEmpty())
    pad.addEventListener('beginStroke', syncEmpty)
    pad.addEventListener('endStroke', syncEmpty)

    return () => {
      pad.off()
      pad.removeEventListener('beginStroke', syncEmpty)
      pad.removeEventListener('endStroke', syncEmpty)
      padRef.current = null
    }
  }, [])

  const handleClearDraw = (): void => {
    padRef.current?.clear()
    setDrawEmpty(true)
  }

  // BLANK GUARD: never allow Save on an empty capture. A blank draw pad, an empty
  // typed name, or no chosen file would otherwise round-trip through the trim helpers
  // into a full-size, fully opaque white PNG (keyOutWhiteAndTrim returns the source
  // image unchanged when nothing survives the white-key), which is not a usable mark.
  const canSave =
    tab === 'draw'
      ? !drawEmpty
      : tab === 'type'
        ? typedText.trim().length > 0
        : tab === 'upload'
          ? uploadFile !== null
          : false

  const handleSave = async (): Promise<void> => {
    if (!canSave || saving) return
    setSaveError(null)
    try {
      let built: { png: Uint8Array; width: number; height: number }
      let kind: MarkKind
      if (tab === 'draw') {
        const canvas = canvasRef.current
        if (!canvas) return
        kind = 'draw'
        built = await trimToPng(canvas)
      } else if (tab === 'type') {
        kind = 'type'
        built = await typedSignatureToPng(typedText.trim())
      } else {
        if (!uploadFile) return
        kind = 'image'
        built = await fileToTrimmedPng(uploadFile)
      }
      if (built.width <= 0 || built.height <= 0) {
        setSaveError('Could not capture a mark — please try again.')
        return
      }

      setSaving(true)
      const created = await save({
        role,
        kind,
        width: built.width,
        height: built.height,
        png: built.png
      })
      setSaving(false)

      if (created) {
        if (kind === 'draw') handleClearDraw()
        if (kind === 'type') setTypedText('')
        if (kind === 'image') setUploadFile(null)
        setTab('saved')
      }
    } catch (e) {
      setSaving(false)
      setSaveError(String(e))
    }
  }

  const handlePick = (mark: MarkAsset): void => {
    if (!onPick) return
    onPick(mark)
    onClose()
  }

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) onClose()
  }

  return (
    <div className="sign-modal-backdrop" onClick={handleBackdropClick}>
      <div className="sign-modal" role="dialog" aria-modal="true" aria-label="Signatures">
        <header className="sign-modal-header">
          <h2 className="sign-modal-title">Signatures</h2>
          <button className="icon-btn" title="Close (Esc)" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </header>

        <div className="sign-role-toggle">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              className={`sign-role-btn${role === r.value ? ' active' : ''}`}
              aria-pressed={role === r.value}
              onClick={() => setRole(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="sign-tabs">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`sign-tab${tab === t.value ? ' active' : ''}`}
              onClick={() => setTab(t.value)}
            >
              {t.label}
              {t.value === 'saved' && marks.length > 0 ? ` (${marks.length})` : ''}
            </button>
          ))}
        </div>

        {(saveError || error) && <div className="sign-error">{saveError ?? error}</div>}

        <div className="sign-tab-body">
          <DrawTab
            hidden={tab !== 'draw'}
            canvasRef={canvasRef}
            empty={drawEmpty}
            onClear={handleClearDraw}
          />
          <TypeTab hidden={tab !== 'type'} value={typedText} onChange={setTypedText} />
          <UploadTab hidden={tab !== 'upload'} file={uploadFile} onChange={setUploadFile} />
          <SavedTab
            hidden={tab !== 'saved'}
            marks={marks}
            loading={loading}
            onDelete={remove}
            onPick={onPick ? handlePick : undefined}
          />
        </div>

        {tab !== 'saved' && (
          <footer className="sign-modal-footer">
            <button
              className="btn glass"
              disabled={!canSave || saving}
              onClick={() => void handleSave()}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </footer>
        )}
      </div>
    </div>
  )
}

interface DrawTabProps {
  hidden: boolean
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  empty: boolean
  onClear: () => void
}

function DrawTab({ hidden, canvasRef, empty, onClear }: DrawTabProps): React.JSX.Element {
  return (
    <div className={`sign-tab-panel${hidden ? ' sign-tab-panel-hidden' : ''}`}>
      <canvas ref={canvasRef} className="sign-canvas" />
      <div className="sign-tab-actions">
        <button className="btn ghost" onClick={onClear} disabled={empty}>
          Clear
        </button>
      </div>
    </div>
  )
}

interface TypeTabProps {
  hidden: boolean
  value: string
  onChange: (value: string) => void
}

function TypeTab({ hidden, value, onChange }: TypeTabProps): React.JSX.Element {
  const trimmed = value.trim()
  return (
    <div className={`sign-tab-panel${hidden ? ' sign-tab-panel-hidden' : ''}`}>
      <input
        type="text"
        className="sign-type-input"
        placeholder="Type your name"
        spellCheck={false}
        autoComplete="off"
        value={value}
        maxLength={80}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="sign-type-preview">{trimmed || 'Preview'}</div>
    </div>
  )
}

interface UploadTabProps {
  hidden: boolean
  file: File | null
  onChange: (file: File | null) => void
}

function UploadTab({ hidden, file, onChange }: UploadTabProps): React.JSX.Element {
  const previewUrl = useObjectUrl(file)
  return (
    <div className={`sign-tab-panel${hidden ? ' sign-tab-panel-hidden' : ''}`}>
      <input
        type="file"
        accept="image/*"
        className="sign-upload-input"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <div className="sign-upload-preview">
        {previewUrl ? (
          <img src={previewUrl} alt="Upload preview" />
        ) : (
          <span className="sign-upload-empty">{file ? file.name : 'No file selected'}</span>
        )}
      </div>
    </div>
  )
}

interface SavedTabProps {
  hidden: boolean
  marks: MarkAsset[]
  loading: boolean
  onDelete: (id: string) => void
  onPick?: (mark: MarkAsset) => void
}

function SavedTab({ hidden, marks, loading, onDelete, onPick }: SavedTabProps): React.JSX.Element {
  return (
    <div className={`sign-tab-panel${hidden ? ' sign-tab-panel-hidden' : ''}`}>
      {loading && marks.length === 0 ? (
        <div className="sign-empty">Loading…</div>
      ) : marks.length === 0 ? (
        <div className="sign-empty">No saved marks yet.</div>
      ) : (
        <div className="sign-saved-grid">
          {marks.map((mark) => (
            <SavedThumb key={mark.id} mark={mark} onDelete={onDelete} onPick={onPick} />
          ))}
        </div>
      )}
    </div>
  )
}

interface SavedThumbProps {
  mark: MarkAsset
  onDelete: (id: string) => void
  onPick?: (mark: MarkAsset) => void
}

function SavedThumb({ mark, onDelete, onPick }: SavedThumbProps): React.JSX.Element {
  // `new Uint8Array(mark.png)` (copy overload) types as Uint8Array<ArrayBuffer>, which
  // satisfies BlobPart; the bare Uint8Array<ArrayBufferLike> field does not (matches
  // the same workaround already used in pdfx/images.ts's toBlob()).
  const blob = useMemo(
    () => new Blob([new Uint8Array(mark.png)], { type: 'image/png' }),
    [mark.png]
  )
  const url = useObjectUrl(blob)
  const roleLabel = mark.role === 'signature' ? 'Signature' : 'Initials'

  return (
    <div
      className={`sign-thumb${onPick ? ' pickable' : ''}`}
      role={onPick ? 'button' : undefined}
      tabIndex={onPick ? 0 : undefined}
      title={onPick ? `Use this ${roleLabel.toLowerCase()}` : roleLabel}
      onClick={onPick ? () => onPick(mark) : undefined}
      onKeyDown={
        onPick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onPick(mark)
              }
            }
          : undefined
      }
    >
      <div className="sign-thumb-image">
        {url ? (
          <img src={url} alt={`${roleLabel} mark`} />
        ) : (
          <span className="sign-thumb-fallback">{roleLabel}</span>
        )}
      </div>
      <div className="sign-thumb-meta">
        <span className="sign-thumb-role">{roleLabel}</span>
        <button
          className="icon-btn"
          title="Delete"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(mark.id)
          }}
        >
          <CloseIcon size={13} />
        </button>
      </div>
    </div>
  )
}
