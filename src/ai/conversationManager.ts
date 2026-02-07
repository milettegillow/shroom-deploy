import { BEHAVIOR } from '../constants'
import { HUNGER_MESSAGES, THIRST_MESSAGES, BOREDOM_MESSAGES, APPROACHING_IRREVERSIBLE } from './messages'
import { pickRandom } from '../utils/helpers'
import type { EvolutionState } from '../types'

type Mode = 'normal' | 'dark'

class ConversationManager {
  private lastComplaint = 0
  private lastThirstComplaint = 0
  private lastBoredCheck = 0
  private lastMessage = 0

  update(now: number, hunger: number, boredom: number, thirst: number, evolution: EvolutionState, isConversing: boolean, neglectTimer: number): string | null {
    if (now - this.lastMessage < BEHAVIOR.messageCooldown) return null
    const mode: Mode = evolution === 'dark' ? 'dark' : 'normal'

    if (hunger >= BEHAVIOR.hungerThreshold && now - this.lastComplaint >= BEHAVIOR.complaintInterval) {
      this.lastComplaint = now
      this.lastMessage = now
      return pickRandom(HUNGER_MESSAGES[mode])
    }

    if (thirst >= BEHAVIOR.thirstThreshold && now - this.lastThirstComplaint >= BEHAVIOR.complaintInterval) {
      this.lastThirstComplaint = now
      this.lastMessage = now
      return pickRandom(THIRST_MESSAGES[mode])
    }

    if (boredom >= BEHAVIOR.boredomInitiation && !isConversing && now - this.lastBoredCheck >= BEHAVIOR.boredomCheckInterval) {
      this.lastBoredCheck = now
      if (Math.random() < (boredom - BEHAVIOR.boredomInitiation) / BEHAVIOR.boredomProbabilityScale) {
        this.lastMessage = now
        if (evolution === 'dark' && neglectTimer > BEHAVIOR.irreversibleTimer) return pickRandom(APPROACHING_IRREVERSIBLE)
        return pickRandom(BOREDOM_MESSAGES[mode])
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
