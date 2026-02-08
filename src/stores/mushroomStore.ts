import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { chat } from '../ai/aiService'
import { buildSystemPrompt, buildInitiationPrompt, buildReactionPrompt } from '../ai/prompts'
import type { InitiationTrigger, ReactionEvent } from '../ai/prompts'
import { HUNGER_MESSAGES, THIRST_MESSAGES, BOREDOM_MESSAGES } from '../ai/messages'
import { pickRandom } from '../utils/helpers'
import { STATS, MIST, JAR, FOOD_TYPES, STAGES, AI, TIMING } from '../constants'
import { tts } from '../audio/ttsService'
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
  lastMessageTime: number
  lastFeedTime: number
  lastMistTime: number
  lastPokeTime: number
  lastGiftTime: number
  lastChatTime: number
  lastReactionTime: number
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
  generateMushroomMessage: (trigger: InitiationTrigger) => Promise<void>
  reactToEvent: (event: ReactionEvent) => Promise<void>
  tick: (dt: number) => void
  reset: () => void
}

const INITIAL: Omit<MushroomState, 'feed' | 'mist' | 'poke' | 'giveFireflies' | 'sendMessage' | 'receiveMessage' | 'generateMushroomMessage' | 'reactToEvent' | 'tick' | 'reset'> = {
  hunger: 0,
  boredom: 0,
  thirst: 0,
  evolution: 'normal',
  conversationHistory: [],
  isConversing: false,
  lastMushroomMessage: null,
  lastMushroomMessageId: 0,
  lastMessageTime: 0,
  lastFeedTime: 0,
  lastMistTime: 0,
  lastPokeTime: 0,
  lastChatTime: 0,
  lastReactionTime: 0,
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

function pushAssistantMessage(
  set: (fn: (s: MushroomState) => Partial<MushroomState>) => void,
  text: string,
  extras?: Partial<Pick<MushroomState, 'isConversing' | 'boredom'>>,
) {
  const clean = text.replace(/\*/g, '')
  set((s) => ({
    conversationHistory: [...s.conversationHistory, { role: 'assistant' as const, content: clean }],
    lastMushroomMessage: clean,
    lastMushroomMessageId: s.lastMushroomMessageId + 1,
    lastMessageTime: Date.now(),
    ...extras,
  }))
}

/** TTS check with safety valve — never blocks for more than 6s even if browser gets stuck */
function isStillTalking(lastMessageTime: number): boolean {
  if (Date.now() - lastMessageTime > 6000) return false
  return tts.isSpeaking()
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
      const { conversationHistory, hunger, boredom, evolution, isConversing } = get()

      // isConversing already prevents overlapping API calls
      if (isConversing) return

      const { playerName } = usePlayerStore.getState()
      const history = [...conversationHistory, { role: 'user' as const, content: text }]
      set({ conversationHistory: history, isConversing: true })

      const apiHistory = history.slice(-AI.maxHistory)

      let response: string
      try {
        response = await chat({
          messages: apiHistory,
          systemPrompt: buildSystemPrompt({ hunger, boredom, evolution, playerName }),
        })
      } catch (err) {
        console.warn('[shroom] sendMessage API failed:', err)
        response = "Hmm, my thoughts feel fuzzy right now... say that again?"
      }

      pushAssistantMessage(set, response, {
        isConversing: false,
        boredom: Math.max(0, get().boredom - STATS.chatBoredomRelief),
      })
    },

    receiveMessage: (text) => pushAssistantMessage(set, text),

    generateMushroomMessage: async (trigger) => {
      const { conversationHistory, hunger, boredom, evolution, isConversing, lastMessageTime } = get()

      if (isConversing || isStillTalking(lastMessageTime)) return

      const { playerName } = usePlayerStore.getState()
      const apiHistory = conversationHistory.slice(-AI.maxHistory)

      // Ensure first message is user (API requirement)
      if (apiHistory.length && apiHistory[0].role !== 'user') {
        apiHistory.unshift({ role: 'user', content: '...' })
      }
      // Append prompt at the END so the model responds to it
      apiHistory.push({ role: 'user', content: 'Hey little mushroom, what are you thinking about?' })

      set({ isConversing: true, lastChatTime: Date.now() })

      for (let attempt = 0; attempt <= AI.maxRetries; attempt++) {
        try {
          const response = await chat({
            messages: apiHistory,
            systemPrompt: buildInitiationPrompt({ hunger, boredom, evolution, playerName }, trigger),
          })
          pushAssistantMessage(set, response, { isConversing: false })
          return
        } catch (err) {
          console.warn(`[shroom] initiation attempt ${attempt + 1}/${AI.maxRetries + 1} failed:`, err)
          if (attempt < AI.maxRetries) await new Promise((r) => setTimeout(r, 1000))
        }
      }

      // Only fall back after all retries exhausted
      set({ isConversing: false })
      const mode = evolution === 'dark' ? 'dark' : 'normal'
      const fallbacks = { hunger: HUNGER_MESSAGES, thirst: THIRST_MESSAGES, boredom: BOREDOM_MESSAGES }
      pushAssistantMessage(set, pickRandom(fallbacks[trigger][mode]))
    },

    reactToEvent: async (event) => {
      // Respect reaction cooldown (check early, before waiting)
      if (Date.now() - get().lastReactionTime < TIMING.reactionCooldown) return

      // Wait up to 5s for any in-flight conversation to finish
      for (let i = 0; i < 10; i++) {
        const { isConversing, lastMessageTime } = get()
        if (!isConversing && !isStillTalking(lastMessageTime)) break
        await new Promise((r) => setTimeout(r, 500))
      }

      // Final check after waiting
      const { conversationHistory, hunger, boredom, evolution, isConversing, lastReactionTime, lastMessageTime } = get()
      if (isConversing || isStillTalking(lastMessageTime)) return
      if (Date.now() - lastReactionTime < TIMING.reactionCooldown) return

      const { playerName } = usePlayerStore.getState()
      const apiHistory = conversationHistory.slice(-AI.maxHistory)

      // Event cue MUST be the last user message so the model responds to it
      const eventCue: Record<ReactionEvent, string> = {
        fed: 'Here, eat this!',
        misted: 'Let me spray you with some water!',
        gifted: 'I caught some fireflies for you!',
      }
      // Ensure first message is user (API requirement)
      if (apiHistory.length && apiHistory[0].role !== 'user') {
        apiHistory.unshift({ role: 'user', content: '...' })
      }
      // Append event cue at the END so the model responds to it
      apiHistory.push({ role: 'user', content: eventCue[event] })

      // Note: sets lastReactionTime, NOT lastChatTime — reactions don't delay initiations
      set({ isConversing: true, lastReactionTime: Date.now() })

      try {
        const response = await chat({
          messages: apiHistory,
          systemPrompt: buildReactionPrompt({ hunger, boredom, evolution, playerName }, event),
        })
        pushAssistantMessage(set, response, { isConversing: false })
      } catch (err) {
        console.warn('[shroom] reactToEvent failed:', err)
        set({ isConversing: false })
      }
    },

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
