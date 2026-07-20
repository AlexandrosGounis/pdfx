import type { MarkKind } from '../edit/types'
import type { TextMark } from './types'

export interface TextSpan {
  start: number
  end: number
}

export interface LineSpan extends TextSpan {
  text: string
  row: number
}

export interface MarkRun extends TextSpan {
  kind: MarkKind
}

export function lineSpans(text: string): LineSpan[] {
  let start = 0
  return text.split('\n').map((line, row) => {
    const span = { text: line, row, start, end: start + line.length }
    start += line.length + 1
    return span
  })
}

const subtract = (mark: TextMark, span: TextSpan): TextMark[] => {
  const parts: TextMark[] = []
  if (mark.start < span.start) parts.push({ ...mark, end: span.start })
  if (mark.end > span.end) parts.push({ ...mark, start: span.end })
  return parts
}

const isCovered = (marks: TextMark[], kind: MarkKind, span: TextSpan): boolean => {
  let cursor = span.start
  const sorted = marks.filter((m) => m.kind === kind).sort((a, b) => a.start - b.start)
  for (const mark of sorted) {
    if (mark.start > cursor) return false
    cursor = Math.max(cursor, mark.end)
    if (cursor >= span.end) return true
  }
  return cursor >= span.end
}

const mergeAdjacent = (marks: TextMark[]): TextMark[] => {
  const merged: TextMark[] = []
  for (const mark of [...marks].sort((a, b) => a.start - b.start)) {
    const last = merged[merged.length - 1]
    if (last && last.kind === mark.kind && mark.start <= last.end) {
      last.end = Math.max(last.end, mark.end)
    } else {
      merged.push({ ...mark })
    }
  }
  return merged
}

export function toggleMark(marks: TextMark[], kind: MarkKind, span: TextSpan): TextMark[] {
  if (span.start >= span.end) return marks
  const covered = isCovered(marks, kind, span)
  const kept = marks.flatMap((m) =>
    m.end <= span.start || m.start >= span.end ? [m] : subtract(m, span)
  )
  return covered ? kept : mergeAdjacent([...kept, { kind, start: span.start, end: span.end }])
}

export const clipMarks = (marks: TextMark[], length: number): TextMark[] =>
  marks.flatMap((m) => (m.start >= length ? [] : [{ ...m, end: Math.min(m.end, length) }]))

export function lineSpanAt(text: string, index: number): TextSpan {
  const line = lineSpans(text).find((l) => index >= l.start && index <= l.end)
  return line ? { start: line.start, end: line.end } : { start: index, end: index }
}

export function wordSpanAt(text: string, index: number): TextSpan {
  const line = lineSpans(text).find((l) => index >= l.start && index <= l.end)
  if (!line) return { start: index, end: index }
  const at = Math.min(index - line.start, line.text.length - 1)
  if (at < 0 || !/\S/.test(line.text[at])) return { start: index, end: index }
  let from = at
  let to = at + 1
  while (from > 0 && /\S/.test(line.text[from - 1])) from--
  while (to < line.text.length && /\S/.test(line.text[to])) to++
  return { start: line.start + from, end: line.start + to }
}

export function lineMarkRuns(line: LineSpan, marks: TextMark[]): MarkRun[] {
  const clipped = marks
    .filter((m) => m.start < line.end && m.end > line.start)
    .map((m) => ({
      kind: m.kind,
      start: Math.max(m.start, line.start),
      end: Math.min(m.end, line.end)
    }))
    .sort((a, b) => a.start - b.start)
  const runs: MarkRun[] = []
  for (const mark of clipped) {
    const last = runs[runs.length - 1]
    const gap = last ? line.text.slice(last.end - line.start, mark.start - line.start) : null
    if (last && last.kind === mark.kind && gap !== null && gap.trim() === '') {
      last.end = Math.max(last.end, mark.end)
    } else {
      runs.push({ ...mark })
    }
  }
  return runs
}

export function visibleSpans(line: LineSpan, runs: MarkRun[]): TextSpan[] {
  const spans: TextSpan[] = []
  let cursor = line.start
  for (const run of runs.filter((r) => r.kind === 'redact')) {
    if (run.start > cursor) spans.push({ start: cursor, end: run.start })
    cursor = Math.max(cursor, run.end)
  }
  if (cursor < line.end) spans.push({ start: cursor, end: line.end })
  return spans
}
