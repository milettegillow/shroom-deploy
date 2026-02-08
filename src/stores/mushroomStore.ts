import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { chat } from '../ai/aiService'
import { buildSystemPrompt } from '../ai/prompts'
import { STATS, MIST, JAR, FOOD_TYPES, STAGES, AI } from '../constants'
import { DEV } from '../devMode'
import { usePlayerStore } from './playerStore'
import type { EvolutionState, FoodType, Message, AgeStage } from '../types'

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
  lastChatTime: number
  lastGiftCount: number
  stage: AgeStage
  totalFeeds: number
  totalMists: number
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
  lastChatTime: 0,
  lastGiftTime: 0,
  lastGiftCount: 0,
  stage: 1 as AgeStage,
  totalFeeds: 0,
  totalMists: 0,
}

function checkStageUp(stage: AgeStage, totalFeeds: number, totalMists: number): AgeStage {
  if (stage === 1 && totalFeeds >= DEV.feedsToStage2) return 2
  if (stage === 2 && totalMists >= DEV.mistsToStage3) return 3
  return stage
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

    feed: (foodType) => set((s) => {
      const totalFeeds = s.totalFeeds + 1
      const stage = checkStageUp(s.stage, totalFeeds, s.totalMists)
      return {
        hunger: Math.max(0, s.hunger - FOOD_TYPES[foodType].hungerRelief),
        boredom: STAGES[s.stage].stats.boredom ? Math.max(0, s.boredom - STATS.feedBoredomRelief) : s.boredom,
        lastFeedTime: Date.now(),
        totalFeeds,
        stage,
      }
    }),

    mist: () => set((s) => {
      const totalMists = s.totalMists + 1
      const stage = checkStageUp(s.stage, s.totalFeeds, totalMists)
      return {
        thirst: Math.max(0, s.thirst - MIST.thirstRelief),
        lastMistTime: Date.now(),
        totalMists,
        stage,
      }
    }),

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
      const { conversationHistory, hunger, boredom, evolution, lastChatTime } = get()

      // Rate limit: enforce cooldown between messages
      if (Date.now() - lastChatTime < AI.chatCooldown) return

      const { playerName } = usePlayerStore.getState()
      const history = [...conversationHistory, { role: 'user' as const, content: text }]
      set({ conversationHistory: history, isConversing: true, lastChatTime: Date.now() })

      // Prune history for API call — only send last N messages
      const apiHistory = history.slice(-AI.maxHistory)

      let response: string
      try {
        response = await chat({
          messages: apiHistory,
          systemPrompt: buildSystemPrompt({ hunger, boredom, evolution, playerName }),
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
      const scaledDt = dt * DEV.statRateMultiplier
      const active = STAGES[s.stage].stats
      const hunger = active.hunger ? Math.min(100, s.hunger + STATS.hungerRate * scaledDt) : s.hunger
      const thirst = active.thirst ? Math.min(100, s.thirst + STATS.thirstRate * scaledDt) : s.thirst
      const boredom = active.boredom ? Math.min(100, s.boredom + STATS.boredomRate * scaledDt) : s.boredom
      return { hunger, boredom, thirst, evolution: resolveEvolution(hunger, s.evolution) }
    }),

    reset: () => set({ ...INITIAL }),
  })),
)
