import { useEffect } from 'react'
import { useMushroomStore } from '../stores/mushroomStore'
import { useGameStore } from '../stores/gameStore'
import { conversationManager } from '../ai/conversationManager'
import { BEHAVIOR } from '../constants'

export function useMushroomBehavior() {
  useEffect(() => {
    const interval = setInterval(() => {
      if (useGameStore.getState().phase !== 'playing') return

      const { hunger, boredom, thirst, evolution, isConversing, receiveMessage } =
        useMushroomStore.getState()

      const message = conversationManager.update(
        Date.now(), hunger, boredom, thirst, evolution, isConversing, 0,
      )

      if (message) receiveMessage(message)
    }, BEHAVIOR.checkInterval)

    return () => clearInterval(interval)
  }, [])
}
