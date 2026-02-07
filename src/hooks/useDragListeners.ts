import { useEffect } from 'react'

export function useDragListeners(
  active: boolean,
  onMove: (e: PointerEvent) => void,
  onUp: (e: PointerEvent) => void,
) {
  useEffect(() => {
    if (!active) return
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [active, onMove, onUp])
}
