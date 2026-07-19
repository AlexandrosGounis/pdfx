import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { Mark } from '../edit/types'
import type { PageElement } from '../elements/types'

export { buildPdf, buildPdfx } from './build'

export const MANIFEST_NAME = 'pdfx-manifest.json'
export const PDFX_VERSION = '1.0'

export interface PdfxManifestDocument {
  name: string
  pages: number
}

export interface PdfxManifest {
  pdfx: string
  title?: string
  documents: PdfxManifestDocument[]
}

export interface PagePartition {
  name: string
  indices: number[]
}

export interface SourceExportPage {
  kind: 'source'
  bytes: Uint8Array
  sourceKey: string
  pageIndex: number
  marks?: Mark[]
  elements?: PageElement[]
}

export interface RasterExportPage {
  kind: 'raster'
  png: Uint8Array
  width: number
  height: number
  elements?: PageElement[]
}

export type ExportPage = SourceExportPage | RasterExportPage

export interface ExportDocument {
  name: string
  pages: ExportPage[]
}

function range(start: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => start + i)
}

export function stripExtension(filename: string): string {
  return filename.replace(/\.(pdf|pdfx)$/i, '')
}

export async function readManifest(pdf: PDFDocumentProxy): Promise<PdfxManifest | null> {
  const attachments = (await pdf.getAttachments()) as Record<
    string,
    { filename?: string; content: Uint8Array }
  > | null
  if (!attachments) return null

  for (const [key, attachment] of Object.entries(attachments)) {
    if ((attachment.filename ?? key) !== MANIFEST_NAME) continue
    try {
      const manifest = JSON.parse(new TextDecoder().decode(attachment.content)) as PdfxManifest
      const valid =
        manifest &&
        Array.isArray(manifest.documents) &&
        manifest.documents.every(
          (d) => typeof d.name === 'string' && Number.isInteger(d.pages) && d.pages > 0
        )
      return valid ? manifest : null
    } catch {
      return null
    }
  }
  return null
}

export function partitionPages(
  manifest: PdfxManifest | null,
  totalPages: number,
  fallbackName: string
): PagePartition[] {
  if (!manifest) return [{ name: fallbackName, indices: range(0, totalPages) }]

  const partitions: PagePartition[] = []
  let cursor = 0
  for (const entry of manifest.documents) {
    const count = Math.min(entry.pages, totalPages - cursor)
    if (count <= 0) break
    partitions.push({ name: entry.name, indices: range(cursor, count) })
    cursor += count
  }
  if (cursor < totalPages) {
    partitions.push({ name: 'Untitled', indices: range(cursor, totalPages - cursor) })
  }
  return partitions
}
