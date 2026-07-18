export type Segment = { kind: 'run'; bytes: number[] } | { kind: 'adj'; value: number }

export interface Edit {
  start: number
  end: number
  text: string
}

export const formatNumber = (value: number): string => {
  const rounded = Math.round(value * 100) / 100
  return Object.is(rounded, -0) ? '0' : String(rounded)
}

const toHex = (bytes: number[]): string =>
  bytes.map((b) => b.toString(16).padStart(2, '0')).join('')

export function segmentsToTj(segments: Segment[]): string {
  const parts: string[] = []
  let pendingAdjustment = 0
  const flushAdjustment = (): void => {
    if (Math.abs(pendingAdjustment) > 0.001) parts.push(formatNumber(pendingAdjustment))
    pendingAdjustment = 0
  }
  for (const segment of segments) {
    if (segment.kind === 'adj') pendingAdjustment += segment.value
    else if (segment.bytes.length > 0) {
      flushAdjustment()
      parts.push(`<${toHex(segment.bytes)}>`)
    }
  }
  flushAdjustment()
  return `[${parts.join(' ')}] TJ`
}

export function escapeName(value: string): string {
  let out = ''
  for (const ch of value) {
    const code = ch.charCodeAt(0)
    const delimiter = '()<>[]{}/%#'.includes(ch)
    if (code >= 33 && code <= 126 && !delimiter) out += ch
    else out += `#${code.toString(16).padStart(2, '0')}`
  }
  return out
}

export function spliceEdits(data: Uint8Array, edits: Edit[]): Uint8Array | null {
  const ordered = [...edits].sort((a, b) => a.start - b.start)
  const encoder = new TextEncoder()
  const chunks: Uint8Array[] = []
  let cursor = 0
  for (const edit of ordered) {
    if (edit.start < cursor) return null
    chunks.push(data.subarray(cursor, edit.start))
    chunks.push(encoder.encode(edit.text))
    cursor = edit.end
  }
  chunks.push(data.subarray(cursor))
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const spliced = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    spliced.set(chunk, offset)
    offset += chunk.length
  }
  return spliced
}
