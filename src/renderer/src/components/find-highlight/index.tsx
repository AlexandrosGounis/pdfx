import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { OcrWord } from '../../ocr/types'
import { TextLayerHighlight } from './TextLayerHighlight'
import { OcrBoxHighlight } from './OcrBoxHighlight'

interface FindHighlightProps {
  pdf: PDFDocumentProxy
  pageNumber: number
  naturalHeight: number
  query: string
  ocrWords: OcrWord[] | undefined
}

export function FindHighlight({
  pdf,
  pageNumber,
  naturalHeight,
  query,
  ocrWords
}: FindHighlightProps): React.JSX.Element {
  if (ocrWords) return <OcrBoxHighlight words={ocrWords} query={query} />
  return (
    <TextLayerHighlight
      pdf={pdf}
      pageNumber={pageNumber}
      naturalHeight={naturalHeight}
      query={query}
    />
  )
}
