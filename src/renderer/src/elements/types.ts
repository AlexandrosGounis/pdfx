import type { MarkKind } from '../edit/types'

export type ElementKind = 'ink' | 'text'

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

export interface TextMark {
  kind: MarkKind
  start: number
  end: number
}

export interface TextElement {
  id: string
  kind: 'text'
  number: number
  color: string
  fontSize: number
  text: string
  origin: ElementPoint
  marks: TextMark[]
  bbox: ElementRect
}

export type PageElement = InkElement | TextElement

export type ElementMap = Record<string, PageElement[]>

export const INK_COLOR = '#16161c'

export const INK_STROKE_WIDTH = 1.6

export const TEXT_COLOR = '#16161c'

export const TEXT_FONT_SIZE = 14

export const TEXT_FONT_FAMILY = 'Helvetica, Arial, sans-serif'

export const TEXT_LINE_HEIGHT = 1.25

export const TEXT_BASELINE = 0.9

export const TEXT_MARK_PAD = 1.5

export const textLines = (text: string): string[] => text.split('\n')

export const elementLabel = (element: PageElement): string => `Element #${element.number}`
