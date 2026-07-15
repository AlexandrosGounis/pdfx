import { useLayoutEffect, useRef, useState } from 'react'

const STROKE = 1.5
const DASH = 5
const GAP = 5

function fittedDash(width: number, height: number, radius: number): string {
  const perimeter = 2 * (width + height) - 8 * radius + 2 * Math.PI * radius
  const periods = Math.max(1, Math.round(perimeter / (DASH + GAP)))
  const scale = perimeter / (periods * (DASH + GAP))
  return `${DASH * scale} ${GAP * scale}`
}

interface DashedBorderProps {
  width?: number
  height?: number
  radius: number
}

export function DashedBorder({ width, height, radius }: DashedBorderProps): React.JSX.Element {
  const ref = useRef<SVGSVGElement>(null)
  const [measured, setMeasured] = useState({ width: 0, height: 0 })
  const sized = width !== undefined && height !== undefined

  useLayoutEffect(() => {
    if (sized) return
    const host = ref.current?.parentElement
    if (!host) return
    const observer = new ResizeObserver(() =>
      setMeasured((prev) =>
        prev.width === host.offsetWidth && prev.height === host.offsetHeight
          ? prev
          : { width: host.offsetWidth, height: host.offsetHeight }
      )
    )
    observer.observe(host)
    return () => observer.disconnect()
  }, [sized])

  const w = width ?? measured.width
  const h = height ?? measured.height
  return (
    <svg ref={ref} className="dashed-border" width={w} height={h} aria-hidden="true">
      {w > 0 && h > 0 && (
        <rect
          x={STROKE / 2}
          y={STROKE / 2}
          width={w - STROKE}
          height={h - STROKE}
          rx={radius}
          ry={radius}
          fill="none"
          strokeWidth={STROKE}
          strokeDasharray={fittedDash(w - STROKE, h - STROKE, radius)}
        />
      )}
    </svg>
  )
}
