// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePlacements } from './usePlacements'

describe('usePlacements', () => {
  it('add assigns an id and forPage filters by pageId', () => {
    const { result } = renderHook(() => usePlacements())
    let id = ''
    act(() => {
      id = result.current.add({ pageId: 'A', kind: 'signature', xFrac: 0.1, yFrac: 0.1, wFrac: 0.2, hFrac: 0.1, assetId: 'x' }).id
    })
    expect(id).toMatch(/^[0-9a-fA-F-]{36}$/)
    expect(result.current.forPage('A')).toHaveLength(1)
    expect(result.current.forPage('B')).toHaveLength(0)
  })

  it('update patches geometry; remove drops it', () => {
    const { result } = renderHook(() => usePlacements())
    let id = ''
    act(() => {
      id = result.current.add({ pageId: 'A', kind: 'signature', xFrac: 0.1, yFrac: 0.1, wFrac: 0.2, hFrac: 0.1 }).id
    })
    act(() => result.current.update(id, { xFrac: 0.5 }))
    expect(result.current.placements[0].xFrac).toBe(0.5)
    act(() => result.current.remove(id))
    expect(result.current.placements).toHaveLength(0)
  })
})
