// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMarkLibrary } from './useMarkLibrary'
import type { MarkAsset } from '../pdfx/sign/types'

const asset = (id: string): MarkAsset => ({
  id,
  role: 'signature',
  kind: 'draw',
  png: new Uint8Array([137, 80, 78, 71]),
  width: 10,
  height: 10,
  createdAt: '2026-07-03'
})

let store: MarkAsset[]

beforeEach(() => {
  store = [asset('a')]
  // Minimal window.api.marks mock.
  ;(globalThis as unknown as { window: Window }).window ??= globalThis as unknown as Window
  ;(window as unknown as { api: unknown }).api = {
    marks: {
      list: vi.fn(async () => store),
      save: vi.fn(async (input: Omit<MarkAsset, 'id' | 'createdAt'>) => {
        const created = { ...input, id: 'new', createdAt: '2026-07-03' } as MarkAsset
        store = [...store, created]
        return created
      }),
      remove: vi.fn(async (id: string) => {
        store = store.filter((m) => m.id !== id)
      })
    }
  }
})

describe('useMarkLibrary', () => {
  it('loads existing marks on mount', async () => {
    const { result } = renderHook(() => useMarkLibrary())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.marks.map((m) => m.id)).toEqual(['a'])
  })

  it('save adds a mark to the list', async () => {
    const { result } = renderHook(() => useMarkLibrary())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.save({
        role: 'signature',
        kind: 'type',
        png: new Uint8Array([137, 80, 78, 71]),
        width: 5,
        height: 5
      })
    })
    expect(result.current.marks.map((m) => m.id)).toEqual(['a', 'new'])
  })

  it('remove drops a mark from the list', async () => {
    const { result } = renderHook(() => useMarkLibrary())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.remove('a')
    })
    expect(result.current.marks).toHaveLength(0)
  })

  it('clears a stale error after a subsequent successful save', async () => {
    const { result } = renderHook(() => useMarkLibrary())
    await waitFor(() => expect(result.current.loading).toBe(false))

    ;(window as unknown as { api: { marks: { save: unknown } } }).api.marks.save = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockImplementation(async (input: Omit<MarkAsset, 'id' | 'createdAt'>) => ({
        ...input,
        id: 'new2',
        createdAt: '2026-07-03'
      }))

    const markInput = {
      role: 'signature' as const,
      kind: 'type' as const,
      png: new Uint8Array([137, 80, 78, 71]),
      width: 5,
      height: 5
    }

    await act(async () => {
      await result.current.save(markInput)
    })
    expect(result.current.error).not.toBeNull()

    await act(async () => {
      await result.current.save(markInput)
    })
    expect(result.current.error).toBeNull()
  })
})
