// SPDX-License-Identifier: MIT
import { keyOutWhiteAndTrim, type RgbaImage } from '../../pdfx/sign/image-tools'

const FONT_STACK = '"Segoe Script","Brush Script MT","Snell Roundhand","Apple Chancery",cursive'

export async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('canvas: PNG encode failed')
  return new Uint8Array(await blob.arrayBuffer())
}

// White-key + trim a canvas, returning a transparent PNG sized to the ink.
export async function trimToPng(
  canvas: HTMLCanvasElement
): Promise<{ png: Uint8Array; width: number; height: number }> {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas: no 2d context')
  const src: RgbaImage = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const trimmed = keyOutWhiteAndTrim(src)
  const out = document.createElement('canvas')
  out.width = trimmed.width
  out.height = trimmed.height
  const octx = out.getContext('2d')
  if (!octx) throw new Error('canvas: no 2d context')
  octx.putImageData(new ImageData(new Uint8ClampedArray(trimmed.data), trimmed.width, trimmed.height), 0, 0)
  return { png: await canvasToPngBytes(out), width: out.width, height: out.height }
}

export async function typedSignatureToPng(
  text: string,
  opts: { fontPx?: number; dpr?: number } = {}
): Promise<{ png: Uint8Array; width: number; height: number }> {
  const fontPx = opts.fontPx ?? 96
  const dpr = opts.dpr ?? 2
  const measure = document.createElement('canvas').getContext('2d')
  if (!measure) throw new Error('canvas: no 2d context')
  measure.font = `${fontPx}px ${FONT_STACK}`
  const w = Math.ceil(measure.measureText(text).width) + fontPx
  const h = Math.ceil(fontPx * 1.6)
  const canvas = document.createElement('canvas')
  canvas.width = w * dpr
  canvas.height = h * dpr
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas: no 2d context')
  ctx.scale(dpr, dpr)
  ctx.fillStyle = '#111'
  ctx.textBaseline = 'middle'
  ctx.font = `${fontPx}px ${FONT_STACK}`
  ctx.fillText(text, fontPx / 2, h / 2)
  return trimToPng(canvas) // transparent bg -> white-key is a no-op; trims to the glyphs
}

export async function fileToTrimmedPng(
  file: Blob
): Promise<{ png: Uint8Array; width: number; height: number }> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('image: load failed'))
      el.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas: no 2d context')
    ctx.drawImage(img, 0, 0)
    return trimToPng(canvas)
  } finally {
    URL.revokeObjectURL(url)
  }
}
