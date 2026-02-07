import { useCallback } from 'react'
import { useFeedingStore } from '../stores/feedingStore'
import { useMushroomStore } from '../stores/mushroomStore'
import { FOOD_TYPES, FOOD_TYPE_KEYS } from '../constants'
import classNames from 'classnames'
import { useDragListeners } from '../hooks/useDragListeners'
import type { FoodType } from '../types'
import styles from './FoodTray.module.css'

export default function FoodTray() {
  const { isDragging, dragFoodType, projectileActive, cooldowns } = useFeedingStore()
  const hunger = useMushroomStore((s) => s.hunger)
  const fullness = 100 - Math.round(hunger)

  const onPointerDown = useCallback((type: FoodType, e: React.PointerEvent) => {
    e.preventDefault()
    useFeedingStore.getState().startDrag(type, e.clientX, e.clientY)
  }, [])

  const onPointerMove = useCallback((e: PointerEvent) => useFeedingStore.getState().updateDrag(e.clientX, e.clientY), [])
  const onPointerUp = useCallback((e: PointerEvent) => useFeedingStore.getState().endDrag(e.clientX, e.clientY), [])

  useDragListeners(isDragging, onPointerMove, onPointerUp)

  return (
    <>
      {FOOD_TYPE_KEYS.map((type) => {
        const itemDisabled = projectileActive || !!cooldowns[type]
        return (
        <div
          key={type}
          className={classNames(styles.foodItem, fullness <= 70 && styles.wobbling, itemDisabled && styles.disabled, isDragging && dragFoodType === type && styles.pickedUp)}
          onPointerDown={(e) => onPointerDown(type, e)}
        >
          <span className={styles.emoji}>{FOOD_TYPES[type].emoji}</span>
          <span className={styles.label}>{FOOD_TYPES[type].label}</span>
        </div>
        )
      })}
      {isDragging && (
        <>
          <div className={styles.boundary} />
          <span className={styles.boundaryLabel}>throw from here</span>
        </>
      )}
    </>
  )
}
