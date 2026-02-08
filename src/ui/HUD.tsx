import { useRef, useEffect } from 'react'
import { useGameStore } from '../stores/gameStore'
import { useMushroomStore } from '../stores/mushroomStore'
import { useMushroomBehavior } from '../hooks/useMushroomBehavior'
import { useTTS } from '../hooks/useTTS'
import FoodTray from './FoodTray'
import ChatBox from './ChatBox'
import SpeechBubble from './SpeechBubble'
import MistButton from './MistButton'
import FireflyJar from './FireflyJar'
import TutorialOverlay from './TutorialOverlay'
import GameOver from './GameOver'
import styles from './HUD.module.css'
import { Meter } from '../config'
import { DEV_MODE } from '../devMode'

function hungerMeter(hunger: number) {
  const fullness = 100 - Math.round(hunger)
  const color = fullness <= Meter.thresholds.low ? Meter.colors.hunger.low : fullness <= Meter.thresholds.mid ? Meter.colors.hunger.mid : Meter.colors.hunger.high
  const label = fullness > 70 ? 'Full' : fullness > 40 ? 'Hungry' : 'Starving!'
  return { value: fullness, color, label }
}

function thirstMeter(thirst: number) {
  const hydration = 100 - Math.round(thirst)
  const color = hydration <= Meter.thresholds.low ? Meter.colors.thirst.low : hydration <= Meter.thresholds.mid ? Meter.colors.thirst.mid : Meter.colors.thirst.high
  const label = hydration > 70 ? 'Hydrated' : hydration > 40 ? 'Thirsty' : 'Parched!'
  return { value: hydration, color, label }
}

function boredomMeter(boredom: number) {
  const entertainment = 100 - Math.round(boredom)
  const color = entertainment <= Meter.thresholds.low ? Meter.colors.boredom.low : entertainment <= Meter.thresholds.mid ? Meter.colors.boredom.mid : Meter.colors.boredom.high
  const label = entertainment > 70 ? 'Happy' : entertainment > 40 ? 'Bored' : 'Restless!'
  return { value: entertainment, color, label }
}

function useMeterStyle(ref: React.RefObject<HTMLDivElement | null>, value: number, color: string, visible = true) {
  useEffect(() => {
    if (!ref.current) return
    ref.current.style.width = `${value}%`
    ref.current.style.background = color
  }, [ref, value, color, visible])
}

export default function HUD() {
  const phase = useGameStore((s) => s.phase)
  const hunger = useMushroomStore((s) => s.hunger)
  const thirst = useMushroomStore((s) => s.thirst)
  const boredom = useMushroomStore((s) => s.boredom)
  const stage = useMushroomStore((s) => s.stage)

  useMushroomBehavior()
  useTTS()

  const feed = hungerMeter(hunger)
  const mist = thirstMeter(thirst)
  const play = boredomMeter(boredom)

  const feedRef = useRef<HTMLDivElement>(null)
  const mistRef = useRef<HTMLDivElement>(null)
  const playRef = useRef<HTMLDivElement>(null)

  useMeterStyle(feedRef, feed.value, feed.color)
  useMeterStyle(mistRef, mist.value, mist.color, stage >= 2)
  useMeterStyle(playRef, play.value, play.color, stage >= 3)

  return (
    <div className={styles.overlay}>
      {DEV_MODE && <div className={styles.devBadge}>DEV: {DEV_MODE}</div>}
      {phase === 'playing' && (
        <>
          <TutorialOverlay />
          <SpeechBubble />
          <div className={styles.toolbar} data-hud-action>
            <div className={styles.stats}>
              <div className={styles.statRow} data-tutorial="feed-meter">
                <span className={styles.statLabel}>Feed</span>
                <div className={styles.meter}>
                  <div ref={feedRef} className={styles.meterFill} />
                  <span className={styles.meterText}>{feed.label}</span>
                </div>
              </div>
              {stage >= 2 && (
                <div className={styles.statRow} data-tutorial="mist-meter">
                  <span className={styles.statLabel}>Mist</span>
                  <div className={styles.meter}>
                    <div ref={mistRef} className={styles.meterFill} />
                    <span className={styles.meterText}>{mist.label}</span>
                  </div>
                </div>
              )}
              {stage >= 3 && (
                <div className={styles.statRow} data-tutorial="play-meter">
                  <span className={styles.statLabel}>Play</span>
                  <div className={styles.meter}>
                    <div ref={playRef} className={styles.meterFill} />
                    <span className={styles.meterText}>{play.label}</span>
                  </div>
                </div>
              )}
            </div>
            <div className={styles.actions}>
              <FoodTray />
              {stage >= 2 && <div data-tutorial="mist-button"><MistButton /></div>}
              {stage >= 3 && <div data-tutorial="firefly-jar"><FireflyJar /></div>}
            </div>
          </div>
          <div data-tutorial="chat-box" data-hud-action><ChatBox /></div>
        </>
      )}
      {phase === 'gameOver' && <GameOver />}
    </div>
  )
}
