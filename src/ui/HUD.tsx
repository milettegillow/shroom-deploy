import { useGameStore } from '../stores/gameStore'
import { useMushroomBehavior } from '../hooks/useMushroomBehavior'
import { useTTS } from '../hooks/useTTS'
import FoodTray from './FoodTray'
import ChatBox from './ChatBox'
import SpeechBubble from './SpeechBubble'
import GameOver from './GameOver'
import styles from './HUD.module.css'

export default function HUD() {
  const phase = useGameStore((s) => s.phase)

  useMushroomBehavior()
  useTTS()

  return (
    <div className={styles.overlay}>
      {phase === 'playing' && (
        <>
          <SpeechBubble />
          <FoodTray />
          <ChatBox />
        </>
      )}
      {phase === 'gameOver' && <GameOver />}
    </div>
  )
}
