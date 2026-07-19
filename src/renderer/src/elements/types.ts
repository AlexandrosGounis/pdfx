export type ElementKind = 'ink'

export interface ElementPoint {
  x: number
  y: number
}

export interface ElementRect {
  x: number
  y: number
  w: number
  h: number
}

export interface InkElement {
  id: string
  kind: 'ink'
  number: number
  color: string
  strokeWidth: number
  points: ElementPoint[]
  bbox: ElementRect
}

export type PageElement = InkElement

export type ElementMap = Record<string, PageElement[]>

export const INK_COLOR = '#16161c'

export const INK_STROKE_WIDTH = 1.6

export const elementLabel = (element: PageElement): string => `Element #${element.number}`
