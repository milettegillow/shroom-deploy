export type EvolutionState = 'normal' | 'dark' | 'demonic'

export type FoodType = 'deadLeaf' | 'rottenLog' | 'compost' | 'barkChip'

export interface ThrowRequest {
  nx: number
  ny: number
  vx: number
  vy: number
  foodType: FoodType
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
}
