import {
  GREATER_THAN,
  HASH,
  LEFT_BRACE,
  LEFT_BRACKET,
  LEFT_PAREN,
  LESS_THAN,
  PERCENT,
  RIGHT_BRACE,
  RIGHT_BRACKET,
  SLASH,
  CARRIAGE_RETURN,
  LINE_FEED,
  hexDigitValue,
  isNumberChar,
  isRegular,
  isWhitespace
} from './chars'
import { readHexString, readLiteralString } from './strings'
import { skipInlineImage } from './inline-image'

export type ContentToken =
  | { type: 'num'; value: number; start: number; end: number }
  | { type: 'name'; value: string; start: number; end: number }
  | { type: 'str'; bytes: Uint8Array; start: number; end: number }
  | { type: 'arr-open'; start: number; end: number }
  | { type: 'arr-close'; start: number; end: number }
  | { type: 'dict-open'; start: number; end: number }
  | { type: 'dict-close'; start: number; end: number }
  | { type: 'op'; value: string; start: number; end: number }

export const INLINE_IMAGE_OP = 'INLINE_IMAGE'

const ascii = (data: Uint8Array, start: number, end: number): string =>
  String.fromCharCode(...data.subarray(start, end))

function readName(data: Uint8Array, slashAt: number): { value: string; end: number } {
  let value = ''
  let p = slashAt + 1
  while (p < data.length && isRegular(data[p])) {
    const high = data[p] === HASH ? hexDigitValue(data[p + 1]) : -1
    const low = high === -1 ? -1 : hexDigitValue(data[p + 2])
    if (low !== -1) {
      value += String.fromCharCode(high * 16 + low)
      p += 3
    } else {
      value += String.fromCharCode(data[p])
      p++
    }
  }
  return { value, end: p }
}

export function tokenizeContent(data: Uint8Array): ContentToken[] | null {
  const tokens: ContentToken[] = []
  let i = 0
  while (i < data.length) {
    const b = data[i]
    const start = i
    if (isWhitespace(b)) {
      i++
    } else if (b === PERCENT) {
      while (i < data.length && data[i] !== LINE_FEED && data[i] !== CARRIAGE_RETURN) i++
    } else if (b === LEFT_PAREN) {
      const literal = readLiteralString(data, i)
      if (!literal) return null
      tokens.push({ type: 'str', bytes: literal.bytes, start, end: literal.end })
      i = literal.end
    } else if (b === LESS_THAN && data[i + 1] === LESS_THAN) {
      tokens.push({ type: 'dict-open', start, end: i + 2 })
      i += 2
    } else if (b === LESS_THAN) {
      const hex = readHexString(data, i)
      if (!hex) return null
      tokens.push({ type: 'str', bytes: hex.bytes, start, end: hex.end })
      i = hex.end
    } else if (b === GREATER_THAN) {
      if (data[i + 1] !== GREATER_THAN) return null
      tokens.push({ type: 'dict-close', start, end: i + 2 })
      i += 2
    } else if (b === LEFT_BRACKET) {
      tokens.push({ type: 'arr-open', start, end: i + 1 })
      i++
    } else if (b === RIGHT_BRACKET) {
      tokens.push({ type: 'arr-close', start, end: i + 1 })
      i++
    } else if (b === LEFT_BRACE || b === RIGHT_BRACE) {
      i++
    } else if (b === SLASH) {
      const name = readName(data, i)
      tokens.push({ type: 'name', value: name.value, start, end: name.end })
      i = name.end
    } else if (isNumberChar(b)) {
      while (i < data.length && isNumberChar(data[i])) i++
      const value = parseFloat(ascii(data, start, i))
      if (Number.isNaN(value)) return null
      tokens.push({ type: 'num', value, start, end: i })
    } else {
      while (i < data.length && isRegular(data[i])) i++
      const word = ascii(data, start, i)
      if (word.length === 0) return null
      if (word === 'BI') {
        const end = skipInlineImage(data, i)
        if (end === null) return null
        tokens.push({ type: 'op', value: INLINE_IMAGE_OP, start, end })
        i = end
      } else {
        tokens.push({ type: 'op', value: word, start, end: i })
      }
    }
  }
  return tokens
}
