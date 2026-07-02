// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest'
import { isTextPlacement } from './text-placement'
import type { Placement } from './types'

const base: Omit<Placement, 'kind' | 'assetId'> = {
  id: 'p1',
  pageId: 'page-a',
  xFrac: 0.1,
  yFrac: 0.1,
  wFrac: 0.3,
  hFrac: 0.2
}

describe('isTextPlacement', () => {
  it('is true for a date placement', () => {
    const p: Placement = { ...base, kind: 'date' }
    expect(isTextPlacement(p)).toBe(true)
  })

  it('is true for an initials placement with no assetId', () => {
    const p: Placement = { ...base, kind: 'initials' }
    expect(isTextPlacement(p)).toBe(true)
  })

  it('is false for an initials placement with an assetId', () => {
    const p: Placement = { ...base, kind: 'initials', assetId: 'asset-1' }
    expect(isTextPlacement(p)).toBe(false)
  })

  it('is false for a signature placement', () => {
    const p: Placement = { ...base, kind: 'signature', assetId: 'asset-1' }
    expect(isTextPlacement(p)).toBe(false)
  })
})
