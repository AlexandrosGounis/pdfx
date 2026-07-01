import type { OcrWord } from '../../ocr/types'

interface OcrBoxHighlightProps {
  words: OcrWord[]
  query: string
}

export function OcrBoxHighlight({ words, query }: OcrBoxHighlightProps): React.JSX.Element {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const hits =
    tokens.length > 0 ? words.filter((word) => tokens.some((t) => word.text.includes(t))) : []

  return (
    <div className="ocr-highlight-layer" aria-hidden="true">
      {hits.map((word, index) => (
        <span
          key={index}
          className="ocr-highlight"
          style={{
            left: `${word.x * 100}%`,
            top: `${word.y * 100}%`,
            width: `${word.w * 100}%`,
            height: `${word.h * 100}%`
          }}
        />
      ))}
    </div>
  )
}
