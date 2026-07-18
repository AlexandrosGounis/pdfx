import { PDFArray, PDFDict, PDFName, PDFNumber, PDFRef } from 'pdf-lib'
import type { PDFContext, PDFObject } from 'pdf-lib'

export function resolve(context: PDFContext, obj: PDFObject | undefined): PDFObject | undefined {
  return obj instanceof PDFRef ? context.lookup(obj) : obj
}

export function asDict(context: PDFContext, obj: PDFObject | undefined): PDFDict | undefined {
  const value = resolve(context, obj)
  return value instanceof PDFDict ? value : undefined
}

export function asArray(context: PDFContext, obj: PDFObject | undefined): PDFArray | undefined {
  const value = resolve(context, obj)
  return value instanceof PDFArray ? value : undefined
}

export function asNumber(context: PDFContext, obj: PDFObject | undefined): number | undefined {
  const value = resolve(context, obj)
  return value instanceof PDFNumber ? value.asNumber() : undefined
}

export function asName(context: PDFContext, obj: PDFObject | undefined): string | undefined {
  const value = resolve(context, obj)
  return value instanceof PDFName ? value.decodeText() : undefined
}
