// SPDX-License-Identifier: MIT
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSign } from './SignContext'
import { dateToPng } from './signature-render'
import type { MarkAsset, Placement, PlacementKind } from '../../pdfx/sign/types'

// Defaults for a freshly-added placement, as fractions of the rendered page.
const DEFAULT_IMG_W_FRAC = 0.28
const DEFAULT_DATE_H_FRAC = 0.03
const MIN_PX = 20

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function dateLabel(): string {
  // UTC to match signingTimestamp() — a single, universal basis for both options.
  return new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  })
}

function signingTimestamp(): string {
  // Date + time of signing in UTC — a universal, unambiguous zone.
  return new Date().toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
    timeZoneName: 'short'
  })
}

let measureCanvas: HTMLCanvasElement | null = null
// Width÷height (aspect) of a text run at the app's stamp font. Lets date / typed
// marks resize proportionally (aspect-locked) like image marks, so the box always
// hugs the text and never clips it — matching how the exporter draws it.
function measureTextAspect(text: string): number {
  if (!measureCanvas) measureCanvas = document.createElement('canvas')
  const ctx = measureCanvas.getContext('2d')
  if (!ctx) return Math.max(text.length * 0.5, 1)
  const EM = 100
  ctx.font = `${EM}px Helvetica, Arial, sans-serif`
  const w = ctx.measureText(text).width
  return w > 0 ? w / EM : Math.max(text.length * 0.5, 1)
}

// Encode PNG bytes as a data URL. Pure (unlike URL.createObjectURL), so it is
// safe under React StrictMode's double-invoked effects — no blob lifecycle to
// revoke early. Marks are small, so the ~33% base64 overhead is negligible.
function pngToDataUrl(png: Uint8Array): string {
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < png.length; i += CHUNK) {
    binary += String.fromCharCode(...png.subarray(i, i + CHUNK))
  }
  return `data:image/png;base64,${btoa(binary)}`
}

function buildMarkUrls(marks: MarkAsset[]): Map<string, string> {
  const urls = new Map<string, string>()
  for (const mk of marks) urls.set(mk.id, pngToDataUrl(mk.png))
  return urls
}

interface PxRect {
  x: number
  y: number
  w: number
  h: number
}

// ---- styles -------------------------------------------------------------
const toolbarStyle: React.CSSProperties = {
  position: 'absolute',
  top: 8,
  right: 8,
  pointerEvents: 'auto',
  display: 'flex',
  alignItems: 'flex-start',
  gap: 6,
  zIndex: 3
}

const btnBase: React.CSSProperties = {
  font: '600 12px/1 system-ui, sans-serif',
  color: '#fff',
  background: 'rgba(20,22,28,0.72)',
  border: '1px solid rgba(255,255,255,0.22)',
  borderRadius: 6,
  padding: '6px 10px',
  cursor: 'pointer',
  backdropFilter: 'blur(6px)',
  whiteSpace: 'nowrap'
}

const toggleOnStyle: React.CSSProperties = {
  ...btnBase,
  background: '#2f6df6',
  border: '1px solid #2f6df6'
}

const popoverStyle: React.CSSProperties = {
  position: 'absolute',
  top: 40,
  right: 0,
  width: 220,
  maxHeight: 260,
  overflowY: 'auto',
  padding: 8,
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 6,
  background: 'rgba(20,22,28,0.92)',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: 8,
  pointerEvents: 'auto'
}

const dateMenuStyle: React.CSSProperties = {
  position: 'absolute',
  top: 40,
  right: 0,
  minWidth: 200,
  padding: 6,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  background: 'rgba(20,22,28,0.92)',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: 8,
  pointerEvents: 'auto'
}

const dateItemStyle: React.CSSProperties = {
  font: '600 12px/1.2 system-ui, sans-serif',
  color: '#fff',
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 6,
  padding: '8px 10px',
  textAlign: 'left',
  cursor: 'pointer'
}

