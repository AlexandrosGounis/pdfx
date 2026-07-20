import { PDFDocument, StandardFonts } from 'pdf-lib'
import type { PDFFont, PDFPage } from 'pdf-lib'

import { MANIFEST_NAME, PDFX_VERSION } from './format'
import { drawMarks } from './marks'
import { drawElements, hasTextElements } from './elements'
import { registerAcroForm } from './form-fields'
import type { ExportDocument, ExportPage, PdfxManifest, RasterExportPage } from './format'

interface BuildContext {
  output: PDFDocument
  sources: Map<string, PDFDocument>
  font: PDFFont | null
}

const createContext = (output: PDFDocument): BuildContext => ({
  output,
  sources: new Map(),
  font: null
})

async function elementFont(ctx: BuildContext, page: ExportPage): Promise<PDFFont | undefined> {
  if (!hasTextElements(page.elements)) return undefined
  if (!ctx.font) ctx.font = await ctx.output.embedFont(StandardFonts.Helvetica)
  return ctx.font
}

async function addRasterPage(output: PDFDocument, page: RasterExportPage): Promise<PDFPage> {
  const image = await output.embedPng(page.png)
  const added = output.addPage([page.width, page.height])
  added.drawImage(image, { x: 0, y: 0, width: page.width, height: page.height })
  return added
}

async function addExportPage(ctx: BuildContext, page: ExportPage): Promise<void> {
  const font = await elementFont(ctx, page)
  if (page.kind === 'raster') {
    const added = await addRasterPage(ctx.output, page)
    drawElements(added, page.elements, font)
    return
  }
  let source = ctx.sources.get(page.sourceKey)
  if (!source) {
    source = await PDFDocument.load(page.bytes, { ignoreEncryption: true })
    ctx.sources.set(page.sourceKey, source)
  }
  const [copied] = await ctx.output.copyPages(source, [page.pageIndex])
  ctx.output.addPage(copied)
  drawElements(copied, page.elements, font)
  drawMarks(copied, page.marks)
}

export async function buildPdf(pages: ExportPage[]): Promise<Uint8Array> {
  const output = await PDFDocument.create()
  const ctx = createContext(output)
  for (const page of pages) {
    await addExportPage(ctx, page)
  }
  await registerAcroForm(output)
  output.setProducer(`PDFX ${PDFX_VERSION}`)
  return output.save()
}

export async function buildPdfx(documents: ExportDocument[], title: string): Promise<Uint8Array> {
  const output = await PDFDocument.create()
  const manifest: PdfxManifest = { pdfx: PDFX_VERSION, title, documents: [] }
  const ctx = createContext(output)

  for (const doc of documents) {
    if (doc.pages.length === 0) continue
    for (const page of doc.pages) {
      await addExportPage(ctx, page)
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
