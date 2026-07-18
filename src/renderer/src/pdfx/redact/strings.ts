import {
  BACKSLASH,
  CARRIAGE_RETURN,
  GREATER_THAN,
  LEFT_PAREN,
  LINE_FEED,
  RIGHT_PAREN,
  byteOf,
  hexDigitValue,
  isOctalDigit,
  isWhitespace
} from './chars'

export interface StringToken {
  bytes: Uint8Array
  end: number
}

const SIMPLE_ESCAPES: ReadonlyMap<number, number> = new Map([
  [byteOf('n'), LINE_FEED],
  [byteOf('r'), CARRIAGE_RETURN],
  [byteOf('t'), byteOf('\t')],
  [byteOf('b'), byteOf('\b')],
  [byteOf('f'), byteOf('\f')],
  [LEFT_PAREN, LEFT_PAREN],
  [RIGHT_PAREN, RIGHT_PAREN],
  [BACKSLASH, BACKSLASH]
])

function readEscape(data: Uint8Array, backslashAt: number, out: number[]): number | null {
  const escaped = data[backslashAt + 1]
  if (escaped === undefined) return null
  const simple = SIMPLE_ESCAPES.get(escaped)
  if (simple !== undefined) {
    out.push(simple)
    return 2
  }
  if (isOctalDigit(escaped)) {
    let code = escaped - byteOf('0')
    let length = 1
    while (length < 3 && isOctalDigit(data[backslashAt + 1 + length])) {
      code = code * 8 + (data[backslashAt + 1 + length] - byteOf('0'))
      length++
    }
    out.push(code & 255)
    return 1 + length
  }
  if (escaped === CARRIAGE_RETURN) return data[backslashAt + 2] === LINE_FEED ? 3 : 2
  if (escaped === LINE_FEED) return 2
  out.push(escaped)
  return 2
}

export function readLiteralString(data: Uint8Array, openParenAt: number): StringToken | null {
  const out: number[] = []
  let depth = 1
  let p = openParenAt + 1
  while (p < data.length) {
    const b = data[p]
    if (b === BACKSLASH) {
      const consumed = readEscape(data, p, out)
      if (consumed === null) return null
      p += consumed
    } else if (b === LEFT_PAREN) {
      depth++
      out.push(b)
      p++
    } else if (b === RIGHT_PAREN) {
      depth--
      if (depth === 0) return { bytes: Uint8Array.from(out), end: p + 1 }
      out.push(b)
      p++
    } else if (b === CARRIAGE_RETURN) {
      out.push(LINE_FEED)
      p += data[p + 1] === LINE_FEED ? 2 : 1
    } else {
      out.push(b)
      p++
    }
  }
  return null
}

export function readHexString(data: Uint8Array, openAngleAt: number): StringToken | null {
  const digits: number[] = []
  for (let p = openAngleAt + 1; p < data.length; p++) {
    const b = data[p]
    if (b === GREATER_THAN) {
      if (digits.length % 2 === 1) digits.push(0)
      const bytes = new Uint8Array(digits.length / 2)
      for (let k = 0; k < bytes.length; k++) bytes[k] = digits[k * 2] * 16 + digits[k * 2 + 1]
      return { bytes, end: p + 1 }
    }
    const digit = hexDigitValue(b)
    if (digit !== -1) digits.push(digit)
    else if (!isWhitespace(b)) return null
  }
  return null
}
