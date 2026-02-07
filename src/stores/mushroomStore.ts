import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { chat } from '../ai/aiService'
import { buildSystemPrompt } from '../ai/prompts'
import { STATS, MIST, JAR, FOOD_TYPES } from '../constants'
import type { EvolutionState, FoodType, Message } from '../types'

interface MushroomState {
  hunger: number
  boredom: number
  thirst: number
  evolution: EvolutionState
  conversationHistory: Message[]
  isConversing: boolean
  lastMushroomMessage: string | null
  lastMushroomMessageId: number
  lastFeedTime: number
  lastMistTime: number
  lastPokeTime: number
  lastGiftTime: number
  lastGiftCount: number
  feed: (foodType: FoodType) => void
  mist: () => void
  poke: () => void
  giveFireflies: (count: number) => void
  sendMessage: (text: string) => Promise<void>
  receiveMessage: (text: string) => void
  tick: (dt: number) => void
  reset: () => void
}

const INITIAL: Omit<MushroomState, 'feed' | 'mist' | 'poke' | 'giveFireflies' | 'sendMessage' | 'receiveMessage' | 'tick' | 'reset'> = {
  hunger: 0,
  boredom: 0,
  thirst: 0,
  evolution: 'normal',
  conversationHistory: [],
  isConversing: false,
  lastMushroomMessage: null,
  lastMushroomMessageId: 0,
  lastFeedTime: 0,
  lastMistTime: 0,
  lastPokeTime: 0,
  lastGiftTime: 0,
  lastGiftCount: 0,
}

function resolveEvolution(hunger: number, current: EvolutionState): EvolutionState {
  if (hunger >= 100) return 'demonic'
  if (hunger >= STATS.darkThreshold) return 'dark'
  if (current === 'dark') return 'normal'
  return current
}

export const useMushroomStore = create<MushroomState>()(
  subscribeWithSelector((set, get) => ({
    ...INITIAL,

    feed: (foodType) => set((s) => ({
      hunger: Math.max(0, s.hunger - FOOD_TYPES[foodType].hungerRelief),
      boredom: Math.max(0, s.boredom - STATS.feedBoredomRelief),
      lastFeedTime: Date.now(),
    })),

    mist: () => set((s) => ({
      thirst: Math.max(0, s.thirst - MIST.thirstRelief),
      lastMistTime: Date.now(),
    })),

    poke: () => set({ lastPokeTime: Date.now() }),

    giveFireflies: (count) => set((s) => {
      const relief = Math.min(count * JAR.boredomReliefPerFirefly, JAR.boredomReliefCap)
      return {
        boredom: Math.max(0, s.boredom - relief),
        lastGiftTime: Date.now(),
        lastGiftCount: count,
      }
    }),

    sendMessage: async (text) => {
      const { conversationHistory, hunger, boredom, evolution } = get()
      const history = [...conversationHistory, { role: 'user' as const, content: text }]
      set({ conversationHistory: history, isConversing: true })

      let response: string
      try {
        response = await chat({
          messages: history,
          systemPrompt: buildSystemPrompt({ hunger, boredom, evolution, darkFeedCount: 0 }),
        })
      } catch {
        response = "Hmm, my thoughts feel fuzzy right now... say that again?"
      }

      set((s) => ({
        conversationHistory: [...s.conversationHistory, { role: 'assistant', content: response }],
        lastMushroomMessage: response,
        lastMushroomMessageId: s.lastMushroomMessageId + 1,
        isConversing: false,
        boredom: Math.max(0, s.boredom - STATS.chatBoredomRelief),
      }))
    },

    receiveMessage: (text) => set((s) => ({
      conversationHistory: [...s.conversationHistory, { role: 'assistant', content: text }],
      lastMushroomMessage: text,
      lastMushroomMessageId: s.lastMushroomMessageId + 1,
    })),

    tick: (dt) => set((s) => {
      if (s.evolution === 'demonic') return s
      const hunger = Math.min(100, s.hunger + STATS.hungerRate * dt)
      const boredom = Math.min(100, s.boredom + STATS.boredomRate * dt)
      const thirst = Math.min(100, s.thirst + STATS.thirstRate * dt)
      return { hunger, boredom, thirst, evolution: resolveEvolution(hunger, s.evolution) }
    }),

    reset: () => set({ ...INITIAL }),
  })),
)
