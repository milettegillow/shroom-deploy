import { useGameStore } from '../stores/gameStore'
import { useMushroomStore } from '../stores/mushroomStore'
import { useMushroomBehavior } from '../hooks/useMushroomBehavior'
import { useTTS } from '../hooks/useTTS'
import FoodTray from './FoodTray'
import ChatBox from './ChatBox'
import SpeechBubble from './SpeechBubble'
import MistButton from './MistButton'
import FireflyJar from './FireflyJar'
import GameOver from './GameOver'
import styles from './HUD.module.css'

function hungerMeter(hunger: number) {
  const fullness = 100 - Math.round(hunger)
  const color = fullness <= 30 ? '#e05555' : fullness <= 60 ? '#e0a030' : '#55b060'
  const label = fullness > 70 ? 'Full' : fullness > 40 ? 'Hungry' : 'Starving!'
  return { value: fullness, color, label }
}

function thirstMeter(thirst: number) {
  const hydration = 100 - Math.round(thirst)
  const color = hydration <= 30 ? '#5588cc' : hydration <= 60 ? '#4498dd' : '#33aaee'
  const label = hydration > 70 ? 'Hydrated' : hydration > 40 ? 'Thirsty' : 'Parched!'
  return { value: hydration, color, label }
}

function boredomMeter(boredom: number) {
  const entertainment = 100 - Math.round(boredom)
  const color = entertainment <= 30 ? '#cc6699' : entertainment <= 60 ? '#cc9944' : '#55b060'
  const label = entertainment > 70 ? 'Happy' : entertainment > 40 ? 'Bored' : 'Restless!'
  return { value: entertainment, color, label }
}

export default function HUD() {
  const phase = useGameStore((s) => s.phase)
  const hunger = useMushroomStore((s) => s.hunger)
  const thirst = useMushroomStore((s) => s.thirst)
  const boredom = useMushroomStore((s) => s.boredom)

  useMushroomBehavior()
  useTTS()

  const feed = hungerMeter(hunger)
  const mist = thirstMeter(thirst)
  const play = boredomMeter(boredom)

  return (
    <div className={styles.overlay}>
      {phase === 'playing' && (
        <>
          <SpeechBubble />
          <div className={styles.toolbar}>
            <div className={styles.stats}>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Feed</span>
                <div className={styles.meter}>
                  <div className={styles.meterFill} style={{ width: `${feed.value}%`, background: feed.color }} />
                  <span className={styles.meterText}>{feed.label}</span>
                </div>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Mist</span>
                <div className={styles.meter}>
                  <div className={styles.meterFill} style={{ width: `${mist.value}%`, background: mist.color }} />
                  <span className={styles.meterText}>{mist.label}</span>
                </div>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Play</span>
                <div className={styles.meter}>
                  <div className={styles.meterFill} style={{ width: `${play.value}%`, background: play.color }} />
                  <span className={styles.meterText}>{play.label}</span>
                </div>
              </div>
            </div>
            <div className={styles.actions}>
              <FoodTray />
              <MistButton />
              <FireflyJar />
            </div>
          </div>
          <ChatBox />
        </>
      )}
      {phase === 'gameOver' && <GameOver />}
    </div>
  )
}
