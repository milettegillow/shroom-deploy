import { BEHAVIOR, STAGES } from '../constants'
import type { EvolutionState, AgeStage } from '../types'
import type { InitiationTrigger } from './prompts'

class ConversationManager {
  private lastComplaint = 0
  private lastThirstComplaint = 0
  private lastBoredCheck = 0
  private lastMessage = 0

  update(now: number, hunger: number, boredom: number, thirst: number, _evolution: EvolutionState, isConversing: boolean, _neglectTimer: number, stage: AgeStage): InitiationTrigger | null {
    if (now - this.lastMessage < BEHAVIOR.messageCooldown) return null
    const active = STAGES[stage].stats

    if (active.hunger && hunger >= BEHAVIOR.hungerThreshold && now - this.lastComplaint >= BEHAVIOR.complaintInterval) {
      this.lastComplaint = now
      this.lastMessage = now
      return 'hunger'
    }

    if (active.thirst && thirst >= BEHAVIOR.thirstThreshold && now - this.lastThirstComplaint >= BEHAVIOR.complaintInterval) {
      this.lastThirstComplaint = now
      this.lastMessage = now
      return 'thirst'
    }

    if (active.boredom && boredom >= BEHAVIOR.boredomInitiation && !isConversing && now - this.lastBoredCheck >= BEHAVIOR.boredomCheckInterval) {
      this.lastBoredCheck = now
      if (Math.random() < (boredom - BEHAVIOR.boredomInitiation) / BEHAVIOR.boredomProbabilityScale) {
        this.lastMessage = now
        return 'boredom'
      }
    }

    return null
  }

  reset() {
    this.lastComplaint = 0
    this.lastThirstComplaint = 0
    this.lastBoredCheck = 0
    this.lastMessage = 0
  }
}

export const conversationManager = new ConversationManager()
