export const byteOf = (ch: string): number => ch.charCodeAt(0)

export const BACKSLASH = byteOf('\\')
export const LINE_FEED = byteOf('\n')
export const CARRIAGE_RETURN = byteOf('\r')
export const LEFT_PAREN = byteOf('(')
export const RIGHT_PAREN = byteOf(')')
export const LESS_THAN = byteOf('<')
export const GREATER_THAN = byteOf('>')
export const LEFT_BRACKET = byteOf('[')
export const RIGHT_BRACKET = byteOf(']')
export const LEFT_BRACE = byteOf('{')
export const RIGHT_BRACE = byteOf('}')
export const SLASH = byteOf('/')
export const PERCENT = byteOf('%')
export const HASH = byteOf('#')

const WHITESPACE = new Set([0, byteOf('\t'), byteOf('\n'), byteOf('\f'), byteOf('\r'), byteOf(' ')])
const DELIMITERS = new Set([...'()<>[]{}/%'].map(byteOf))

export const isWhitespace = (b: number): boolean => WHITESPACE.has(b)
export const isDelimiter = (b: number): boolean => DELIMITERS.has(b)
export const isRegular = (b: number): boolean => !isWhitespace(b) && !isDelimiter(b)

export const isNumberChar = (b: number): boolean =>
  (b >= byteOf('0') && b <= byteOf('9')) ||
  b === byteOf('+') ||
  b === byteOf('-') ||
  b === byteOf('.')

export const isOctalDigit = (b: number | undefined): boolean =>
  b !== undefined && b >= byteOf('0') && b <= byteOf('7')

export function hexDigitValue(b: number | undefined): number {
  if (b === undefined) return -1
  if (b >= byteOf('0') && b <= byteOf('9')) return b - byteOf('0')
  if (b >= byteOf('A') && b <= byteOf('F')) return b - byteOf('A') + 10
  if (b >= byteOf('a') && b <= byteOf('f')) return b - byteOf('a') + 10
  return -1
}
