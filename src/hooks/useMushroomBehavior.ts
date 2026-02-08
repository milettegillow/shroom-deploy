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

      const { hunger, boredom, thirst, evolution, isConversing, generateMushroomMessage, stage, lastMessageTime } =
        useMushroomStore.getState()

      // Skip if speaking (with 6s safety valve) or API call in-flight
      const speaking = tts.isSpeaking() && Date.now() - lastMessageTime < 6000
      if (speaking || isConversing) return

      const trigger = conversationManager.update(
        Date.now(), hunger, boredom, thirst, evolution, isConversing, 0, stage,
      )

      if (trigger) generateMushroomMessage(trigger)
    }, BEHAVIOR.checkInterval)

    return () => clearInterval(interval)
  }, [])
}
