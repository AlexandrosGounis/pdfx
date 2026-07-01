import { countOccurrences, normalizeQuery, normalizeText } from './normalize'
import { extractPageText } from './extract'
import { createOcrClient, type OcrClient } from '../ocr/ocr-client'
import { DEFAULT_OCR_LANGUAGE } from '../ocr/languages'
import type { OcrWord } from '../ocr/types'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { DocEntry } from '../types'

export interface SearchResult {
  pageIds: Set<string>
  docIds: Set<string>
  pages: number
  occurrences: number
}

export const EMPTY_RESULT: SearchResult = {
  pageIds: new Set(),
  docIds: new Set(),
  pages: 0,
  occurrences: 0
}

export interface SearchEngine {
  reconcile: (docs: DocEntry[]) => void
  search: (query: string) => SearchResult
  setLanguage: (lang: string) => void
  getOcrWords: (sourceKey: string) => OcrWord[] | undefined
  dispose: () => void
}

export interface EngineCallbacks {
  onChange: () => void
  onProgress: (remaining: number, hasScanned: boolean) => void
  getDocs: () => DocEntry[]
}

interface OcrJob {
  key: string
  pdf: PDFDocumentProxy
  pageIndex: number
}

const OCR_CONCURRENCY = 2

export function createSearchEngine({
  onChange,
  onProgress,
  getDocs
}: EngineCallbacks): SearchEngine {
  const pageText = new Map<string, string>()
  const sourceBorn = new Map<string, string>()
  const sourceOcr = new Map<string, string>()
  const sourceOcrWords = new Map<string, OcrWord[]>()
  const scanned = new Set<string>()
  const ocrQueued = new Set<string>()
  const ocrQueue: OcrJob[] = []

  let ocrInFlight = 0
  let jobSeq = 0
  let lang = DEFAULT_OCR_LANGUAGE
  let client: OcrClient | null = null
  let reconcileToken = 0

  const sourceKeyOf = (page: DocEntry['pages'][number]): string =>
    `${page.source.id}:${page.pageIndex}`
  const effective = (key: string): string => sourceOcr.get(key) ?? sourceBorn.get(key) ?? ''
  const reportProgress = (): void => onProgress(ocrQueue.length + ocrInFlight, scanned.size > 0)

  function ensureClient(): OcrClient {
    if (!client) {
      client = createOcrClient()
      client.setLanguage(lang)
    }
    return client
  }

  function applySource(key: string): void {
    const text = effective(key)
    for (const doc of getDocs()) {
      for (const page of doc.pages) {
        if (sourceKeyOf(page) === key) pageText.set(page.id, text)
      }
    }
  }

  function findSourcePage(key: string): OcrJob | null {
    for (const doc of getDocs()) {
      for (const page of doc.pages) {
        if (sourceKeyOf(page) === key) {
          return { key, pdf: page.source.pdf, pageIndex: page.pageIndex }
        }
      }
    }
    return null
  }

  function enqueueOcr(job: OcrJob): void {
    if (ocrQueued.has(job.key)) return
    ocrQueued.add(job.key)
    ocrQueue.push(job)
    reportProgress()
    pumpOcr()
  }

  function pumpOcr(): void {
    while (ocrInFlight < OCR_CONCURRENCY && ocrQueue.length > 0) {
      const job = ocrQueue.shift()!
      ocrInFlight++
      reportProgress()
      const jobId = `${++jobSeq}`
      ensureClient()
        .recognize(job.pdf, job.pageIndex, jobId)
        .then(({ text, words }) => {
          sourceOcr.set(job.key, normalizeText(text))
          sourceOcrWords.set(job.key, words)
          applySource(job.key)
          onChange()
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error)
          if (message !== 'cancelled') console.warn('OCR failed', error)
        })
        .finally(() => {
          ocrInFlight--
          reportProgress()
          pumpOcr()
        })
    }
  }

  async function runExtraction(
    jobs: { pageId: string; key: string; pdf: PDFDocumentProxy; pageIndex: number }[],
    token: number
  ): Promise<void> {
    for (const job of jobs) {
      if (token !== reconcileToken) return
      if (sourceBorn.has(job.key)) {
        pageText.set(job.pageId, effective(job.key))
        if (scanned.has(job.key) && !ocrQueued.has(job.key)) {
          enqueueOcr({ key: job.key, pdf: job.pdf, pageIndex: job.pageIndex })
        }
        onChange()
        continue
      }
      try {
        const { text, needsOcr } = await extractPageText(job.pdf, job.pageIndex)
        sourceBorn.set(job.key, normalizeText(text))
        if (needsOcr) {
          scanned.add(job.key)
          reportProgress()
          enqueueOcr({ key: job.key, pdf: job.pdf, pageIndex: job.pageIndex })
        }
        pageText.set(job.pageId, effective(job.key))
        onChange()
      } catch (error) {
        console.error(`Failed to index page ${job.pageIndex + 1}`, error)
      }
    }
  }

  return {
    reconcile(docs) {
      const token = ++reconcileToken
      const presentPages = new Set<string>()
      const presentKeys = new Set<string>()
      const toExtract: { pageId: string; key: string; pdf: PDFDocumentProxy; pageIndex: number }[] =
        []
      let changed = false

      for (const doc of docs) {
        for (const page of doc.pages) {
          presentPages.add(page.id)
          const key = sourceKeyOf(page)
          presentKeys.add(key)
          if (pageText.has(page.id)) continue
          if (sourceBorn.has(key)) {
            pageText.set(page.id, effective(key))
            changed = true
            if (scanned.has(key) && !ocrQueued.has(key)) {
              enqueueOcr({ key, pdf: page.source.pdf, pageIndex: page.pageIndex })
            }
          } else {
            toExtract.push({
              pageId: page.id,
              key,
              pdf: page.source.pdf,
              pageIndex: page.pageIndex
            })
          }
        }
      }

      for (const id of [...pageText.keys()]) {
        if (!presentPages.has(id)) {
          pageText.delete(id)
          changed = true
        }
      }

      if (ocrQueue.length > 0) {
        for (let i = ocrQueue.length - 1; i >= 0; i--) {
          if (!presentKeys.has(ocrQueue[i].key)) {
            ocrQueued.delete(ocrQueue[i].key)
            ocrQueue.splice(i, 1)
          }
        }
        reportProgress()
      }

      if (changed) onChange()
      if (toExtract.length > 0) void runExtraction(toExtract, token)
    },

    search(query) {
      const q = normalizeQuery(query)
      if (!q) return EMPTY_RESULT
      const pageIds = new Set<string>()
      let occurrences = 0
      for (const [pageId, text] of pageText) {
        const count = countOccurrences(text, q)
        if (count > 0) {
          pageIds.add(pageId)
          occurrences += count
        }
      }
      const docIds = new Set<string>()
      for (const doc of getDocs()) {
        if (doc.pages.some((p) => pageIds.has(p.id))) docIds.add(doc.id)
      }
      return { pageIds, docIds, pages: pageIds.size, occurrences }
    },

    setLanguage(next) {
      if (next === lang) return
      lang = next
      if (client) {
        client.cancelAll()
        client.setLanguage(next)
      }
      sourceOcr.clear()
      sourceOcrWords.clear()
      ocrQueued.clear()
      ocrQueue.length = 0
      for (const key of scanned) {
        applySource(key)
        const job = findSourcePage(key)
        if (job) enqueueOcr(job)
      }
      reportProgress()
      onChange()
    },

    getOcrWords(sourceKey) {
      return sourceOcrWords.get(sourceKey)
    },

    dispose() {
      ocrQueue.length = 0
      client?.dispose()
      client = null
    }
  }
}
