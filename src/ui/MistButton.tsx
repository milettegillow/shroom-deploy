import { useState, useEffect, useCallback, useRef } from 'react'
import { useMushroomStore } from '../stores/mushroomStore'
import { MIST } from '../constants'
import styles from './MistButton.module.css'

const cx = (...args: (string | false | undefined)[]) => args.filter(Boolean).join(' ')

interface SprayDot {
  id: number
  x: number
  y: number
}

function thirstMeter(thirst: number) {
  const hydration = 100 - Math.round(thirst)
  const color = hydration <= 30 ? '#5588cc' : hydration <= 60 ? '#4498dd' : '#33aaee'
  const label = hydration > 70 ? 'Hydrated' : hydration > 40 ? 'Thirsty' : 'Parched!'
  return { hydration, color, label }
}

let dotId = 0

export default function MistButton() {
  const [active, setActive] = useState(false)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const [sprays, setSprays] = useState<SprayDot[]>([])
  const lastSprayRef = useRef(0)
  const thirst = useMushroomStore((s) => s.thirst)
  const meter = thirstMeter(thirst)

  const handleToggle = useCallback(() => setActive((a) => !a), [])

  const handleMove = useCallback((e: PointerEvent) => {
    setCursorPos({ x: e.clientX, y: e.clientY })
  }, [])

  const handleSpray = useCallback((e: MouseEvent) => {
    const now = Date.now()
    if (now - lastSprayRef.current < MIST.cooldownMs) return
    lastSprayRef.current = now
    useMushroomStore.getState().mist()

    const newDots: SprayDot[] = Array.from({ length: 8 }, () => ({
      id: dotId++,
      x: e.clientX + (Math.random() - 0.5) * 40,
      y: e.clientY + (Math.random() - 0.5) * 40,
    }))
    setSprays((prev) => [...prev, ...newDots])
    setTimeout(() => {
      setSprays((prev) => prev.filter((d) => !newDots.includes(d)))
    }, 600)
  }, [])

  useEffect(() => {
    if (!active) return
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('click', handleSpray)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('click', handleSpray)
    }
  }, [active, handleMove, handleSpray])

  return (
    <>
      <div className={styles.wrapper}>
        <span className={styles.label}>Mist</span>
        <div className={styles.meter}>
          <div className={styles.meterFill} style={{ width: `${meter.hydration}%`, background: meter.color }} />
          <span className={styles.meterText}>{meter.label}</span>
        </div>
        <div
          className={cx(styles.button, active && styles.active)}
          onClick={handleToggle}
        >
          <span className={styles.emoji}>🚿</span>
        </div>
      </div>

      {active && (
        <div className={styles.cursor} style={{ left: cursorPos.x, top: cursorPos.y }}>
          🚿
        </div>
      )}

      {sprays.map((dot) => (
        <div key={dot.id} className={styles.spray} style={{ left: dot.x, top: dot.y }} />
      ))}
    </>
  )
}
