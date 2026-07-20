import { rgb } from 'pdf-lib'
import type { RGB } from 'pdf-lib'

export function hexColor(hex: string): RGB {
  const v = parseInt(hex.slice(1), 16)
  return rgb(((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255)
}
