import { useEffect, useCallback } from 'react'
import { useFeedingStore } from '../stores/feedingStore'
import { useMushroomStore } from '../stores/mushroomStore'
import { THROW, FOOD_TYPES, FOOD_TYPE_KEYS } from '../constants'
import type { FoodType } from '../types'
import styles from './FoodTray.module.css'

const cx = (...args: (string | false | undefined)[]) => args.filter(Boolean).join(' ')

export default function FoodTray() {
  const { isDragging, dragFoodType, projectileActive, cooldowns } = useFeedingStore()
  const hunger = useMushroomStore((s) => s.hunger)
  const fullness = 100 - Math.round(hunger)
  const ceilingY = Math.round(window.innerHeight * THROW.dragCeiling)

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
      {FOOD_TYPE_KEYS.map((type, i) => {
        const itemDisabled = projectileActive || !!cooldowns[type]
        return (
        <div
          key={type}
          className={cx(styles.foodItem, fullness <= 70 && styles.wobbling, itemDisabled && styles.disabled, isDragging && dragFoodType === type && styles.pickedUp)}
          style={{ animationDelay: `${i * 0.15}s` }}
          onPointerDown={(e) => onPointerDown(type, e)}
        >
          <span className={styles.emoji}>{FOOD_TYPES[type].emoji}</span>
          <span className={styles.label}>{FOOD_TYPES[type].label}</span>
        </div>
        )
      })}
      {isDragging && (
        <>
          <div className={styles.boundary} style={{ top: ceilingY }} />
          <span className={styles.boundaryLabel} style={{ top: ceilingY }}>throw from here</span>
        </>
      )}
    </>
  )
}
