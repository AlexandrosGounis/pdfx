import { IDENTITY, multiply, quadBounds, translation } from './geometry'
import type { Box, Matrix } from './geometry'
import type { FontWidths } from './fonts'

const ASCENT = 0.9
const DESCENT = -0.22

export class TextState {
  ctm: Matrix = IDENTITY
  tm: Matrix = IDENTITY
  tlm: Matrix = IDENTITY
  font: FontWidths | null | undefined
  fontName = ''
  size = 0
  charSpace = 0
  wordSpace = 0
  hscale = 1
  leading = 0
  rise = 0
  private saved: Matrix[] = []

  save(): void {
    this.saved.push(this.ctm)
  }

  restore(): void {
    this.ctm = this.saved.pop() ?? IDENTITY
  }

  concat(m: Matrix): void {
    this.ctm = multiply(m, this.ctm)
  }

  beginText(): void {
    this.tm = IDENTITY
    this.tlm = IDENTITY
  }

  setFont(font: FontWidths | null | undefined, name: string, size: number): void {
    this.font = font
    this.fontName = name
    this.size = size
  }

  moveText(tx: number, ty: number): void {
    this.tlm = multiply(translation(tx, ty), this.tlm)
    this.tm = this.tlm
  }

  setTextMatrix(m: Matrix): void {
    this.tlm = m
    this.tm = m
  }

  nextLine(): void {
    this.moveText(0, -this.leading)
  }

  kern(value: number): void {
    this.tm = multiply(translation((-value / 1000) * this.size * this.hscale, 0), this.tm)
  }

  advance(tx: number): void {
    this.tm = multiply(translation(tx, 0), this.tm)
  }

  private extraSpacing(code: number): number {
    return this.charSpace + (this.font?.spaceCode === code ? this.wordSpace : 0)
  }

  glyphAdvance(code: number): number {
    if (!this.font) return 0
    return ((this.font.widthOf(code) / 1000) * this.size + this.extraSpacing(code)) * this.hscale
  }

  glyphAdjustment(code: number): number {
    if (!this.font || this.size === 0) return 0
    return this.font.widthOf(code) + (this.extraSpacing(code) * 1000) / this.size
  }

  glyphBox(advance: number): Box {
    return quadBounds(
      multiply(this.tm, this.ctm),
      0,
      this.rise + DESCENT * this.size,
      Math.max(advance, 1e-6),
      this.rise + ASCENT * this.size
    )
  }
}
