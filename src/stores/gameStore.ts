import { create } from 'zustand'
import { useMushroomStore } from './mushroomStore'

export type GamePhase = 'playing' | 'gameOver'

const BEST_TIME_KEY = 'shroom-best-survival-time'

function loadBestTime(): number {
  try { return parseFloat(localStorage.getItem(BEST_TIME_KEY) ?? '0') || 0 }
  catch { return 0 }
}

interface GameState {
  phase: GamePhase
  survivalTime: number
  bestSurvivalTime: number
  tickSurvival: (dt: number) => void
  triggerGameOver: () => void
  restart: () => void
}

export const useGameStore = create<GameState>()((set, get) => ({
  phase: 'playing',
  survivalTime: 0,
  bestSurvivalTime: loadBestTime(),

  tickSurvival: (dt) => set((s) => ({ survivalTime: s.survivalTime + dt })),

  triggerGameOver: () => {
    const { survivalTime, bestSurvivalTime } = get()
    const newBest = Math.max(survivalTime, bestSurvivalTime)
    try { localStorage.setItem(BEST_TIME_KEY, String(newBest)) } catch {}
    set({ phase: 'gameOver', bestSurvivalTime: newBest })
  },

  restart: () => {
    useMushroomStore.getState().reset()
    set({ phase: 'playing', survivalTime: 0 })
  },
}))
