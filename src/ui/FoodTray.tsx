import { useCallback } from 'react'
import { useFeedingStore } from '../stores/feedingStore'
import { useMushroomStore } from '../stores/mushroomStore'
import { useGameStore } from '../stores/gameStore'
import { FOOD_TYPES, STAGES } from '../constants'
import classNames from 'classnames'
import { useDragListeners } from '../hooks/useDragListeners'
import type { AgeStage, FoodType } from '../types'
import styles from './FoodTray.module.css'

export default function FoodTray() {
  const { isDragging, dragFoodType, projectileActive, cooldowns } = useFeedingStore()
  const hunger = useMushroomStore((s) => s.hunger)
  const stage = useMushroomStore((s) => s.stage)
  const paused = useGameStore((s) => s.paused)
  const fullness = 100 - Math.round(hunger)
  const availableFoods = STAGES[stage].food
  const prevFoods = stage > 1 ? STAGES[(stage - 1) as AgeStage].food : []

  const onPointerDown = useCallback((type: FoodType, e: React.PointerEvent) => {
    e.preventDefault()
    useFeedingStore.getState().startDrag(type, e.clientX, e.clientY)
  }, [])

  const onPointerMove = useCallback((e: PointerEvent) => useFeedingStore.getState().updateDrag(e.clientX, e.clientY), [])
  const onPointerUp = useCallback((e: PointerEvent) => useFeedingStore.getState().endDrag(e.clientX, e.clientY), [])

  useDragListeners(isDragging, onPointerMove, onPointerUp)

  return (
    <>
      {availableFoods.map((type, i) => {
        const onCooldown = !!cooldowns[type]
        const itemDisabled = projectileActive || onCooldown
        const isNew = stage > 1 && paused && !prevFoods.includes(type)
        return (
        <div
          key={type}
          data-tutorial={i === 0 ? 'food-tray' : (isNew ? 'new-food' : undefined)}
          className={classNames(styles.foodItem, fullness <= 70 && styles.wobbling, itemDisabled && styles.disabled, isDragging && dragFoodType === type && styles.pickedUp)}
          onPointerDown={(e) => onPointerDown(type, e)}
        >
          {isNew && <span className={styles.newBadge}>NEW</span>}
          {onCooldown && <span className={styles.cooldownIcon}>⏳</span>}
          <span className={styles.emoji}>{FOOD_TYPES[type].emoji}</span>
          <span className={styles.label}>{FOOD_TYPES[type].label}</span>
          <span className={styles.tooltip}>+{FOOD_TYPES[type].hungerRelief} hunger</span>
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
