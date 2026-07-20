import type { PDFFont, PDFPage } from 'pdf-lib'
import type { InkElement, PageElement } from '../../elements/types'
import { drawInkElements } from './ink'
import { drawTextElement } from './text'

export function drawElements(
  page: PDFPage,
  elements: PageElement[] | undefined,
  font?: PDFFont
): void {
  if (!elements || elements.length === 0) return
  drawInkElements(
    page,
    elements.filter((e): e is InkElement => e.kind === 'ink')
  )
  if (!font) return
  for (const element of elements) {
    if (element.kind === 'text') drawTextElement(page, element, font)
  }
}

export const hasTextElements = (elements: PageElement[] | undefined): boolean =>
  !!elements && elements.some((e) => e.kind === 'text')
