import { PDFDocument } from 'pdf-lib'
import type { PDFPage } from 'pdf-lib'

import { MANIFEST_NAME, PDFX_VERSION } from './format'
import { drawMarks } from './marks'
import { drawElements } from './elements'
import { registerAcroForm } from './form-fields'
import type { ExportDocument, ExportPage, PdfxManifest, RasterExportPage } from './format'

async function addRasterPage(output: PDFDocument, page: RasterExportPage): Promise<PDFPage> {
  const image = await output.embedPng(page.png)
  const added = output.addPage([page.width, page.height])
  added.drawImage(image, { x: 0, y: 0, width: page.width, height: page.height })
  return added
}

async function addExportPage(
  output: PDFDocument,
  sources: Map<string, PDFDocument>,
  page: ExportPage
): Promise<void> {
  if (page.kind === 'raster') {
    const added = await addRasterPage(output, page)
    drawElements(added, page.elements)
    return
  }
  let source = sources.get(page.sourceKey)
  if (!source) {
    source = await PDFDocument.load(page.bytes, { ignoreEncryption: true })
    sources.set(page.sourceKey, source)
  }
  const [copied] = await output.copyPages(source, [page.pageIndex])
  output.addPage(copied)
  drawElements(copied, page.elements)
  drawMarks(copied, page.marks)
}

export async function buildPdf(pages: ExportPage[]): Promise<Uint8Array> {
  const output = await PDFDocument.create()
  const sources = new Map<string, PDFDocument>()
  for (const page of pages) {
    await addExportPage(output, sources, page)
  }
  await registerAcroForm(output)
  output.setProducer(`PDFX ${PDFX_VERSION}`)
  return output.save()
}

export async function buildPdfx(documents: ExportDocument[], title: string): Promise<Uint8Array> {
  const output = await PDFDocument.create()
  const manifest: PdfxManifest = { pdfx: PDFX_VERSION, title, documents: [] }
  const sources = new Map<string, PDFDocument>()

  for (const doc of documents) {
    if (doc.pages.length === 0) continue
    for (const page of doc.pages) {
      await addExportPage(output, sources, page)
    }
    manifest.documents.push({ name: doc.name, pages: doc.pages.length })
  }

  await registerAcroForm(output)

  await output.attach(new TextEncoder().encode(JSON.stringify(manifest, null, 2)), MANIFEST_NAME, {
    mimeType: 'application/json',
    description: 'PDFX manifest describing the documents in this collection',
    creationDate: new Date(),
    modificationDate: new Date()
  })

  output.setTitle(title)
  output.setProducer(`PDFX ${PDFX_VERSION}`)
  output.setKeywords(['PDFX'])

  return output.save()
}
