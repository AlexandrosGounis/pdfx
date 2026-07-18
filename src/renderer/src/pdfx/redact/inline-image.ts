import { LEFT_PAREN, SLASH, byteOf, isDelimiter, isRegular, isWhitespace } from './chars'
import { readLiteralString } from './strings'

const UPPER_I = byteOf('I')
const UPPER_D = byteOf('D')
const UPPER_E = byteOf('E')

function isImageDataMarker(data: Uint8Array, p: number): boolean {
  if (data[p] !== UPPER_I || data[p + 1] !== UPPER_D || p === 0) return false
  const before = data[p - 1]
  if (isRegular(before) || before === SLASH) return false
  const after = data[p + 2]
  return after === undefined || isWhitespace(after)
}

function findImageDataStart(data: Uint8Array, from: number): number | null {
  let p = from
  while (p < data.length) {
    if (data[p] === LEFT_PAREN) {
      const literal = readLiteralString(data, p)
      if (!literal) return null
      p = literal.end
    } else if (isImageDataMarker(data, p)) {
      return p + 3
    } else {
      p++
    }
  }
  return null
}

function findImageDataEnd(data: Uint8Array, from: number): number | null {
  for (let p = from; p < data.length - 1; p++) {
    if (data[p] !== UPPER_E || data[p + 1] !== UPPER_I) continue
    if (!isWhitespace(data[p - 1])) continue
    const after = data[p + 2]
    if (after === undefined || isWhitespace(after) || isDelimiter(after)) return p + 2
  }
  return null
}

export function skipInlineImage(data: Uint8Array, afterBiOperator: number): number | null {
  const dataStart = findImageDataStart(data, afterBiOperator)
  if (dataStart === null) return null
  return findImageDataEnd(data, dataStart)
}
