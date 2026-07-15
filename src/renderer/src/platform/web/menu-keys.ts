import type { MenuAction, ZoomAction } from '../../../../preload'

const hasModifier = (event: KeyboardEvent): boolean =>
  (event.metaKey || event.ctrlKey) && !event.altKey

export function onZoom(callback: (action: ZoomAction) => void): () => void {
  const listener = (event: KeyboardEvent): void => {
    if (!hasModifier(event)) return
    const action: ZoomAction | null =
      event.key === '=' || event.key === '+'
        ? 'in'
        : event.key === '-'
          ? 'out'
          : event.key === '0'
            ? 'reset'
            : null
    if (!action) return
    event.preventDefault()
    callback(action)
  }
  window.addEventListener('keydown', listener)
  return () => window.removeEventListener('keydown', listener)
}

export function onMenu(callback: (action: MenuAction) => void): () => void {
  const listener = (event: KeyboardEvent): void => {
    if (!hasModifier(event) || event.shiftKey) return
    const key = event.key.toLowerCase()
    const action: MenuAction | null = key === 'o' ? 'open' : key === 'e' ? 'export-pdfx' : null
    if (!action) return
    event.preventDefault()
    callback(action)
  }
  window.addEventListener('keydown', listener)
  return () => window.removeEventListener('keydown', listener)
}
