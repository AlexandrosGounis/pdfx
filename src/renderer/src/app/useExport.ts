import { useCallback } from 'react'
import { zipSync } from 'fflate'
import { buildPdf, buildPdfx, stripExtension } from '../pdfx/format'
import { prepareExportPage } from '../pdfx/export-pages'
import { fillDocSources } from '../forms/fill'
import type { DocEntry } from '../types'
import type { MarkMap } from '../edit/types'
import type { FormValuesBySource } from '../forms/types'

const PDFX_FILTER = { name: 'PDFX', extensions: ['pdfx'] }
const PDF_FILTER = { name: 'PDF', extensions: ['pdf'] }
const ZIP_FILTER = { name: 'ZIP', extensions: ['zip'] }
const ILLEGAL_FILENAME_CHARS = /[\\/:*?"<>|]/g

export function useExport(
  docs: DocEntry[],
  marks: MarkMap,
  formValues: FormValuesBySource,
  setBusy: (busy: boolean) => void,
  flash: (message: string) => void
) {
  const preparePages = useCallback(
    (doc: DocEntry, filled: Map<string, Uint8Array>) =>
      Promise.all(doc.pages.map((p) => prepareExportPage(p, marks[p.id], filled.get(p.source.id)))),
    [marks]
  )

  const exportCollection = useCallback(
    async (kind: 'pdfx' | 'pdf') => {
      if (docs.length === 0) {
        flash('Nothing to export')
        return
      }
      const path = await window.api.chooseSavePath(
        `untitled.${kind}`,
        kind === 'pdfx' ? PDFX_FILTER : PDF_FILTER
      )
      if (!path) return
      setBusy(true)
      try {
        const filename = path.split(/[\\/]/).pop() ?? `untitled.${kind}`
        const filled = await fillDocSources(docs, formValues)
        const documents = await Promise.all(
          docs.map(async (doc) => ({ name: doc.name, pages: await preparePages(doc, filled) }))
        )
        const bytes = await buildPdfx(documents, stripExtension(filename).replace(/\.pdf$/i, ''))
        const saved = await window.api.writeFile(path, bytes)
        flash(`Saved ${saved}`)
      } catch (error) {
        console.error('Export failed', error)
        flash('Export failed')
      } finally {
        setBusy(false)
      }
    },
    [docs, preparePages, formValues, flash, setBusy]
  )

  const exportZip = useCallback(async () => {
    if (docs.length === 0) {
      flash('Nothing to export')
      return
    }
    const path = await window.api.chooseSavePath('untitled.zip', ZIP_FILTER)
    if (!path) return
    setBusy(true)
    try {
      const filled = await fillDocSources(docs, formValues)
      const entries: Record<string, Uint8Array> = {}
      const used = new Set<string>()
      for (const doc of docs) {
        const safeName = doc.name.replace(ILLEGAL_FILENAME_CHARS, '-').trim() || 'Untitled'
        let filename = `${safeName}.pdf`
        for (let n = 2; used.has(filename); n++) filename = `${safeName} (${n}).pdf`
        used.add(filename)
        entries[filename] = await buildPdf(await preparePages(doc, filled))
      }
      const saved = await window.api.writeFile(path, zipSync(entries))
      flash(`Saved ${saved}`)
    } catch (error) {
      console.error('Export failed', error)
      flash('Export failed')
    } finally {
      setBusy(false)
    }
  }, [docs, preparePages, formValues, flash, setBusy])

  return { exportCollection, exportZip }
}
