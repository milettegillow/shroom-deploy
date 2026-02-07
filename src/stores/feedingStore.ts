import { create } from 'zustand'
import type { FoodType, ThrowRequest } from '../types'
import { THROW, FOOD_TYPES } from '../constants'

let samples: { x: number; y: number; t: number }[] = []

function recordSample(x: number, y: number) {
  const now = performance.now()
  samples = samples.filter((s) => s.t > now - THROW.velocityWindow)
  samples.push({ x, y, t: now })
}

function computeVelocity(x: number, y: number) {
  if (samples.length < 2) return { vx: 0, vy: 0 }
  const first = samples[0]
  const dt = (performance.now() - first.t) / 1000
  if (dt < 0.005) return { vx: 0, vy: 0 }
  return { vx: (x - first.x) / dt, vy: (y - first.y) / dt }
}

function clampY(y: number) {
  return Math.max(y, window.innerHeight * THROW.dragCeiling)
}

type CooldownMap = Record<string, boolean>

interface FeedingState {
  isDragging: boolean
  dragFoodType: FoodType | null
  dragX: number
  dragY: number
  throwRequest: ThrowRequest | null
  projectileActive: boolean
  cooldowns: CooldownMap
  startDrag: (foodType: FoodType, x: number, y: number) => void
  updateDrag: (x: number, y: number) => void
  endDrag: (x: number, y: number) => void
  cancelDrag: () => void
  consumeThrowRequest: () => ThrowRequest | null
  recordHit: (foodType: FoodType) => void
  recordMiss: () => void
}

export const useFeedingStore = create<FeedingState>()((set, get) => ({
  isDragging: false,
  dragFoodType: null,
  dragX: 0,
  dragY: 0,
  throwRequest: null,
  projectileActive: false,
  cooldowns: {} as CooldownMap,

  startDrag: (foodType, x, y) => {
    if (get().projectileActive || get().cooldowns[foodType]) return
    samples = [{ x, y, t: performance.now() }]
    set({ isDragging: true, dragFoodType: foodType, dragX: x, dragY: y })
  },

  updateDrag: (x, y) => {
    if (!get().isDragging) return
    const cy = clampY(y)
    recordSample(x, cy)
    set({ dragX: x, dragY: cy })
  },

  endDrag: (x, y) => {
    const { isDragging, dragFoodType } = get()
    if (!isDragging || !dragFoodType) return
    const cy = clampY(y)
    const vel = computeVelocity(x, cy)
    samples = []
    set({
      isDragging: false,
      projectileActive: true,
      throwRequest: { nx: x / window.innerWidth, ny: cy / window.innerHeight, ...vel, foodType: dragFoodType },
    })
  },

  cancelDrag: () => {
    samples = []
    set({ isDragging: false, dragFoodType: null })
  },

  consumeThrowRequest: () => {
    const req = get().throwRequest
    if (req) set({ throwRequest: null })
    return req
  },

  recordHit: (foodType) => {
    set({ projectileActive: false, cooldowns: { ...get().cooldowns, [foodType]: true } })
    setTimeout(() => {
      const { [foodType]: _, ...rest } = get().cooldowns
      set({ cooldowns: rest })
    }, FOOD_TYPES[foodType].cooldownMs)
  },

  recordMiss: () => set({ projectileActive: false }),
}))
