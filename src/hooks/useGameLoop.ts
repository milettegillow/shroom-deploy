import { useFrame } from '@react-three/fiber'
import { useMushroomStore } from '../stores/mushroomStore'
import { useGameStore } from '../stores/gameStore'
import { TIMING } from '../constants'

export function useGameLoop() {
  const tick = useMushroomStore((s) => s.tick)
  const tickSurvival = useGameStore((s) => s.tickSurvival)
  const phase = useGameStore((s) => s.phase)
  const triggerGameOver = useGameStore((s) => s.triggerGameOver)

  useFrame((_, delta) => {
    if (phase !== 'playing') return
    const dt = Math.min(delta, TIMING.maxFrameDelta)
    tick(dt)
    tickSurvival(dt)
    if (useMushroomStore.getState().evolution === 'demonic') triggerGameOver()
  })
}
