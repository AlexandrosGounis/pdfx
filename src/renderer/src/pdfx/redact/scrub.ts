import { tokenizeContent, INLINE_IMAGE_OP } from './tokens'
import type { Box } from './geometry'
import type { FontWidths } from './fonts'
import { OperandCollector, operandFromToken, operandNumbers } from './operands'
import type { Segment } from './emit'
import { formatNumber, segmentsToTj, spliceEdits } from './emit'
import type { Edit } from './emit'
import { TextState } from './text-state'
import { applyStateOp } from './state-ops'
import { scrubShownText } from './show-text'
import type { ShowTextOutcome } from './show-text'
import { MarkedContentTracker } from './marked-content'
import { inlineImageFailure, xobjectFailure } from './xobjects'
import type { XObjectInfo } from './xobjects'

export interface ScrubOptions {
  fonts: Map<string, FontWidths | null>
  xobjects: Map<string, XObjectInfo>
  hiddenProps: Set<string>
  rects: Box[]
}

export type ScrubResult =
  | { ok: true; content: Uint8Array; removed: number }
  | { ok: false; reason: string }

const failure = (reason: string): ScrubResult => ({ ok: false, reason })

export function scrubContent(data: Uint8Array, opts: ScrubOptions): ScrubResult {
  const tokens = tokenizeContent(data)
  if (!tokens) return failure('unparseable content stream')

  const state = new TextState()
  const collector = new OperandCollector()
  const marked = new MarkedContentTracker(opts.hiddenProps)
  const edits: Edit[] = []
  let removed = 0
  const onGlyphRemoved = (): void => {
    removed++
    marked.markDirty()
  }
  const show = (bytes: Uint8Array, segments: Segment[]): ShowTextOutcome =>
    scrubShownText(state, opts.rects, bytes, segments, onGlyphRemoved)

  for (const token of tokens) {
    if (token.type === 'arr-open' || token.type === 'dict-open') {
      collector.openGroup(token.type === 'arr-open' ? 'arr' : 'dict', token.start)
      continue
    }
    if (token.type === 'arr-close' || token.type === 'dict-close') {
      const type = token.type === 'arr-close' ? 'arr' : 'dict'
      if (!collector.closeGroup(type, token.end)) return failure('unbalanced grouping')
      continue
    }
    if (token.type !== 'op') {
      const operand = operandFromToken(token)
      if (operand) collector.push(operand)
      continue
    }

    const op = token.value
    const operands = collector.take()
    const start = operands.length > 0 ? operands[0].start : token.start
    const end = token.end

    if (applyStateOp(state, op, operands)) continue

    if (op === 'Tf' && operands.length === 2) {
      const [nameOp, sizeOp] = operands
      if (nameOp.kind === 'name' && sizeOp.kind === 'num') {
        state.setFont(opts.fonts.get(nameOp.value), nameOp.value, sizeOp.value)
      }
    } else if (op === 'Tj' && operands.length === 1 && operands[0].kind === 'str') {
      const segments: Segment[] = []
      const outcome = show(operands[0].bytes, segments)
      if (outcome.unsupported) return failure(outcome.unsupported)
      if (outcome.changed) edits.push({ start, end, text: segmentsToTj(segments) })
    } else if (op === "'" && operands.length === 1 && operands[0].kind === 'str') {
      state.nextLine()
      const segments: Segment[] = []
      const outcome = show(operands[0].bytes, segments)
      if (outcome.unsupported) return failure(outcome.unsupported)
      if (outcome.changed) edits.push({ start, end, text: `T* ${segmentsToTj(segments)}` })
    } else if (op === '"' && operands.length === 3 && operands[2].kind === 'str') {
      const [wordSpace, charSpace] = operandNumbers(operands.slice(0, 2))
      if (Number.isNaN(wordSpace) || Number.isNaN(charSpace)) {
        return failure('malformed " operator')
      }
      state.wordSpace = wordSpace
      state.charSpace = charSpace
      state.nextLine()
      const segments: Segment[] = []
      const outcome = show(operands[2].bytes, segments)
      if (outcome.unsupported) return failure(outcome.unsupported)
      if (outcome.changed) {
        const prefix = `${formatNumber(wordSpace)} Tw ${formatNumber(charSpace)} Tc T*`
        edits.push({ start, end, text: `${prefix} ${segmentsToTj(segments)}` })
      }
    } else if (op === 'TJ' && operands.length === 1 && operands[0].kind === 'arr') {
      const segments: Segment[] = []
      let changed = false
      for (const item of operands[0].items) {
        if (item.kind === 'num') {
          state.kern(item.value)
          segments.push({ kind: 'adj', value: item.value })
        } else {
          const outcome = show(item.bytes, segments)
          if (outcome.unsupported) return failure(outcome.unsupported)
          if (outcome.changed) changed = true
        }
      }
      if (changed) edits.push({ start, end, text: segmentsToTj(segments) })
    } else if (op === 'Do' && operands.length === 1 && operands[0].kind === 'name') {
      const info = opts.xobjects.get(operands[0].value)
      const problem = xobjectFailure(info, operands[0].value, state.ctm, opts.rects)
      if (problem) return failure(problem)
    } else if (op === INLINE_IMAGE_OP) {
      const problem = inlineImageFailure(state.ctm, opts.rects)
      if (problem) return failure(problem)
    } else if (op === 'BMC') {
      marked.beginPlain(start, end)
    } else if (op === 'BDC') {
      marked.begin(operands, start, end)
    } else if (op === 'EMC') {
      const problem = marked.end(edits)
      if (problem) return failure(problem)
    } else if (op === 'Tj' || op === "'" || op === '"' || op === 'TJ' || op === 'Do') {
      return failure(`malformed ${op} operator`)
    }
  }

  if (!collector.balanced) return failure('unbalanced grouping')
  const unclosed = marked.finish(edits)
  if (unclosed) return failure(unclosed)
  const content = spliceEdits(data, edits)
  if (!content) return failure('overlapping edits')
  return { ok: true, content, removed }
}
