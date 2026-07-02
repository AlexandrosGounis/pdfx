// SPDX-License-Identifier: MIT
import type { Placement } from './types'

/** A placement that renders as text (needs an embedded font). */
export const isTextPlacement = (p: Placement): boolean =>
  p.kind === 'date' || (p.kind === 'initials' && !p.assetId)
