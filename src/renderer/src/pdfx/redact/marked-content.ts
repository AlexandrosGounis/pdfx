import { escapeName } from './emit'
import type { Edit } from './emit'
import type { Operand } from './operands'

const HIDDEN_KEYS = new Set(['ActualText', 'Alt', 'E'])

interface Region {
  tag: string | null
  hidden: boolean
  dirty: boolean
  start: number
  end: number
}

function emitRewrite(region: Region, edits: Edit[]): string | null {
  if (!region.dirty || !region.hidden) return null
  if (!region.tag) return 'malformed marked-content with hidden text'
  edits.push({ start: region.start, end: region.end, text: `/${escapeName(region.tag)} BMC` })
  return null
}

export class MarkedContentTracker {
  private stack: Region[] = []

  constructor(private hiddenProps: Set<string>) {}

  beginPlain(start: number, end: number): void {
    this.stack.push({ tag: null, hidden: false, dirty: false, start, end })
  }

  begin(operands: Operand[], start: number, end: number): void {
    const [tagOp, propsOp] = operands
    const tag = tagOp?.kind === 'name' ? tagOp.value : null
    const hidden =
      operands.length !== 2 || !tag
        ? true
        : propsOp.kind === 'other'
          ? propsOp.names.some((key) => HIDDEN_KEYS.has(key))
          : propsOp.kind === 'name'
            ? this.hiddenProps.has(propsOp.value)
            : true
    this.stack.push({ tag, hidden, dirty: false, start, end })
  }

  markDirty(): void {
    for (const region of this.stack) region.dirty = true
  }

  end(edits: Edit[]): string | null {
    const region = this.stack.pop()
    return region ? emitRewrite(region, edits) : null
  }

  finish(edits: Edit[]): string | null {
    for (const region of this.stack) {
      const failure = emitRewrite(region, edits)
      if (failure) return failure
    }
    return null
  }
}
