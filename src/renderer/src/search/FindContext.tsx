import { createContext, useContext } from 'react'
import type { OcrWord } from '../ocr/types'

export interface FindState {
  active: boolean
  query: string
  matchingDocIds: Set<string>
  matchingPageIds: Set<string>
  getOcrWords: (sourceKey: string) => OcrWord[] | undefined
}

const EMPTY: FindState = {
  active: false,
  query: '',
  matchingDocIds: new Set(),
  matchingPageIds: new Set(),
  getOcrWords: () => undefined
}

const FindContext = createContext<FindState>(EMPTY)

export const FindProvider = FindContext.Provider

export function useFindState(): FindState {
  return useContext(FindContext)
}
