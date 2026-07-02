// SPDX-License-Identifier: MIT
export interface RgbaImage {
  data: Uint8ClampedArray
  width: number
  height: number
}

/**
 * Make near-white pixels transparent, then crop to the non-transparent bounding box.
 * `threshold` is the per-channel minimum for "white" (default 240). If nothing survives
 * (blank/all-white image), the original is returned unchanged.
 */
export function keyOutWhiteAndTrim(img: RgbaImage, threshold = 240): RgbaImage {
  const { width, height } = img
  const data = new Uint8ClampedArray(img.data) // copy; don't mutate input
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      if (data[i + 3] === 0) continue
      if (r >= threshold && g >= threshold && b >= threshold) {
        data[i + 3] = 0 // key near-white to transparent
        continue
      }
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }

  if (maxX < 0) return img // nothing survived — blank guard

  const outW = maxX - minX + 1
  const outH = maxY - minY + 1
  const out = new Uint8ClampedArray(outW * outH * 4)
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const src = ((minY + y) * width + (minX + x)) * 4
      const dst = (y * outW + x) * 4
      out[dst] = data[src]
      out[dst + 1] = data[src + 1]
      out[dst + 2] = data[src + 2]
      out[dst + 3] = data[src + 3]
    }
  }
  return { data: out, width: outW, height: outH }
}
