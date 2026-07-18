import { PDFDict, PDFName, PDFRef, StandardFonts } from 'pdf-lib'
import type { PDFContext, PDFDocument } from 'pdf-lib'

const name = PDFName.of.bind(PDFName)
const MAX_PARENT_DEPTH = 32

function fieldRoot(context: PDFContext, ref: PDFRef): PDFRef | null {
  const dict = context.lookup(ref)
  if (!(dict instanceof PDFDict)) return null
  if (dict.get(name('Subtype')) !== name('Widget')) return null
  let current = ref
  for (let depth = 0; depth < MAX_PARENT_DEPTH; depth++) {
    const currentDict = context.lookup(current)
    if (!(currentDict instanceof PDFDict)) return current
    const parent = currentDict.get(name('Parent'))
    if (!(parent instanceof PDFRef)) return current
    if (!(context.lookup(parent) instanceof PDFDict)) return current
    current = parent
  }
  return current
}

export async function registerAcroForm(output: PDFDocument): Promise<void> {
  const context = output.context
  const roots = new Set<PDFRef>()
  for (const page of output.getPages()) {
    const annots = page.node.Annots()
    if (!annots) continue
    for (let i = 0; i < annots.size(); i++) {
      const ref = annots.get(i)
      if (!(ref instanceof PDFRef)) continue
      const root = fieldRoot(context, ref)
      if (root) roots.add(root)
    }
  }
  if (roots.size === 0) return
  const helvetica = await output.embedFont(StandardFonts.Helvetica)
  const acroForm = context.obj({
    Fields: [...roots],
    DA: '/Helv 0 Tf 0 g',
    DR: context.obj({ Font: context.obj({ Helv: helvetica.ref }) })
  })
  output.catalog.set(name('AcroForm'), context.register(acroForm))
}
