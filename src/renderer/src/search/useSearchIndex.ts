import { useCallback, useEffect, useRef, useState } from 'react'
import { createSearchEngine, type SearchEngine, type SearchResult } from './engine'
import { normalizeText } from './normalize'
import { DEFAULT_OCR_LANGUAGE } from '../ocr/languages'
import type { OcrWord } from '../ocr/types'
import type { ElementMap } from '../elements/types'
import type { DocEntry } from '../types'

export type { SearchResult } from './engine'

export interface SearchIndex {
  search: (query: string) => SearchResult
  version: number
  ocrRemaining: number
  hasScanned: boolean
  ocrLanguage: string
  setOcrLanguage: (lang: string) => void
  getOcrWords: (sourceKey: string) => OcrWord[] | undefined
}

export function useSearchIndex(docs: DocEntry[], elements: ElementMap): SearchIndex {
  const [version, setVersion] = useState(0)
  const [ocrRemaining, setOcrRemaining] = useState(0)
  const [hasScanned, setHasScanned] = useState(false)
  const [ocrLanguage, setOcrLanguageState] = useState(DEFAULT_OCR_LANGUAGE)

  const docsRef = useRef(docs)
  docsRef.current = docs

  const engineRef = useRef<SearchEngine | null>(null)
  if (!engineRef.current) {
    engineRef.current = createSearchEngine({
      onChange: () => setVersion((v) => v + 1),
      onProgress: (remaining, scanned) => {
        setOcrRemaining(remaining)
        setHasScanned(scanned)
      },
      getDocs: () => docsRef.current
    })
  }
  const engine = engineRef.current

  useEffect(() => {
    engine.reconcile(docs)
  }, [docs, engine])

  useEffect(() => {
    const byPage = new Map<string, string>()
    for (const [pageId, list] of Object.entries(elements)) {
      const text = list
        .filter((e) => e.kind === 'text')
        .map((e) => e.text)
        .join('\n')
      if (text) byPage.set(pageId, normalizeText(text))
    }
    engine.setElementTexts(byPage)
  }, [elements, engine])

  useEffect(() => {
    return () => {
      engine.dispose()
      engineRef.current = null
    }
  }, [engine])

  const search = useCallback((query: string) => engine.search(query), [engine])
  const getOcrWords = useCallback((sourceKey: string) => engine.getOcrWords(sourceKey), [engine])

  const setOcrLanguage = useCallback(
    (lang: string) => {
      setOcrLanguageState(lang)
      engine.setLanguage(lang)
    },
    [engine]
  )

  return { search, version, ocrRemaining, hasScanned, ocrLanguage, setOcrLanguage, getOcrWords }
}
