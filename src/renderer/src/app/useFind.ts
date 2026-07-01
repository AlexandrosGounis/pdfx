import { useCallback, useEffect, useState } from 'react'
import type { SearchResult } from '../search/useSearchIndex'

const EMPTY_RESULT: SearchResult = {
  pageIds: new Set(),
  docIds: new Set(),
  pages: 0,
  occurrences: 0
}

const DEBOUNCE_MS = 150

export interface Find {
  open: boolean
  query: string
  result: SearchResult
  matchedQuery: string
  active: boolean
  setQuery: (query: string) => void
  openFind: () => void
  closeFind: () => void
}

export function useFind(search: (query: string) => SearchResult, version: number): Find {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<SearchResult>(EMPTY_RESULT)
  const [matchedQuery, setMatchedQuery] = useState('')

  const active = open && query.trim().length > 0

  useEffect(() => {
    if (!active) {
      setResult(EMPTY_RESULT)
      setMatchedQuery('')
      return
    }
    const timer = setTimeout(() => {
      setResult(search(query))
      setMatchedQuery(query)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [active, query, search])

  useEffect(() => {
    if (!active) return
    const timer = setTimeout(() => {
      setResult(search(query))
      setMatchedQuery(query)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [version])

  const openFind = useCallback(() => setOpen(true), [])
  const closeFind = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  return { open, query, result, matchedQuery, active, setQuery, openFind, closeFind }
}
