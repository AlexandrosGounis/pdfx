const SOFT_HYPHEN = /­/g
const WHITESPACE = /\s+/g

export function normalizeText(input: string): string {
  return input
    .normalize('NFKC')
    .replace(SOFT_HYPHEN, '')
    .toLowerCase()
    .replace(WHITESPACE, ' ')
    .trim()
}

export const normalizeQuery = normalizeText

export function hasMatch(haystack: string, needle: string): boolean {
  return needle.length > 0 && haystack.includes(needle)
}

export function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0
  let count = 0
  let from = 0
  for (;;) {
    const at = haystack.indexOf(needle, from)
    if (at === -1) return count
    count++
    from = at + needle.length
  }
}
