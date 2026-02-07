import { create } from 'zustand'
import { useFeedingStore } from './feedingStore'
import { JAR } from '../constants'

type JarPhase = 'idle' | 'scooping' | 'gifting'

interface GiftRequest {
  nx: number
  ny: number
}

interface FireflyState {
  jarCount: number
  phase: JarPhase
  dragX: number
  dragY: number
  giftRequest: GiftRequest | null
  giftActive: boolean
  coolingDown: boolean
  startDrag: (x: number, y: number) => void
  updateDrag: (x: number, y: number) => void
  endDrag: (x: number, y: number) => void
  addCatch: () => void
  consumeGiftRequest: () => GiftRequest | null
  completeGift: () => number
  resetGift: () => void
}

export const useFireflyStore = create<FireflyState>()((set, get) => ({
  jarCount: 0,
  phase: 'idle',
  dragX: 0,
  dragY: 0,
  giftRequest: null,
  giftActive: false,
  coolingDown: false,

  startDrag: (x, y) => {
    const { giftActive, coolingDown, jarCount } = get()
    if (giftActive || coolingDown) return
    if (useFeedingStore.getState().isDragging) return
    set({ phase: jarCount > 0 ? 'gifting' : 'scooping', dragX: x, dragY: y })
  },

  updateDrag: (x, y) => {
    if (get().phase === 'idle') return
    set({ dragX: x, dragY: y })
  },

  endDrag: (x, y) => {
    const { phase, jarCount } = get()
    if (phase === 'idle') return

    if (phase === 'scooping' && jarCount === 0) {
      set({ phase: 'idle' })
      return
    }

    // Both scooping-with-fireflies and gifting → deliver to mushroom
    set({
      phase: 'idle',
      giftActive: true,
      giftRequest: { nx: x / window.innerWidth, ny: y / window.innerHeight },
    })
  },

  addCatch: () => set((s) => ({ jarCount: s.jarCount + 1 })),

  consumeGiftRequest: () => {
    const req = get().giftRequest
    if (req) set({ giftRequest: null })
    return req
  },

  completeGift: () => {
    const count = get().jarCount
    set({ jarCount: 0, giftActive: false, coolingDown: true })
    setTimeout(() => set({ coolingDown: false }), JAR.cooldownMs)
    return count
  },

  resetGift: () => set({ giftActive: false }),
}))
