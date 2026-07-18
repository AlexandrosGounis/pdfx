import { PDFDict, PDFName } from 'pdf-lib'
import type { PDFContext } from 'pdf-lib'
import { asArray, asDict, asNumber, asName } from './lookup'

export interface FontWidths {
  bytesPerCode: 1 | 2
  spaceCode: number | null
  widthOf: (code: number) => number
}

const name = PDFName.of.bind(PDFName)

function parseSimpleFont(context: PDFContext, dict: PDFDict): FontWidths | null {
  const widthsArr = asArray(context, dict.get(name('Widths')))
  if (!widthsArr) return null
  const firstChar = asNumber(context, dict.get(name('FirstChar'))) ?? 0
  const widths: number[] = []
  for (let i = 0; i < widthsArr.size(); i++) {
    widths.push(asNumber(context, widthsArr.get(i)) ?? 0)
  }
  const descriptor = asDict(context, dict.get(name('FontDescriptor')))
  const missing = asNumber(context, descriptor?.get(name('MissingWidth'))) ?? 500
  return {
    bytesPerCode: 1,
    spaceCode: 32,
    widthOf: (code) => {
      const index = code - firstChar
      return index >= 0 && index < widths.length ? widths[index] : missing
    }
  }
}

function parseType0Font(context: PDFContext, dict: PDFDict): FontWidths | null {
  const encodingName = asName(context, dict.get(name('Encoding')))
  if (encodingName !== 'Identity-H') return null
  const descendants = asArray(context, dict.get(name('DescendantFonts')))
  const cidFont = descendants ? asDict(context, descendants.get(0)) : undefined
  if (!cidFont) return null
  const defaultWidth = asNumber(context, cidFont.get(name('DW'))) ?? 1000
  const widths = new Map<number, number>()
  const w = asArray(context, cidFont.get(name('W')))
  if (w) {
    let i = 0
    while (i < w.size()) {
      const first = asNumber(context, w.get(i))
      if (first === undefined) return null
      const second = i + 1 < w.size() ? w.get(i + 1) : undefined
      const arr = asArray(context, second)
      if (arr) {
        for (let k = 0; k < arr.size(); k++) {
          widths.set(first + k, asNumber(context, arr.get(k)) ?? defaultWidth)
        }
        i += 2
      } else {
        const last = asNumber(context, second)
        const width = i + 2 < w.size() ? asNumber(context, w.get(i + 2)) : undefined
        if (last === undefined || width === undefined) return null
        for (let c = first; c <= last && c - first < 65536; c++) widths.set(c, width)
        i += 3
      }
    }
  }
  return {
    bytesPerCode: 2,
    spaceCode: null,
    widthOf: (code) => widths.get(code) ?? defaultWidth
  }
}

function parseFont(context: PDFContext, dict: PDFDict | undefined): FontWidths | null {
  if (!dict) return null
  const subtype = asName(context, dict.get(name('Subtype')))
  if (subtype === 'Type0') return parseType0Font(context, dict)
  if (subtype === 'Type1' || subtype === 'TrueType' || subtype === 'MMType1') {
    return parseSimpleFont(context, dict)
  }
  return null
}

export function parseFonts(
  context: PDFContext,
  resources: PDFDict | undefined
): Map<string, FontWidths | null> {
  const fonts = new Map<string, FontWidths | null>()
  if (!resources) return fonts
  const fontDict = asDict(context, resources.get(name('Font')))
  if (!fontDict) return fonts
  for (const [key, value] of fontDict.entries()) {
    fonts.set(key.decodeText(), parseFont(context, asDict(context, value)))
  }
  return fonts
}
