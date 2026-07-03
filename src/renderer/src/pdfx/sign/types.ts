// SPDX-License-Identifier: MIT
export type MarkRole = 'signature' | 'initials'
export type MarkKind = 'draw' | 'type' | 'image'

export interface MarkAsset {
  id: string
  role: MarkRole
  kind: MarkKind
  png: Uint8Array
  width: number
  height: number
  label?: string
  createdAt: string
}

export type PlacementKind = 'signature' | 'date' | 'initials'

export interface Placement {
  id: string
  pageId: string
  kind: PlacementKind
  xFrac: number
  yFrac: number
  wFrac: number
  hFrac: number
  assetId?: string // for signature/initials (library mark)
  png?: Uint8Array // inline generated image (e.g. a rasterized date) — stamped as an image, not selectable text
  text?: string // original text of a generated mark (kept for reference/regeneration)
  appliedToAllPages?: boolean
}

export type StampAssets = Map<string, MarkAsset>
