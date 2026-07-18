import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { FieldKind, FieldRect, FormFieldInfo } from './types'

interface WidgetAnnotation {
  subtype: string
  fieldType?: string
  fieldName?: string
  rect?: number[]
  defaultAppearance?: string
  multiLine?: boolean
  maxLen?: number
  checkBox?: boolean
  radioButton?: boolean
  pushButton?: boolean
  readOnly?: boolean
  hidden?: boolean
}

const AUTO_SIZE_RATIO = 0.62
const MIN_FONT_SIZE = 6
const MAX_FONT_SIZE = 18

const cache = new WeakMap<PDFDocumentProxy, Map<number, Promise<FormFieldInfo[]>>>()

export function getFormFields(pdf: PDFDocumentProxy, pageNumber: number): Promise<FormFieldInfo[]> {
  let pages = cache.get(pdf)
  if (!pages) {
    pages = new Map()
    cache.set(pdf, pages)
  }
  let pending = pages.get(pageNumber)
  if (!pending) {
    pending = extract(pdf, pageNumber).catch(() => [])
    pages.set(pageNumber, pending)
  }
  return pending
}

function parseDaFontSize(defaultAppearance: string | undefined): number | null {
  const match = defaultAppearance?.match(/([\d.]+)\s+Tf/)
  const size = match ? parseFloat(match[1]) : NaN
  return Number.isFinite(size) && size > 0 ? size : null
}

function widgetKind(widget: WidgetAnnotation): FieldKind | null {
  if (widget.fieldType === 'Tx') return 'text'
  if (widget.fieldType === 'Btn' && widget.checkBox) return 'checkbox'
  return null
}

const clamp = (value: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, value))

async function extract(pdf: PDFDocumentProxy, pageNumber: number): Promise<FormFieldInfo[]> {
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale: 1 })
  const annotations = (await page.getAnnotations()) as WidgetAnnotation[]
  const fields: FormFieldInfo[] = []
  annotations.forEach((widget, index) => {
    if (widget.subtype !== 'Widget' || widget.hidden || widget.readOnly) return
    const kind = widgetKind(widget)
    if (!kind || !widget.fieldName || !widget.rect) return
    const [x1, y1, x2, y2] = viewport.convertToViewportRectangle(widget.rect)
    const width = Math.abs(x2 - x1)
    const height = Math.abs(y2 - y1)
    if (width < 1 || height < 1) return
    const rect: FieldRect = {
      x: Math.min(x1, x2) / viewport.width,
      y: Math.min(y1, y2) / viewport.height,
      w: width / viewport.width,
      h: height / viewport.height
    }
    const autoSize = clamp(height * AUTO_SIZE_RATIO, MIN_FONT_SIZE, MAX_FONT_SIZE)
    fields.push({
      id: `${pageNumber}:${index}:${widget.fieldName}`,
      name: widget.fieldName,
      kind,
      rect,
      fontSize: parseDaFontSize(widget.defaultAppearance) ?? autoSize,
      multiline: !!widget.multiLine,
      maxLen: widget.maxLen && widget.maxLen > 0 ? widget.maxLen : null
    })
  })
  return fields
}
