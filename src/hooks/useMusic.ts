import { useEffect } from 'react'
import { useGameStore } from '../stores/gameStore'
import { music } from '../audio/musicService'

export function useMusic() {
  useEffect(() => {
    let prevPhase = useGameStore.getState().phase
    return useGameStore.subscribe((state) => {
      if (state.phase === prevPhase) return
      prevPhase = state.phase
      if (state.phase === 'gameOver') music.pause()
      else if (state.phase === 'playing') music.play()
    })
  }, [])
}
