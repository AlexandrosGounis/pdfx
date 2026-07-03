// SPDX-License-Identifier: MIT
import type { MarkAsset, Placement, StampAssets } from './types'

/**
 * For each page id, the placements to stamp: the page's own (non apply-to-all) placements,
 * plus every apply-to-all initials placement re-targeted to that page.
 */
export function placementsByPage(pageIds: string[], placements: Placement[]): Map<string, Placement[]> {
  // Apply-to-all fan-out is only for initials (per the field model); a stray flag on a
  // signature/date stays on its own page rather than fanning out unexpectedly.
  const isApplyAllInitials = (p: Placement): boolean => !!p.appliedToAllPages && p.kind === 'initials'
  const applyAll = placements.filter(isApplyAllInitials)
  const map = new Map<string, Placement[]>()
  for (const pageId of pageIds) {
    const own = placements.filter((p) => !isApplyAllInitials(p) && p.pageId === pageId)
    const all = applyAll.map((p) => ({ ...p, pageId }))
    map.set(pageId, [...own, ...all])
  }
  return map
}

/** Build an assetId -> MarkAsset map for the assets referenced by the placements. */
export function collectAssets(placements: Placement[], marks: MarkAsset[]): StampAssets {
  const byId = new Map(marks.map((m) => [m.id, m]))
  const out: StampAssets = new Map()
  for (const p of placements) {
    if (p.assetId && !out.has(p.assetId)) {
      const mark = byId.get(p.assetId)
      if (mark) out.set(p.assetId, mark)
    }
  }
  return out
}
