// SPDX-License-Identifier: MIT
import { useCallback, useState } from 'react'
import type { Placement } from '../pdfx/sign/types'

type GeomPatch = Partial<Pick<Placement, 'xFrac' | 'yFrac' | 'wFrac' | 'hFrac' | 'text' | 'appliedToAllPages'>>

export function usePlacements(): {
  placements: Placement[]
  forPage(pageId: string): Placement[]
  add(p: Omit<Placement, 'id'>): Placement
  update(id: string, patch: GeomPatch): void
  remove(id: string): void
} {
  const [placements, setPlacements] = useState<Placement[]>([])

  const forPage = useCallback(
    (pageId: string) => placements.filter((p) => p.pageId === pageId),
    [placements]
  )
  const add = useCallback((p: Omit<Placement, 'id'>): Placement => {
    const created: Placement = { ...p, id: crypto.randomUUID() }
    setPlacements((prev) => [...prev, created])
    return created
  }, [])
  const update = useCallback((id: string, patch: GeomPatch): void => {
    setPlacements((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }, [])
  const remove = useCallback((id: string): void => {
    setPlacements((prev) => prev.filter((p) => p.id !== id))
  }, [])

  return { placements, forPage, add, update, remove }
}
