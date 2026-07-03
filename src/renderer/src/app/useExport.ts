import { useCallback } from 'react'
import { zipSync } from 'fflate'
import { buildPdf, buildPdfx, stripExtension } from '../pdfx/format'
import { toExportPage } from '../pdfx/source'
import { placementsByPage, collectAssets } from '../pdfx/sign/export-placements'
import type { Placement } from '../pdfx/sign/types'
import type { StampSkip } from '../pdfx/stamp'
import type { DocEntry } from '../types'

const PDFX_FILTER = { name: 'PDFX', extensions: ['pdfx'] }
const PDF_FILTER = { name: 'PDF', extensions: ['pdf'] }
const ZIP_FILTER = { name: 'ZIP', extensions: ['zip'] }
const ILLEGAL_FILENAME_CHARS = /[\\/:*?"<>|]/g

function skipSuffix(skipped: StampSkip[]): string {
  const nSkipped = new Set(skipped.map((s) => s.placementId)).size
  return nSkipped > 0 ? ` (${nSkipped} mark(s) skipped)` : ''
}

export function useExport(
  docs: DocEntry[],
  placements: Placement[],
  setBusy: (busy: boolean) => void,
  flash: (message: string) => void
) {
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
        const allPageIds = docs.flatMap((d) => d.pages.map((p) => p.id))
        const marks = placements.length ? await window.api.marks.list() : []
        const assets = collectAssets(placements, marks)
        const byPage = placementsByPage(allPageIds, placements)
        const documents = docs.map((doc) => ({
          name: doc.name,
          pages: doc.pages.map((p) => ({ ...toExportPage(p), placements: byPage.get(p.id) }))
        }))
        const { bytes, skipped } = await buildPdfx(
          documents,
          stripExtension(filename).replace(/\.pdf$/i, ''),
          assets
        )
        const saved = await window.api.writeFile(path, bytes)
        flash(`Saved ${saved}${skipSuffix(skipped)}`)
      } catch (error) {
        console.error('Export failed', error)
        flash('Export failed')
      } finally {
        setBusy(false)
      }
    },
    [docs, placements, flash, setBusy]
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
      const allPageIds = docs.flatMap((d) => d.pages.map((p) => p.id))
      const marks = placements.length ? await window.api.marks.list() : []
      const assets = collectAssets(placements, marks)
      const byPage = placementsByPage(allPageIds, placements)
      const entries: Record<string, Uint8Array> = {}
      const used = new Set<string>()
      const allSkipped: StampSkip[] = []
      for (const doc of docs) {
        const safeName = doc.name.replace(ILLEGAL_FILENAME_CHARS, '-').trim() || 'Untitled'
        let filename = `${safeName}.pdf`
        for (let n = 2; used.has(filename); n++) filename = `${safeName} (${n}).pdf`
        used.add(filename)
        const { bytes, skipped } = await buildPdf(
          doc.pages.map((p) => ({ ...toExportPage(p), placements: byPage.get(p.id) })),
          assets
        )
        entries[filename] = bytes
        allSkipped.push(...skipped)
      }
      const saved = await window.api.writeFile(path, zipSync(entries))
      flash(`Saved ${saved}${skipSuffix(allSkipped)}`)
    } catch (error) {
      console.error('Export failed', error)
      flash('Export failed')
    } finally {
      setBusy(false)
    }
  }, [docs, placements, flash, setBusy])

  return { exportCollection, exportZip }
}
