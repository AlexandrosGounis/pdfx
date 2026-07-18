import { PDFArray, PDFRawStream, decodePDFRawStream } from 'pdf-lib'
import type { PDFContext, PDFObject, PDFPage } from 'pdf-lib'
import { resolve } from './lookup'

export function readContent(context: PDFContext, page: PDFPage): Uint8Array | null {
  const contents = page.node.Contents()
  if (!contents) return null
  const streams: PDFObject[] = []
  if (contents instanceof PDFArray) {
    for (let i = 0; i < contents.size(); i++) streams.push(contents.get(i))
  } else {
    streams.push(contents)
  }
  const parts: Uint8Array[] = []
  for (const ref of streams) {
    const stream = resolve(context, ref)
    if (!(stream instanceof PDFRawStream)) return null
    parts.push(decodePDFRawStream(stream).decode())
  }
  const total = parts.reduce((sum, part) => sum + part.length + 1, 0)
  const joined = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    joined.set(part, offset)
    offset += part.length
    joined[offset] = 10
    offset += 1
  }
  return joined
}
