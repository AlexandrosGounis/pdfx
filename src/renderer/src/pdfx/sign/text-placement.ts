// SPDX-License-Identifier: MIT
import type { Placement } from './types'

/**
 * A placement that renders as text (needs an embedded font) — a date or typed
 * initials with no image source. When a `png` (e.g. a rasterized date) or an
 * `assetId` (a library mark) is present, it is stamped as an image instead.
 */
export const isTextPlacement = (p: Placement): boolean =>
  (p.kind === 'date' || p.kind === 'initials') && !p.assetId && !p.png
