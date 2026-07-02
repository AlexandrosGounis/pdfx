// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest'
import { mapPlacementToUserSpace } from './coords'

const frac = { xFrac: 0.1, yFrac: 0.2, wFrac: 0.3, hFrac: 0.25 }

describe('mapPlacementToUserSpace', () => {
  it('rotation 0: y-flips from the top', () => {
    // visual 100x200, box left=10 top=40 w=30 h=50
    const r = mapPlacementToUserSpace(frac, { visualWidth: 100, visualHeight: 200, rotation: 0 })
    expect(r).toEqual({ x: 10, y: 200 - 40 - 50, width: 30, height: 50, rotate: 0 })
  })

  it('rotation 180', () => {
    const r = mapPlacementToUserSpace(frac, { visualWidth: 100, visualHeight: 200, rotation: 180 })
    expect(r).toEqual({ x: 90, y: 90, width: 30, height: 50, rotate: 180 })
  })

  it('rotation 90', () => {
    const r = mapPlacementToUserSpace(frac, { visualWidth: 100, visualHeight: 200, rotation: 90 })
    expect(r).toEqual({ x: 90, y: 10, width: 30, height: 50, rotate: 90 })
  })

  it('rotation 270', () => {
    const r = mapPlacementToUserSpace(frac, { visualWidth: 100, visualHeight: 200, rotation: 270 })
    expect(r).toEqual({ x: 110, y: 90, width: 30, height: 50, rotate: 270 })
  })

  it('adds CropBox origin offset', () => {
    const r = mapPlacementToUserSpace(frac, {
      visualWidth: 100,
      visualHeight: 200,
      rotation: 0,
      cropX: 5,
      cropY: 7
    })
    expect(r.x).toBe(10 + 5)
    expect(r.y).toBe(200 - 40 - 50 + 7)
  })
})