const thumbStyle: React.CSSProperties = {
  height: 52,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 4,
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.15)',
  borderRadius: 6,
  cursor: 'pointer'
}

const delBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: -10,
  right: -10,
  width: 20,
  height: 20,
  lineHeight: '18px',
  textAlign: 'center',
  font: '700 13px/1 system-ui, sans-serif',
  color: '#fff',
  background: '#d64545',
  border: '1px solid rgba(255,255,255,0.6)',
  borderRadius: '50%',
  cursor: 'pointer'
}

const resizeHandleStyle: React.CSSProperties = {
  position: 'absolute',
  right: -7,
  bottom: -7,
  width: 14,
  height: 14,
  background: '#4c8bf5',
  border: '2px solid #fff',
  borderRadius: '50%',
  cursor: 'nwse-resize',
  touchAction: 'none'
}

const allPagesBtnBase: React.CSSProperties = {
  position: 'absolute',
  left: -1,
  bottom: -24,
  font: '600 10px/1 system-ui, sans-serif',
  padding: '4px 6px',
  borderRadius: 5,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  border: '1px solid rgba(255,255,255,0.5)'
}

// ---- one placement box (image or text) ---------------------------------

interface BoxContent {
  kind: PlacementKind
  url?: string
  text?: string
  aspect: number | null // lock ratio for images; null = free (text)
}

