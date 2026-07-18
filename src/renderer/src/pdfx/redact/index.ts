import { PDFDocument, PDFName } from 'pdf-lib'
import type { Mark } from '../../edit/types'
import type { PageEntry } from '../../types'
import type { SourceExportPage } from '../format'
import { normalizeRotation, visualRectToUser } from './geometry'
import { parseFonts } from './fonts'
import { readContent } from './page-content'
import {
  annotsIntersect,
  collectHiddenProps,
  extGStateSetsFont,
  parseXObjects,
  stripHiddenProps
} from './page-resources'
import { scrubContent } from './scrub'

class Unsupported extends Error {}

const fail = (reason: string): never => {
  throw new Unsupported(reason)
}

export async function buildRedactedSourcePage(
  entry: PageEntry,
  marks: Mark[],
  filledBytes?: Uint8Array
): Promise<SourceExportPage | null> {
  try {
    return await attempt(entry, marks, filledBytes)
  } catch (error) {
    const reason = error instanceof Unsupported ? error.message : String(error)
    console.warn(`[pdfx] surgical redaction fell back to raster: ${reason}`)
    return null
  }
}

async function attempt(
  entry: PageEntry,
  marks: Mark[],
  filledBytes?: Uint8Array
): Promise<SourceExportPage | null> {
  const source = await PDFDocument.load(filledBytes ?? entry.source.bytes, {
    ignoreEncryption: true
  })
  const temp = await PDFDocument.create()
  const [page] = await temp.copyPages(source, [entry.pageIndex])
  temp.addPage(page)

  const box = page.getCropBox()
  const rot = normalizeRotation(page.getRotation().angle)
  const rects = marks
    .filter((m) => m.kind === 'redact')
    .flatMap((m) => m.rects)
    .map((r) => visualRectToUser(r, box, rot))
  if (rects.length === 0) return fail('no redaction rects')

  const context = temp.context
  if (annotsIntersect(context, page, rects)) return fail('annotation overlaps redaction')

  const content = readContent(context, page)
  if (!content) return fail('unreadable content stream')

  const resources = page.node.Resources()
  if (extGStateSetsFont(context, resources)) return fail('ExtGState sets font')

  const result = scrubContent(content, {
    fonts: parseFonts(context, resources),
    xobjects: parseXObjects(context, resources),
    hiddenProps: collectHiddenProps(context, resources),
    rects
  })
  if (!result.ok) return fail(result.reason)
  if (result.removed === 0) return fail('no glyphs found under redaction')
  stripHiddenProps(context, resources)

  const stream = context.flateStream(result.content)
  page.node.set(PDFName.of('Contents'), context.register(stream))
  const bytes = await temp.save()
  return { kind: 'source', bytes, sourceKey: `redacted:${entry.id}`, pageIndex: 0, marks }
}
