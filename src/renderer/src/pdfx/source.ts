import { getDocument } from 'pdfjs-dist'
import { partitionPages, readManifest, stripExtension } from './format'
import type { ExportPage } from './format'
import { findConverter } from './convert'
import type { DocEntry, PageEntry, PdfSource } from '../types'

interface PageSize {
  width: number
  height: number
}

export interface LoadedSource {
  source: PdfSource
  sizes: PageSize[]
}

// A crafted PDF can advertise an enormous page count (or a shared/cyclic page tree)
// to exhaust renderer memory; refuse to materialize an absurd number of pages.
const MAX_PAGES = 10_000

export async function loadSource(bytes: Uint8Array): Promise<LoadedSource> {
  const pdf = await getDocument({ data: bytes.slice() }).promise
  if (pdf.numPages > MAX_PAGES) {
    throw new Error(`PDF declares ${pdf.numPages} pages; refusing to load more than ${MAX_PAGES}`)
  }
  const source: PdfSource = { id: crypto.randomUUID(), bytes, pdf }
  const sizes: PageSize[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 1 })
    sizes.push({ width: viewport.width, height: viewport.height })
  }
  return { source, sizes }
}

export function pagesFromSource(
  source: PdfSource,
  sizes: PageSize[],
  indices: number[]
): PageEntry[] {
  return indices.map((pageIndex) => ({
    id: crypto.randomUUID(),
    source,
    pageIndex,
    width: sizes[pageIndex].width,
    height: sizes[pageIndex].height
  }))
}

export async function importIntoDocs(filename: string, bytes: Uint8Array): Promise<DocEntry[]> {
  const { source, sizes } = await loadSource(bytes)
  const manifest = await readManifest(source.pdf)
  return partitionPages(manifest, source.pdf.numPages, stripExtension(filename)).map((part) => ({
    id: crypto.randomUUID(),
    name: part.name,
    pages: pagesFromSource(source, sizes, part.indices)
  }))
}

export const toExportPage = (page: PageEntry): ExportPage => ({
  sourceKey: page.source.id,
  bytes: page.source.bytes,
  pageIndex: page.pageIndex
})

export async function loadIncomingPages(
  files: { name: string; data: Uint8Array; path?: string }[],
  reference?: PageSize
): Promise<PageEntry[]> {
  const entries: PageEntry[] = []
  for (const file of files) {
    const conv = findConverter(file.name, file.data)
    const bytes = conv ? await conv.toPdf(file.name, file.data, reference, file.path) : file.data
    const { source, sizes } = await loadSource(bytes)
    entries.push(
      ...pagesFromSource(
        source,
        sizes,
        sizes.map((_, i) => i)
      )
    )
  }
  return entries
}