function PlacementBox({
  placement,
  content,
  active,
  pageW,
  pageH,
  onCommit,
  onRemove,
  onCopyToAllPages
}: {
  placement: Placement
  content: BoxContent
  active: boolean
  pageW: number
  pageH: number
  onCommit: (patch: Pick<Placement, 'xFrac' | 'yFrac' | 'wFrac' | 'hFrac'>) => void
  onRemove: () => void
  onCopyToAllPages: () => void
}): React.JSX.Element {
  const seed = (): PxRect => ({
    x: placement.xFrac * pageW,
    y: placement.yFrac * pageH,
    w: placement.wFrac * pageW,
    h: placement.hFrac * pageH
  })
  const [rect, setRect] = useState<PxRect>(seed)
  const rectRef = useRef<PxRect>(rect)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const drag = useRef<{
    mode: 'move' | 'resize'
    startX: number
    startY: number
    orig: PxRect
  } | null>(null)

  useEffect(() => {
    const next = {
      x: placement.xFrac * pageW,
      y: placement.yFrac * pageH,
      w: placement.wFrac * pageW,
      h: placement.hFrac * pageH
    }
    rectRef.current = next
    setRect(next)
  }, [placement.xFrac, placement.yFrac, placement.wFrac, placement.hFrac, pageW, pageH])

  function apply(next: PxRect): void {
    rectRef.current = next
    setRect(next)
  }

  function begin(mode: 'move' | 'resize', e: React.PointerEvent): void {
    if (!active) return
    e.preventDefault()
    e.stopPropagation()
    boxRef.current?.setPointerCapture(e.pointerId)
    drag.current = { mode, startX: e.clientX, startY: e.clientY, orig: { ...rectRef.current } }
  }

  function onPointerMove(e: React.PointerEvent): void {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (d.mode === 'move') {
      apply({
        ...d.orig,
        x: clamp(d.orig.x + dx, 0, pageW - d.orig.w),
        y: clamp(d.orig.y + dy, 0, pageH - d.orig.h)
      })
    } else if (content.aspect) {
      let w = clamp(d.orig.w + dx, MIN_PX, pageW - d.orig.x)
      let h = w / content.aspect
      if (d.orig.y + h > pageH) {
        h = pageH - d.orig.y
        w = h * content.aspect
      }
      apply({ ...d.orig, w, h })
    } else {
      apply({
        ...d.orig,
        w: clamp(d.orig.w + dx, MIN_PX, pageW - d.orig.x),
        h: clamp(d.orig.h + dy, MIN_PX, pageH - d.orig.y)
      })
    }
  }

  function onPointerUp(e: React.PointerEvent): void {
    if (!drag.current) return
    drag.current = null
    boxRef.current?.releasePointerCapture(e.pointerId)
    const r = rectRef.current
    onCommit({ xFrac: r.x / pageW, yFrac: r.y / pageH, wFrac: r.w / pageW, hFrac: r.h / pageH })
  }

  return (
    <div
      ref={boxRef}
      className="sign-box"
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        pointerEvents: active ? 'auto' : 'none',
        cursor: active ? 'move' : 'default',
        // outline (not border) so the frame doesn't shrink/inset the content box —
        // the image then fills the exact placement rect, matching the exporter.
        outline: active ? '1px dashed #4c8bf5' : undefined,
        background: active ? 'rgba(76,139,245,0.06)' : 'transparent',
        touchAction: 'none'
      }}
      onPointerDown={(e) => begin('move', e)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {content.url ? (
        <img
          src={content.url}
          alt={content.kind}
          draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'fill', pointerEvents: 'none' }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontSize: Math.max(rect.h, 6),
            lineHeight: `${rect.h}px`,
            color: '#111',
            whiteSpace: 'nowrap',
            overflow: 'visible',
            pointerEvents: 'none'
          }}
        >
          {content.text}
        </div>
      )}

      {active && (
        <>
          <button
            type="button"
            title="Remove"
            style={delBtnStyle}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onRemove}
          >
            ×
          </button>
          <div style={resizeHandleStyle} onPointerDown={(e) => begin('resize', e)} />
          {content.kind === 'initials' && (
            <button
              type="button"
              title="Copy these initials onto every page (each stays editable)"
              style={{ ...allPagesBtnBase, color: '#fff', background: 'rgba(20,22,28,0.82)' }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onCopyToAllPages}
            >
              ⎘ All pages
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ---- the layer ----------------------------------------------------------

export function SignatureLayer({
  pageId,
  width,
  height
}: {
  pageId: string
  width: number
  height: number
}): React.JSX.Element {
  const sign = useSign()
  const { signMode, marks } = sign
  const placements = sign.forPage(pageId)
  const [picker, setPicker] = useState<null | 'signature' | 'initials' | 'date'>(null)

  const urls = useMemo(() => buildMarkUrls(marks), [marks])
  const markById = useMemo(() => new Map(marks.map((m) => [m.id, m])), [marks])

  // Cache inline-png (date) data URLs by placement id — computed once, so drags
  // (which re-render rapidly) don't re-encode base64 every frame.
  const pngUrlCache = useRef(new Map<string, string>())
  function pngUrlFor(p: Placement): string | undefined {
    if (!p.png) return undefined
    const cache = pngUrlCache.current
    let u = cache.get(p.id)
    if (!u) {
      u = pngToDataUrl(p.png)
      cache.set(p.id, u)
    }
    return u
  }

  const signatures = useMemo(() => marks.filter((m) => m.role === 'signature'), [marks])
  const initials = useMemo(() => marks.filter((m) => m.role === 'initials'), [marks])

  // Close any open picker when leaving sign mode.
  useEffect(() => {
    if (!signMode) setPicker(null)
  }, [signMode])

  function addImageMark(mark: MarkAsset, kind: 'signature' | 'initials'): void {
    const wFrac = DEFAULT_IMG_W_FRAC
    const hFrac = (wFrac * width * (mark.height / mark.width)) / height
    sign.add({
      pageId,
      kind,
      assetId: mark.id,
      xFrac: clamp(0.5 - wFrac / 2, 0, 1 - wFrac),
      yFrac: clamp(0.5 - hFrac / 2, 0, 1 - hFrac),
      wFrac,
      hFrac
    })
    setPicker(null)
  }

  async function addDate(withTime: boolean): Promise<void> {
    const hFrac = DEFAULT_DATE_H_FRAC
    const text = withTime ? signingTimestamp() : dateLabel()
    // Rasterize now so the date stamps as a flattened image (not selectable text).
    const { png, width: pw, height: ph } = await dateToPng(text)
    const aspect = pw / ph
    const wFrac = clamp((hFrac * height * aspect) / width, 0.05, 0.9)
    sign.add({
      pageId,
      kind: 'date',
      text,
      png,
      xFrac: clamp(0.5 - wFrac / 2, 0, 1 - wFrac),
      yFrac: 0.5 - hFrac / 2,
      wFrac,
      hFrac
    })
    setPicker(null)
  }

  function pickOrAdd(role: 'signature' | 'initials'): void {
    const pool = role === 'signature' ? signatures : initials
    if (pool.length === 1) addImageMark(pool[0], role)
    else if (pool.length > 1) setPicker((cur) => (cur === role ? null : role))
    // pool.length === 0 → button is disabled; nothing to do
  }

  const pickerPool = picker === 'signature' ? signatures : picker === 'initials' ? initials : []

  return (
    <div
      className="sign-layer"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <div style={toolbarStyle}>
        {signMode && (
          <>
            <button
              type="button"
              onClick={() => pickOrAdd('signature')}
              disabled={signatures.length === 0}
              title={
                signatures.length === 0
                  ? 'Save a signature first (Signatures button)'
                  : 'Add signature'
              }
              style={{ ...btnBase, opacity: signatures.length === 0 ? 0.5 : 1 }}
            >
              ＋ Signature{signatures.length > 1 ? ' ▾' : ''}
            </button>
            <button
              type="button"
              onClick={() => setPicker((cur) => (cur === 'date' ? null : 'date'))}
              title="Add date (optionally with time of signing)"
              style={btnBase}
            >
              ＋ Date ▾
            </button>
            <button
              type="button"
              onClick={() => pickOrAdd('initials')}
              disabled={initials.length === 0}
              title={
                initials.length === 0
                  ? 'Save initials first (Signatures ▸ Initials)'
                  : 'Add initials'
              }
              style={{ ...btnBase, opacity: initials.length === 0 ? 0.5 : 1 }}
            >
              ＋ Initials{initials.length > 1 ? ' ▾' : ''}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => sign.setSignMode(!signMode)}
          title={signMode ? 'Done placing — back to reading' : 'Place signatures on this page'}
          style={signMode ? toggleOnStyle : btnBase}
        >
          {signMode ? '✓ Done' : '✎ Sign'}
        </button>

        {picker === 'date' ? (
          <div style={dateMenuStyle}>
            <button type="button" style={dateItemStyle} onClick={() => void addDate(false)}>
              Date only — {dateLabel()}
            </button>
            <button type="button" style={dateItemStyle} onClick={() => void addDate(true)}>
              Date + time (UTC) — {signingTimestamp()}
            </button>
          </div>
        ) : picker ? (
          <div style={popoverStyle}>
            {pickerPool.map((m) => (
              <div
                key={m.id}
                role="button"
                tabIndex={0}
                title="Use this mark"
                style={thumbStyle}
                onClick={() => addImageMark(m, picker)}
              >
                <img
                  src={urls.get(m.id)}
                  alt={m.role}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {placements.map((p) => {
        const mark = p.assetId ? markById.get(p.assetId) : undefined
        const url = p.png ? pngUrlFor(p) : p.assetId ? urls.get(p.assetId) : undefined
        const content: BoxContent = {
          kind: p.kind,
          url,
          text: p.text,
          aspect: mark
            ? mark.width / mark.height
            : p.png
              ? (p.wFrac * width) / (p.hFrac * height)
              : p.text
                ? measureTextAspect(p.text)
                : null
        }
        return (
          <PlacementBox
            key={p.id}
            placement={p}
            content={content}
            active={signMode}
            pageW={width}
            pageH={height}
            onCommit={(patch) => sign.update(p.id, patch)}
            onRemove={() => sign.remove(p.id)}
            onCopyToAllPages={() => sign.addToAllPages(p)}
          />
        )
      })}
    </div>
  )
}
