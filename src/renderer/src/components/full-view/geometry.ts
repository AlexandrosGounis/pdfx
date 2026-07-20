export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export interface Size {
  w: number
  h: number
}

export interface View {
  zoom: number
  x: number
  y: number
}

export type Phase = 'opening' | 'open' | 'closing'

export const isMac = window.api.platform === 'darwin'
export const MIN_ZOOM = 1
export const MAX_ZOOM = 8
export const WHEEL_ZOOM_SPEED = 0.036
export const ZOOM_STEP = 1.4
export const DOUBLE_CLICK_ZOOM = 2.5
export const ARROW_PAN = 80
export const EDIT_PAN_ALLOWANCE = 64
export const GAP = 24
export const TRANSITION_MS = 340

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

export function fitInto(pw: number, ph: number, vp: Size): Size {
  const f = Math.min(vp.w / pw, vp.h / ph)
  return { w: pw * f, h: ph * f }
}

export function flipTo(fit: Size, vp: Size, rect: Rect): string {
  const left = (vp.w - fit.w) / 2
  const top = (vp.h - fit.h) / 2
  return `translate(${rect.left - left}px, ${rect.top - top}px) scale(${rect.width / fit.w})`
}
