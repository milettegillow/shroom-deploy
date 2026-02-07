import { useGameStore } from '../stores/gameStore'
import styles from './GameOver.module.css'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function GameOver() {
  const survivalTime = useGameStore((s) => s.survivalTime)
  const bestSurvivalTime = useGameStore((s) => s.bestSurvivalTime)
  const restart = useGameStore((s) => s.restart)

  return (
    <div className={styles.backdrop}>
      <div className={styles.title}>Game Over</div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          Survived: <span className={styles.time}>{formatTime(survivalTime)}</span>
        </div>
        <div className={styles.stat}>
          Best: <span className={styles.best}>{formatTime(bestSurvivalTime)}</span>
        </div>
      </div>
      <button className={styles.restartBtn} onClick={restart}>
        Try Again
      </button>
    </div>
  )
}
