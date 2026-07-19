export type MarkKind = 'highlight' | 'redact'

export type EditTool = MarkKind | 'draw'

export const isMarkTool = (tool: EditTool | null): tool is MarkKind =>
  tool === 'highlight' || tool === 'redact'

export type MarkColor = 'yellow' | 'black'

export const MARK_COLORS: Record<MarkColor, string> = {
  yellow: '#ffd54a',
  black: '#101012'
}

export const DEFAULT_MARK_COLORS: Record<MarkKind, MarkColor> = {
  highlight: 'yellow',
  redact: 'black'
}

export interface MarkRect {
  x: number
  y: number
  w: number
  h: number
}

export interface Mark {
  id: string
  kind: MarkKind
  color: MarkColor
  rects: MarkRect[]
}

export type MarkMap = Record<string, Mark[]>
