import { useEffect, useRef } from 'react'
import type { SearchResult } from '../search/useSearchIndex'
import { OCR_LANGUAGES } from '../ocr/languages'
import { CloseIcon, SearchIcon } from './icons'

interface FindBarProps {
  query: string
  result: SearchResult
  ocrRemaining: number
  hasScanned: boolean
  ocrLanguage: string
  onQuery: (query: string) => void
  onOcrLanguage: (lang: string) => void
  onClose: () => void
}

function countLabel(query: string, result: SearchResult): string {
  if (query.trim().length === 0) return ''
  if (result.pages === 0) return 'No results'
  return `${result.pages} ${result.pages === 1 ? 'page' : 'pages'}`
}

export function FindBar({
  query,
  result,
  ocrRemaining,
  hasScanned,
  ocrLanguage,
  onQuery,
  onOcrLanguage,
  onClose
}: FindBarProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    input.focus()
    input.select()
  }, [])

  return (
    <div className="findbar" role="search">
      <span className="findbar-icon">
        <SearchIcon size={15} strokeWidth={2} />
      </span>
      <input
        ref={inputRef}
        className="findbar-input"
        type="text"
        placeholder="Search"
        spellCheck={false}
        autoComplete="off"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
            onClose()
          }
        }}
      />
      {ocrRemaining > 0 && (
        <span className="findbar-status" title="Reading scanned pages">
          Indexing…
        </span>
      )}
      <span className="findbar-count" aria-live="polite">
        {countLabel(query, result)}
      </span>
      {hasScanned && (
        <select
          className="findbar-lang"
          title="OCR language for scanned pages"
          value={ocrLanguage}
          onChange={(e) => onOcrLanguage(e.target.value)}
        >
          {OCR_LANGUAGES.map((language) => (
            <option key={language.code} value={language.code}>
              {language.label}
            </option>
          ))}
        </select>
      )}
      <button className="icon-btn" title="Close (Esc)" onClick={onClose}>
        <CloseIcon size={15} />
      </button>
    </div>
  )
}
