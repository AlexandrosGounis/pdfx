import { MARK_COLORS } from '../edit/types'
import type { Mark } from '../edit/types'
import type { PageEntry } from '../types'
import type { RasterExportPage } from './format'
import { openPdf } from './source'

const TARGET_PIXELS = 2200
const MIN_SCALE = 1
const MAX_SCALE = 4
const REDACT_BLEED = 1

export async function rasterizeMarkedPage(
  entry: PageEntry,
  marks: Mark[],
  filledBytes?: Uint8Array
): Promise<RasterExportPage> {
  const owned = filledBytes ? await openPdf(filledBytes) : null
  try {
    return await render(owned ?? entry.source.pdf, entry, marks)
  } finally {
    void owned?.destroy()
  }
}

async function render(
  pdf: PageEntry['source']['pdf'],
  entry: PageEntry,
  marks: Mark[]
): Promise<RasterExportPage> {
  const page = await pdf.getPage(entry.pageIndex + 1)
  const scale = Math.min(
    MAX_SCALE,
    Math.max(MIN_SCALE, TARGET_PIXELS / Math.max(entry.width, entry.height))
  )
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.floor(viewport.width))
  canvas.height = Math.max(1, Math.floor(viewport.height))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvas, viewport }).promise
  for (const mark of marks) {
    ctx.globalCompositeOperation = mark.kind === 'highlight' ? 'multiply' : 'source-over'
    ctx.fillStyle = MARK_COLORS[mark.color]
    const bleed = mark.kind === 'redact' ? REDACT_BLEED : 0
    for (const r of mark.rects) {
      ctx.fillRect(
        r.x * canvas.width - bleed,
        r.y * canvas.height - bleed,
        r.w * canvas.width + bleed * 2,
        r.h * canvas.height + bleed * 2
      )
    }
  }
  ctx.globalCompositeOperation = 'source-over'
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Failed to encode redacted page')
  return {
    kind: 'raster',
    png: new Uint8Array(await blob.arrayBuffer()),
    width: entry.width,
    height: entry.height
  }
}
