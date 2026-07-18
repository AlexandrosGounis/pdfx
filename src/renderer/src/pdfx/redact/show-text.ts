import { coveredFraction } from './geometry'
import type { Box } from './geometry'
import type { Segment } from './emit'
import type { TextState } from './text-state'

const GLYPH_OVERLAP = 0.3

export interface ShowTextOutcome {
  changed: boolean
  unsupported: string | null
}

export function scrubShownText(
  state: TextState,
  rects: Box[],
  bytes: Uint8Array,
  segments: Segment[],
  onGlyphRemoved: () => void
): ShowTextOutcome {
  const font = state.font
  if (!font) return { changed: false, unsupported: `unsupported font /${state.fontName}` }
  let changed = false
  let run: number[] = []
  const step = font.bytesPerCode
  for (let i = 0; i + step <= bytes.length; i += step) {
    const code = step === 2 ? (bytes[i] << 8) | bytes[i + 1] : bytes[i]
    const advance = state.glyphAdvance(code)
    const covered = coveredFraction(state.glyphBox(advance), rects)
    if (covered >= GLYPH_OVERLAP) {
      if (run.length > 0) segments.push({ kind: 'run', bytes: run })
      run = []
      segments.push({ kind: 'adj', value: -state.glyphAdjustment(code) })
      onGlyphRemoved()
      changed = true
    } else {
      for (let k = 0; k < step; k++) run.push(bytes[i + k])
    }
    state.advance(advance)
  }
  if (run.length > 0) segments.push({ kind: 'run', bytes: run })
  return { changed, unsupported: null }
}
