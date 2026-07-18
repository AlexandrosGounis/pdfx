import {
  PDFDocument,
  PDFName,
  drawObject,
  popGraphicsState,
  pushGraphicsState,
  rotateInPlace,
  translate
} from 'pdf-lib'
import type { PDFField, PDFForm, PDFPage, PDFRef } from 'pdf-lib'
import { hasAnyValue } from './types'
import type { FormValues, FormValuesBySource } from './types'
import type { DocEntry } from '../types'

type Widget = ReturnType<PDFField['acroField']['getWidgets']>[number]

interface FormInternals {
  findWidgetPage(widget: Widget): PDFPage
  findWidgetAppearanceRef(field: PDFField, widget: Widget): PDFRef
}

const DA_FONT_PATTERN = /\/\S+\s+[\d.]+\s+Tf/

function forceBlackText(field: PDFField): void {
  const acro = field.acroField
  const font = (acro.getDefaultAppearance() ?? '').match(DA_FONT_PATTERN)?.[0] ?? '/Helv 0 Tf'
  acro.setDefaultAppearance(`${font} 0 g`)
}

function applyValue(form: PDFForm, name: string, value: string | boolean): PDFField | null {
  if (typeof value === 'boolean') {
    const box = form.getCheckBox(name)
    if (value) box.check()
    else box.uncheck()
    return box
  }
  if (value.length === 0) return null
  const field = form.getTextField(name)
  field.setText(value)
  return field
}

function flattenFields(form: PDFForm, fields: PDFField[]): void {
  const internals = form as unknown as FormInternals
  for (const field of fields) {
    for (const widget of field.acroField.getWidgets()) {
      const page = internals.findWidgetPage(widget)
      const widgetRef = internals.findWidgetAppearanceRef(field, widget)
      const xObjectKey = page.node.newXObject('FlatWidget', widgetRef)
      const rect = widget.getRectangle()
      const operators = [
        pushGraphicsState(),
        translate(rect.x, rect.y),
        ...rotateInPlace({ ...rect, rotation: 0 }),
        drawObject(xObjectKey),
        popGraphicsState()
      ].filter(Boolean)
      page.pushOperators(...operators)
    }
    form.removeField(field)
  }
}

function stubMissingAppearances(doc: PDFDocument, form: PDFForm): void {
  for (const field of form.getFields()) {
    for (const widget of field.acroField.getWidgets()) {
      try {
        widget.getNormalAppearance()
      } catch {
        const stream = doc.context.flateStream('', {
          Type: 'XObject',
          Subtype: 'Form',
          BBox: [0, 0, 0, 0]
        })
        widget.dict.set(PDFName.of('AP'), doc.context.obj({ N: doc.context.register(stream) }))
      }
    }
  }
}

export async function fillFormValues(bytes: Uint8Array, values: FormValues): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const form = doc.getForm()
  const filled: PDFField[] = []
  for (const [name, value] of Object.entries(values)) {
    try {
      const field = applyValue(form, name, value)
      if (field) {
        forceBlackText(field)
        filled.push(field)
      }
    } catch (error) {
      console.warn(`[pdfx] could not fill form field ${name}:`, error)
    }
  }
  if (filled.length === 0) return bytes
  try {
    form.updateFieldAppearances()
  } catch (error) {
    console.warn('[pdfx] form appearance update failed:', error)
  }
  stubMissingAppearances(doc, form)
  try {
    flattenFields(form, filled)
  } catch (error) {
    console.warn('[pdfx] form flatten failed, keeping interactive fields:', error)
  }
  return doc.save()
}

export async function fillDocSources(
  docs: DocEntry[],
  valuesBySource: FormValuesBySource
): Promise<Map<string, Uint8Array>> {
  const sources = new Map<string, Uint8Array>()
  for (const doc of docs) {
    for (const page of doc.pages) sources.set(page.source.id, page.source.bytes)
  }
  const filled = new Map<string, Uint8Array>()
  for (const [sourceId, bytes] of sources) {
    const values = valuesBySource[sourceId]
    if (!hasAnyValue(values)) continue
    try {
      filled.set(sourceId, await fillFormValues(bytes, values!))
    } catch (error) {
      console.warn('[pdfx] form fill failed for a source, exporting unfilled:', error)
    }
  }
  return filled
}
