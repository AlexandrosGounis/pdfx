import { PDFDocument, StandardFonts } from 'pdf-lib'

import { MANIFEST_NAME, PDFX_VERSION } from './format'
import type { ExportDocument, ExportPage, PdfxManifest } from './format'
import { stampPage } from './stamp'
import type { StampSkip } from './stamp'
import { isTextPlacement } from './sign/text-placement'
import type { StampAssets } from './sign/types'

const EMPTY_ASSETS: StampAssets = new Map()

export async function buildPdf(
  pages: ExportPage[],
  assets: StampAssets = EMPTY_ASSETS
): Promise<{ bytes: Uint8Array; skipped: StampSkip[] }> {
  const output = await PDFDocument.create()
  const sources = new Map<string, PDFDocument>()
  const embedCache = new Map<string, import('pdf-lib').PDFImage>()
  const needsFont = pages.some((p) => p.placements?.some(isTextPlacement))
  const font = needsFont ? await output.embedFont(StandardFonts.Helvetica) : undefined
  const skipped: StampSkip[] = []
  for (const page of pages) {
    let source = sources.get(page.sourceKey)
    if (!source) {
      source = await PDFDocument.load(page.bytes, { ignoreEncryption: true })
      sources.set(page.sourceKey, source)
    }
    const [copied] = await output.copyPages(source, [page.pageIndex])
    output.addPage(copied)
    if (page.placements?.length) skipped.push(...(await stampPage(copied, page.placements, assets, embedCache, font)))
  }
  output.setProducer(`PDFX ${PDFX_VERSION}`)
  return { bytes: await output.save(), skipped }
}

export async function buildPdfx(
  documents: ExportDocument[],
  title: string,
  assets: StampAssets = EMPTY_ASSETS
): Promise<{ bytes: Uint8Array; skipped: StampSkip[] }> {
  const output = await PDFDocument.create()
  const manifest: PdfxManifest = { pdfx: PDFX_VERSION, title, documents: [] }
  const sources = new Map<string, PDFDocument>()
  const embedCache = new Map<string, import('pdf-lib').PDFImage>()
  const needsFont = documents.some((d) => d.pages.some((p) => p.placements?.some(isTextPlacement)))
  const font = needsFont ? await output.embedFont(StandardFonts.Helvetica) : undefined
  const skipped: StampSkip[] = []

  for (const doc of documents) {
    if (doc.pages.length === 0) continue
    for (const page of doc.pages) {
      let source = sources.get(page.sourceKey)
      if (!source) {
        source = await PDFDocument.load(page.bytes, { ignoreEncryption: true })
        sources.set(page.sourceKey, source)
      }
      const [copied] = await output.copyPages(source, [page.pageIndex])
      output.addPage(copied)
      if (page.placements?.length) skipped.push(...(await stampPage(copied, page.placements, assets, embedCache, font)))
    }
    manifest.documents.push({ name: doc.name, pages: doc.pages.length })
  }

  await output.attach(new TextEncoder().encode(JSON.stringify(manifest, null, 2)), MANIFEST_NAME, {
    mimeType: 'application/json',
    description: 'PDFX manifest describing the documents in this collection',
    creationDate: new Date(),
    modificationDate: new Date()
  })

  output.setTitle(title)
  output.setProducer(`PDFX ${PDFX_VERSION}`)
  output.setKeywords(['PDFX'])

  return { bytes: await output.save(), skipped }
}
