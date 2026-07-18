import type { ContentToken } from './tokens'

export type Operand =
  | { kind: 'num'; value: number; start: number; end: number }
  | { kind: 'name'; value: string; start: number; end: number }
  | { kind: 'str'; bytes: Uint8Array; start: number; end: number }
  | { kind: 'arr'; items: ArrayItem[]; start: number; end: number }
  | { kind: 'other'; names: string[]; start: number; end: number }

export type ArrayItem = { kind: 'num'; value: number } | { kind: 'str'; bytes: Uint8Array }

export const operandNumbers = (operands: Operand[]): number[] =>
  operands.map((o) => (o.kind === 'num' ? o.value : NaN))

export function operandFromToken(token: ContentToken): Operand | null {
  if (token.type === 'num') {
    return { kind: 'num', value: token.value, start: token.start, end: token.end }
  }
  if (token.type === 'name') {
    return { kind: 'name', value: token.value, start: token.start, end: token.end }
  }
  if (token.type === 'str') {
    return { kind: 'str', bytes: token.bytes, start: token.start, end: token.end }
  }
  return null
}

const namesWithin = (operand: Operand): string[] =>
  operand.kind === 'name' ? [operand.value] : operand.kind === 'other' ? operand.names : []

function foldArray(inner: Operand[], start: number, end: number): Operand {
  const items: ArrayItem[] = []
  for (const operand of inner) {
    if (operand.kind === 'num') items.push({ kind: 'num', value: operand.value })
    else if (operand.kind === 'str') items.push({ kind: 'str', bytes: operand.bytes })
    else return { kind: 'other', names: inner.flatMap(namesWithin), start, end }
  }
  return { kind: 'arr', items, start, end }
}

interface Group {
  type: 'arr' | 'dict'
  saved: Operand[]
  start: number
}

export class OperandCollector {
  private groups: Group[] = []
  private operands: Operand[] = []

  push(operand: Operand): void {
    this.operands.push(operand)
  }

  openGroup(type: 'arr' | 'dict', start: number): void {
    this.groups.push({ type, saved: this.operands, start })
    this.operands = []
  }

  closeGroup(type: 'arr' | 'dict', end: number): boolean {
    const group = this.groups.pop()
    if (!group || group.type !== type) return false
    const inner = this.operands
    this.operands = group.saved
    if (type === 'arr') {
      this.operands.push(foldArray(inner, group.start, end))
    } else {
      this.operands.push({
        kind: 'other',
        names: inner.flatMap(namesWithin),
        start: group.start,
        end
      })
    }
    return true
  }

  take(): Operand[] {
    const taken = this.operands
    this.operands = []
    return taken
  }

  get balanced(): boolean {
    return this.groups.length === 0
  }
}
