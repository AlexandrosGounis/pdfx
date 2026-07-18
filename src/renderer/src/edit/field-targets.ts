import type { PDFDocumentProxy } from 'pdfjs-dist'
import { getFormFields } from '../forms/extract'
import type { MarkRect } from './types'

const CLICK_SLOP = 0.004

export async function fieldRectsForDrag(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  drag: MarkRect
): Promise<MarkRect[]> {
  const fields = await getFormFields(pdf, pageNumber)
  const x1 = drag.x - CLICK_SLOP
  const y1 = drag.y - CLICK_SLOP
  const x2 = drag.x + drag.w + CLICK_SLOP
  const y2 = drag.y + drag.h + CLICK_SLOP
  return fields
    .filter(
      (f) => f.rect.x < x2 && x1 < f.rect.x + f.rect.w && f.rect.y < y2 && y1 < f.rect.y + f.rect.h
    )
    .map((f) => f.rect)
}
