import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { OcrRequest, OcrResponse } from './protocol'
import type { OcrResult } from './types'

const OCR_DPI = 300
const MAX_SCALE = 4.2

async function rasterize(pdf: PDFDocumentProxy, pageIndex: number): Promise<ImageBitmap> {
  const page = await pdf.getPage(pageIndex + 1)
  const scale = Math.min(OCR_DPI / 72, MAX_SCALE)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(viewport.width))
  canvas.height = Math.max(1, Math.ceil(viewport.height))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('OCR rasterize: no 2d context')
  await page.render({ canvas, viewport }).promise
  return createImageBitmap(canvas)
}

export interface OcrClient {
  setLanguage: (lang: string) => void
  recognize: (pdf: PDFDocumentProxy, pageIndex: number, jobId: string) => Promise<OcrResult>
  cancel: (jobId: string) => void
  cancelAll: () => void
  dispose: () => void
}

export function createOcrClient(): OcrClient {
  const worker = new Worker(new URL('./ocr.worker.ts', import.meta.url), { type: 'module' })
  const pending = new Map<
    string,
    { resolve: (result: OcrResult) => void; reject: (error: Error) => void }
  >()

  worker.addEventListener('message', (event: MessageEvent<OcrResponse>) => {
    const message = event.data
    const entry = pending.get(message.jobId)
    if (!entry) return
    pending.delete(message.jobId)
    if (message.type === 'result') entry.resolve({ text: message.text, words: message.words })
    else entry.reject(new Error(message.message))
  })

  const send = (request: OcrRequest, transfer: Transferable[] = []): void => {
    worker.postMessage(request, transfer)
  }

  return {
    setLanguage(lang) {
      send({ type: 'setLanguage', lang })
    },
    async recognize(pdf, pageIndex, jobId) {
      const bitmap = await rasterize(pdf, pageIndex)
      return new Promise<OcrResult>((resolve, reject) => {
        pending.set(jobId, { resolve, reject })
        send({ type: 'recognize', jobId, bitmap }, [bitmap])
      })
    },
    cancel(jobId) {
      const entry = pending.get(jobId)
      if (entry) {
        pending.delete(jobId)
        entry.reject(new Error('cancelled'))
      }
      send({ type: 'cancel', jobId })
    },
    cancelAll() {
      for (const entry of pending.values()) entry.reject(new Error('cancelled'))
      pending.clear()
      send({ type: 'cancelAll' })
    },
    dispose() {
      send({ type: 'dispose' })
      worker.terminate()
    }
  }
}
