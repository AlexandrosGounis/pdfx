import { toExportPage } from './source'
import { rasterizeMarkedPage } from './rasterize'
import { buildRedactedSourcePage } from './redact'
import type { Mark } from '../edit/types'
import type { PageElement } from '../elements/types'
import type { PageEntry } from '../types'
import type { ExportPage } from './format'

export async function prepareExportPage(
  page: PageEntry,
  marks: Mark[] | undefined,
  filledBytes?: Uint8Array,
  elements?: PageElement[]
): Promise<ExportPage> {
  const prepared = await preparePage(page, marks, filledBytes)
  prepared.elements = elements
  return prepared
}

async function preparePage(
  page: PageEntry,
  marks: Mark[] | undefined,
  filledBytes?: Uint8Array
): Promise<ExportPage> {
  if (marks?.some((m) => m.kind === 'redact')) {
    const surgical = await buildRedactedSourcePage(page, marks, filledBytes)
    if (surgical) return surgical
    return rasterizeMarkedPage(page, marks, filledBytes)
  }
  return toExportPage(page, marks, filledBytes)
}
