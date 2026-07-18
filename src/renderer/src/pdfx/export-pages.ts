import { toExportPage } from './source'
import { rasterizeMarkedPage } from './rasterize'
import { buildRedactedSourcePage } from './redact'
import type { Mark } from '../edit/types'
import type { PageEntry } from '../types'
import type { ExportPage } from './format'

export async function prepareExportPage(
  page: PageEntry,
  marks: Mark[] | undefined
): Promise<ExportPage> {
  if (marks?.some((m) => m.kind === 'redact')) {
    const surgical = await buildRedactedSourcePage(page, marks)
    if (surgical) return surgical
    return rasterizeMarkedPage(page, marks)
  }
  return toExportPage(page, marks)
}
