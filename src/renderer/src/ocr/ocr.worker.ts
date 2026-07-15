import Tesseract from 'tesseract.js'
import { DEFAULT_OCR_LANGUAGE } from './languages'
import type { OcrRequest, OcrResponse } from './protocol'
import type { OcrWord } from './types'

function toWords(blocks: Tesseract.Block[] | null, width: number, height: number): OcrWord[] {
  const words: OcrWord[] = []
  for (const block of blocks ?? []) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        for (const word of line.words) {
          const { x0, y0, x1, y1 } = word.bbox
          words.push({
            text: word.text.toLowerCase(),
            x: x0 / width,
            y: y0 / height,
            w: (x1 - x0) / width,
            h: (y1 - y0) / height
          })
        }
      }
    }
  }
  return words
}

type Scheduler = ReturnType<typeof Tesseract.createScheduler>

const scope = self as unknown as {
  postMessage: (message: OcrResponse) => void
  addEventListener: (type: 'message', listener: (event: MessageEvent<OcrRequest>) => void) => void
}

const POOL = Math.max(1, Math.min(2, Math.floor((navigator.hardwareConcurrency || 4) / 2)))

const ASSET_BASE = import.meta.env.VITE_PDFX_WEB
  ? new URL('/ocr', self.location.href).href
  : 'pdfx-ocr://assets'

const OFFLINE_OPTIONS = {
  workerPath: `${ASSET_BASE}/worker.min.js`,
  corePath: `${ASSET_BASE}/core`,
  langPath: `${ASSET_BASE}/lang`,
  gzip: true,
  logger: () => {},
  errorHandler: (error: unknown) => console.error('[ocr worker]', error)
}

let currentLang = DEFAULT_OCR_LANGUAGE
let schedulerPromise: Promise<Scheduler> | null = null

async function buildScheduler(lang: string): Promise<Scheduler> {
  const scheduler = Tesseract.createScheduler()
  for (let i = 0; i < POOL; i++) {
    const worker = await Tesseract.createWorker(lang, Tesseract.OEM.LSTM_ONLY, OFFLINE_OPTIONS)
    await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.AUTO })
    scheduler.addWorker(worker)
  }
  return scheduler
}

function ensureScheduler(): Promise<Scheduler> {
  if (!schedulerPromise) schedulerPromise = buildScheduler(currentLang)
  return schedulerPromise
}

async function terminateScheduler(): Promise<void> {
  const previous = schedulerPromise
  schedulerPromise = null
  if (!previous) return
  try {
    await (await previous).terminate()
  } catch {
    return
  }
}

async function setLanguage(lang: string): Promise<void> {
  if (lang === currentLang && schedulerPromise) return
  currentLang = lang
  await terminateScheduler()
}

interface Job {
  jobId: string
  bitmap: ImageBitmap
}

const queue: Job[] = []
const cancelled = new Set<string>()
let running = 0

function pump(): void {
  while (running < POOL && queue.length > 0) {
    const job = queue.shift()!
    if (cancelled.has(job.jobId)) {
      cancelled.delete(job.jobId)
      job.bitmap.close()
      continue
    }
    running++
    void recognize(job).finally(() => {
      running--
      pump()
    })
  }
}

async function recognize(job: Job): Promise<void> {
  try {
    const scheduler = await ensureScheduler()
    if (cancelled.has(job.jobId)) {
      cancelled.delete(job.jobId)
      job.bitmap.close()
      return
    }
    const canvas = new OffscreenCanvas(job.bitmap.width, job.bitmap.height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('no 2d context')
    context.drawImage(job.bitmap, 0, 0)
    const { width, height } = job.bitmap
    job.bitmap.close()
    const { data } = await scheduler.addJob('recognize', canvas, {}, { text: true, blocks: true })
    scope.postMessage({
      type: 'result',
      jobId: job.jobId,
      text: data.text ?? '',
      words: toWords(data.blocks, width, height)
    })
  } catch (error) {
    scope.postMessage({
      type: 'error',
      jobId: job.jobId,
      message: error instanceof Error ? error.message : String(error)
    })
  }
}

function clearQueue(): void {
  for (const job of queue) job.bitmap.close()
  queue.length = 0
}

scope.addEventListener('message', (event) => {
  const message = event.data
  switch (message.type) {
    case 'setLanguage':
      void setLanguage(message.lang)
      break
    case 'recognize':
      queue.push({ jobId: message.jobId, bitmap: message.bitmap })
      pump()
      break
    case 'cancel':
      cancelled.add(message.jobId)
      break
    case 'cancelAll':
      clearQueue()
      break
    case 'dispose':
      clearQueue()
      void terminateScheduler()
      break
  }
})
