import { useEffect } from 'react'
import { useMushroomStore } from '../stores/mushroomStore'
import { useGameStore } from '../stores/gameStore'
import { conversationManager } from '../ai/conversationManager'
import { tts } from '../audio/ttsService'
import { BEHAVIOR } from '../constants'

export function useMushroomBehavior() {
  useEffect(() => {
    const interval = setInterval(() => {
      const gameState = useGameStore.getState()
      if (gameState.phase !== 'playing' || gameState.paused) return

      const { hunger, boredom, thirst, evolution, isConversing, generateMushroomMessage, stage } =
        useMushroomStore.getState()

      // Skip if TTS voice is still playing or an API call is in-flight
      if (tts.isSpeaking() || isConversing) return

      const trigger = conversationManager.update(
        Date.now(), hunger, boredom, thirst, evolution, isConversing, 0, stage,
      )

      if (trigger) generateMushroomMessage(trigger)
    }, BEHAVIOR.checkInterval)

    return () => clearInterval(interval)
  }, [])
}
