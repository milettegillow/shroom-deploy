import { useEffect, useCallback } from 'react'
import { useFireflyStore } from '../stores/fireflyStore'
import styles from './FireflyJar.module.css'

const cx = (...args: (string | false | undefined)[]) => args.filter(Boolean).join(' ')

export default function FireflyJar() {
  const { phase, jarCount, giftActive, coolingDown } = useFireflyStore()
  const disabled = giftActive || coolingDown
  const isDragging = phase !== 'idle'
  const hasFireflies = jarCount > 0

  // Aggressive glow — starts visible at 1, saturates fast
  const glowSize = 8 + jarCount * 8
  const glowAlpha = Math.min(1, 0.3 + jarCount * 0.15)
  const outerSize = glowSize * 2.5
  const bgAlpha = Math.min(0.6, jarCount * 0.08)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    useFireflyStore.getState().startDrag(e.clientX, e.clientY)
  }, [])

  const onPointerMove = useCallback((e: PointerEvent) => {
    useFireflyStore.getState().updateDrag(e.clientX, e.clientY)
  }, [])

  const onPointerUp = useCallback((e: PointerEvent) => {
    useFireflyStore.getState().endDrag(e.clientX, e.clientY)
  }, [])

  useEffect(() => {
    if (!isDragging) return
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [isDragging, onPointerMove, onPointerUp])

  const glowStyle = hasFireflies ? {
    boxShadow: `0 0 ${glowSize}px rgba(255, 180, 60, ${glowAlpha}), 0 0 ${outerSize}px rgba(255, 140, 30, ${glowAlpha * 0.5}), inset 0 0 12px rgba(255, 200, 80, ${bgAlpha})`,
    background: `rgba(${90 + jarCount * 12}, ${75 + jarCount * 10}, 40, 0.8)`,
    borderColor: `rgba(255, 200, 80, ${Math.min(0.7, 0.2 + jarCount * 0.1)})`,
  } : undefined

  return (
    <>
      <div className={styles.wrapper}>
        <div
          className={cx(
            styles.jar,
            disabled && styles.empty,
            isDragging && styles.dragging,
            hasFireflies && !isDragging && styles.glowing,
          )}
          style={!isDragging ? glowStyle : undefined}
          onPointerDown={onPointerDown}
        >
          <span className={styles.emoji}>🫙</span>
          {hasFireflies && <span className={styles.count}>{jarCount}</span>}
        </div>
        <span className={styles.label}>Fireflies</span>
      </div>
      {phase === 'scooping' && !hasFireflies && (
        <div className={styles.hint}>Catch fireflies!</div>
      )}
      {phase === 'scooping' && hasFireflies && (
        <div className={styles.hint}>Drop on mushroom!</div>
      )}
      {phase === 'gifting' && (
        <div className={styles.hint}>Drop on mushroom!</div>
      )}
    </>
  )
}
