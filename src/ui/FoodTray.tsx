import { useEffect, useCallback } from 'react'
import { useFeedingStore } from '../stores/feedingStore'
import { useMushroomStore } from '../stores/mushroomStore'
import { THROW, FOOD_TYPES, FOOD_TYPE_KEYS } from '../constants'
import type { FoodType } from '../types'
import styles from './FoodTray.module.css'

const cx = (...args: (string | false | undefined)[]) => args.filter(Boolean).join(' ')

function meterState(hunger: number) {
  const fullness = 100 - Math.round(hunger)
  const color = fullness <= 30 ? '#e05555' : fullness <= 60 ? '#e0a030' : '#55b060'
  const label = fullness > 70 ? 'Full' : fullness > 40 ? 'Hungry' : 'Starving!'
  return { fullness, color, label }
}

export default function FoodTray() {
  const { isDragging, dragFoodType, projectileActive, coolingDown } = useFeedingStore()
  const hunger = useMushroomStore((s) => s.hunger)
  const disabled = projectileActive || coolingDown
  const ceilingY = Math.round(window.innerHeight * THROW.dragCeiling)
  const meter = meterState(hunger)

  const onPointerDown = useCallback((type: FoodType, e: React.PointerEvent) => {
    e.preventDefault()
    useFeedingStore.getState().startDrag(type, e.clientX, e.clientY)
  }, [])

  const onPointerMove = useCallback((e: PointerEvent) => useFeedingStore.getState().updateDrag(e.clientX, e.clientY), [])
  const onPointerUp = useCallback((e: PointerEvent) => useFeedingStore.getState().endDrag(e.clientX, e.clientY), [])

  useEffect(() => {
    if (!isDragging) return
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [isDragging, onPointerMove, onPointerUp])

  return (
    <>
      <div className={styles.tray}>
        <span className={styles.trayLabel}>Feed</span>
        <div className={styles.meter}>
          <div className={styles.meterFill} style={{ width: `${meter.fullness}%`, background: meter.color }} />
          <span className={styles.meterText}>{meter.label}</span>
        </div>
        <div className={styles.trayItems}>
          {FOOD_TYPE_KEYS.map((type, i) => (
            <div
              key={type}
              className={cx(styles.foodItem, meter.fullness <= 70 && styles.wobbling, disabled && styles.disabled, isDragging && dragFoodType === type && styles.pickedUp)}
              style={{ animationDelay: `${i * 0.15}s` }}
              onPointerDown={(e) => onPointerDown(type, e)}
            >
              <span className={styles.emoji}>{FOOD_TYPES[type].emoji}</span>
              <span className={styles.label}>{FOOD_TYPES[type].label}</span>
            </div>
          ))}
        </div>
      </div>
      {isDragging && (
        <>
          <div className={styles.boundary} style={{ top: ceilingY }} />
          <span className={styles.boundaryLabel} style={{ top: ceilingY }}>throw from here</span>
        </>
      )}
    </>
  )
}
