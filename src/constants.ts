import type { FoodType, AgeStage } from './types'

export const LERP = 0.04

export const STATS = {
  fillTime: 15,
  hungerRate: 100 / 15,
  boredomRate: 100 / 15,
  thirstRate: 100 / 20,
  feedBoredomRelief: 5,
  chatBoredomRelief: 15,
  darkThreshold: 65,
} as const

export const BEHAVIOR = {
  hungerThreshold: 70,
  boredomThreshold: 70,
  boredomInitiation: 40,
  thirstThreshold: 70,
  boredomProbabilityScale: 400,
  complaintInterval: 12000,
  boredomCheckInterval: 3000,
  checkInterval: 500,
  messageCooldown: 5000,
  irreversibleTimer: 10,
} as const

export const TIMING = {
  maxFrameDelta: 0.1,
  speechBubbleDuration: 5000,
  speechBubbleFade: 500,
  reactionCooldown: 8000,
} as const

export const AI = {
  model: 'claude-haiku-4-5-20251001',
  maxTokens: 60,
  maxHistory: 20,
  maxRetries: 2,
} as const

export const THROW = {
  speedScale: 0.006,
  gravity: 6,
  zSpeed: 3.0,
  hitRadius: 0.6,
  foodScale: 0.18,
  offscreenY: -4,
  maxFlight: 3,
  mouthPos: [0, 0.12, 0.3],
  velocityWindow: 80,
  dragCeiling: 0.75,
  dragZ: 2.5,
} as const

export const FOOD_TYPES = {
  barkChip:  { label: 'Bark Chip',  emoji: '🪨', color: '#8B7355', hungerRelief: 12, cooldownMs: 800 },
  deadLeaf:  { label: 'Dead Leaf',  emoji: '🍂', color: '#8B6914', hungerRelief: 25, cooldownMs: 1500 },
  rottenLog: { label: 'Rotten Log', emoji: '🪵', color: '#5C4033', hungerRelief: 40, cooldownMs: 3000 },
  compost:   { label: 'Compost',    emoji: '🧅', color: '#4A6741', hungerRelief: 55, cooldownMs: 5000 },
} as const

export const FOOD_TYPE_KEYS = Object.keys(FOOD_TYPES) as FoodType[]

export const MIST = {
  thirstRelief: 25,
  cooldownMs: 500,
  hitRadius: 250,
} as const

export const POKE = {
  cooldownMs: 800,
  annoyanceThreshold: 5,
  annoyanceWindow: 5000,
} as const

export const FIREFLY = {
  count: 8,
  radius: 0.02,
  pulseSpeed: 3,
  pulseAmount: 0.4,
  catchScreenRadius: 60,
  bobSpeed: 1.2,
  bobAmount: 0.3,
  driftSpeed: 0.3,
  driftRadius: 0.5,
  respawnDelay: 5,
  fadeSpeed: 3,
  color: { normal: '#ffe4b5', dark: '#44ddbb' },
  spawnBounds: {
    x: [-3, 3],
    y: [0.3, 2.2],
    z: [-3, 1],
  },
} as const

export const JAR = {
  boredomReliefPerFirefly: 4,
  boredomReliefCap: 60,
  floatSpeed: 0.04,
  floatTimeout: 3,
  hitRadius: 0.6,
  dragZ: 2.5,
  cooldownMs: 1000,
  jarScale: 0.12,
} as const

export const STAGES: Record<AgeStage, { food: FoodType[]; stats: { hunger: boolean; thirst: boolean; boredom: boolean } }> = {
  1: { food: ['barkChip'], stats: { hunger: true, thirst: false, boredom: false } },
  2: { food: ['barkChip', 'deadLeaf', 'rottenLog'], stats: { hunger: true, thirst: true, boredom: false } },
  3: { food: ['barkChip', 'deadLeaf', 'rottenLog', 'compost'], stats: { hunger: true, thirst: true, boredom: true } },
}

export const STAGE_THRESHOLDS = {
  feedsToStage2: 4,
  mistsToStage3: 10,
} as const

export const TTS = {
  normal: { pitch: 1.4, rate: 0.9, volume: 0.8 },
  dark: { pitch: 0.6, rate: 0.75, volume: 1.0 },
  preferredVoices: ['Samantha', 'Karen', 'Moira'],
} as const
