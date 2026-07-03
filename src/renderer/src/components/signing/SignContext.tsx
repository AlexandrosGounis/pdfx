// SPDX-License-Identifier: MIT
import { createContext, useContext } from 'react'
import type { MarkAsset, Placement } from '../../pdfx/sign/types'

// Geometry the placement editor is allowed to mutate.
export type PlacementPatch = Partial<
  Pick<Placement, 'xFrac' | 'yFrac' | 'wFrac' | 'hFrac' | 'appliedToAllPages'>
>

// The subset of the placement + mark state the FullView editor consumes.
// Mirrors the FindContext pattern so FullViewPage can read it without prop-drilling.
export interface SignApi {
  signMode: boolean
  setSignMode: (on: boolean) => void
  marks: MarkAsset[]
  forPage: (pageId: string) => Placement[]
  add: (p: Omit<Placement, 'id'>) => Placement
  update: (id: string, patch: PlacementPatch) => void
  remove: (id: string) => void
  // Copy an initials mark onto every page as an independent, per-page placement
  // (deduped by asset). Each copy can then be moved, removed, or replaced.
  addToAllPages: (source: Placement) => void
}

const SignContext = createContext<SignApi>({
  signMode: false,
  setSignMode: () => {},
  marks: [],
  forPage: () => [],
  add: () => {
    throw new Error('SignProvider is missing')
  },
  update: () => {},
  remove: () => {},
  addToAllPages: () => {}
})

export const SignProvider = SignContext.Provider

export function useSign(): SignApi {
  return useContext(SignContext)
}
