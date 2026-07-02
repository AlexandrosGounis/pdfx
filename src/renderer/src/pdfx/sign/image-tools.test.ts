// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest'
import { keyOutWhiteAndTrim, type RgbaImage } from './image-tools'

// Build a 4x4 image: white border, a single black ink pixel at (1,1).
function makeImage(): RgbaImage {
  const width = 4
  const height = 4
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = 255
    data[i * 4 + 1] = 255
    data[i * 4 + 2] = 255
    data[i * 4 + 3] = 255
  }
  const ink = (1 * width + 1) * 4
  data[ink] = 0
  data[ink + 1] = 0
  data[ink + 2] = 0
  data[ink + 3] = 255
  return { data, width, height }
}

describe('keyOutWhiteAndTrim', () => {
  it('keys white to transparent and trims to the ink bbox', () => {
    const out = keyOutWhiteAndTrim(makeImage())
    // Only the 1x1 black pixel survives.
    expect(out.width).toBe(1)
    expect(out.height).toBe(1)
    expect([out.data[0], out.data[1], out.data[2], out.data[3]]).toEqual([0, 0, 0, 255])
  })

  it('returns the original when the image is entirely near-white (blank guard)', () => {
    const blank: RgbaImage = { data: new Uint8ClampedArray(16), width: 2, height: 2 }
    blank.data.fill(255)
    const out = keyOutWhiteAndTrim(blank)
    expect(out.width).toBe(2)
    expect(out.height).toBe(2)
  })
})
