import { PDFName, PDFRawStream } from 'pdf-lib'
import type { PDFArray, PDFContext, PDFDict, PDFPage } from 'pdf-lib'
import { intersectionArea } from './geometry'
import type { Box, Matrix } from './geometry'
import { asArray, asDict, asName, asNumber, resolve } from './lookup'
import type { XObjectInfo } from './xobjects'

const name = PDFName.of.bind(PDFName)

const HIDDEN_KEYS = ['ActualText', 'Alt', 'E']

function readNumbers(
  context: PDFContext,
  arr: PDFArray | undefined,
  count: number
): number[] | null {
  if (!arr || arr.size() !== count) return null
  const values: number[] = []
  for (let i = 0; i < count; i++) {
    const num = asNumber(context, arr.get(i))
    if (num === undefined) return null
    values.push(num)
  }
  return values
}

export function annotsIntersect(context: PDFContext, page: PDFPage, rects: Box[]): boolean {
  const annots = page.node.Annots()
  if (!annots) return false
  for (let i = 0; i < annots.size(); i++) {
    const annot = asDict(context, annots.get(i))
    const rect = annot ? asArray(context, annot.get(name('Rect'))) : undefined
    const values = rect ? readNumbers(context, rect, 4) : null
    if (!values) return true
    const annotBox: Box = {
      x: Math.min(values[0], values[2]),
      y: Math.min(values[1], values[3]),
      w: Math.abs(values[2] - values[0]),
      h: Math.abs(values[3] - values[1])
    }
    if (rects.some((r) => intersectionArea(annotBox, r) > 1e-6)) return true
  }
  return false
}

export function extGStateSetsFont(context: PDFContext, resources: PDFDict | undefined): boolean {
  const states = resources ? asDict(context, resources.get(name('ExtGState'))) : undefined
  if (!states) return false
  for (const [, value] of states.entries()) {
    const state = asDict(context, value)
    if (state?.get(name('Font'))) return true
  }
  return false
}

export function collectHiddenProps(
  context: PDFContext,
  resources: PDFDict | undefined
): Set<string> {
  const hidden = new Set<string>()
  const props = resources ? asDict(context, resources.get(name('Properties'))) : undefined
  if (!props) return hidden
  for (const [key, value] of props.entries()) {
    const dict = asDict(context, value)
    if (!dict || HIDDEN_KEYS.some((k) => dict.get(name(k)))) hidden.add(key.decodeText())
  }
  return hidden
}

export function stripHiddenProps(context: PDFContext, resources: PDFDict | undefined): void {
  const props = resources ? asDict(context, resources.get(name('Properties'))) : undefined
  if (!props) return
  for (const [, value] of props.entries()) {
    const dict = asDict(context, value)
    if (dict) for (const key of HIDDEN_KEYS) dict.delete(name(key))
  }
}

export function parseXObjects(
  context: PDFContext,
  resources: PDFDict | undefined
): Map<string, XObjectInfo> {
  const xobjects = new Map<string, XObjectInfo>()
  if (!resources) return xobjects
  const dict = asDict(context, resources.get(name('XObject')))
  if (!dict) return xobjects
  for (const [key, value] of dict.entries()) {
    const obj = resolve(context, value)
    const stream = obj instanceof PDFRawStream ? obj : undefined
    const subtype = stream ? asName(context, stream.dict.get(name('Subtype'))) : undefined
    if (subtype === 'Image') {
      xobjects.set(key.decodeText(), { kind: 'image' })
    } else if (subtype === 'Form' && stream) {
      const bbox = readNumbers(context, asArray(context, stream.dict.get(name('BBox'))), 4)
      const matrix = readNumbers(context, asArray(context, stream.dict.get(name('Matrix'))), 6)
      xobjects.set(
        key.decodeText(),
        bbox
          ? {
              kind: 'form',
              bbox: [bbox[0], bbox[1], bbox[2], bbox[3]],
              matrix: matrix ? (matrix as Matrix) : undefined
            }
          : { kind: 'other' }
      )
    } else {
      xobjects.set(key.decodeText(), { kind: 'other' })
    }
  }
  return xobjects
}
