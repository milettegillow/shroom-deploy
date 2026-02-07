import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMushroomStore } from '../stores/mushroomStore'
import { MIST } from '../constants'
import classNames from 'classnames'
import styles from './MistButton.module.css'

interface MistParticle {
  id: number
  x: number
  y: number
  size: number
  delay: number
  drift: number
}

interface HitSplash {
  id: number
  x: number
  y: number
}

export default function MistButton() {
  const nextIdRef = useRef(0)
  const [active, setActive] = useState(false)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const [particles, setParticles] = useState<MistParticle[]>([])
  const [splashes, setSplashes] = useState<HitSplash[]>([])
  const lastSprayRef = useRef(0)
  const thirst = useMushroomStore((s) => s.thirst)
  const needsMist = (100 - Math.round(thirst)) <= 40

  const deactivate = useCallback(() => setActive(false), [])

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setActive((a) => !a)
  }, [])

  // Escape key or right-click to drop the mister
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') deactivate() }
    const onContext = (e: MouseEvent) => { e.preventDefault(); deactivate() }
    window.addEventListener('keydown', onKey)
    window.addEventListener('contextmenu', onContext)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('contextmenu', onContext)
    }
  }, [active, deactivate])

  const handleSpray = useCallback((e: React.MouseEvent) => {
    const now = Date.now()
    if (now - lastSprayRef.current < MIST.cooldownMs) return
    lastSprayRef.current = now

    // Hit detection: spray must land near the mushroom (roughly viewport center)
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2
    const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY)
    const hit = dist < MIST.hitRadius

    // Spawn a mix of larger misty blobs and smaller solid droplets
    const newParticles: MistParticle[] = [
      // Misty blobs
      ...Array.from({ length: 10 }, () => ({
        id: nextIdRef.current++,
        x: e.clientX + (Math.random() - 0.5) * 180,
        y: e.clientY - 20 - Math.random() * 40,
        size: 14 + Math.random() * 20,
        delay: Math.random() * 0.15,
        drift: (Math.random() - 0.5) * 30,
      })),
      // Smaller solid droplets
      ...Array.from({ length: 10 }, () => ({
        id: nextIdRef.current++,
        x: e.clientX + (Math.random() - 0.5) * 140,
        y: e.clientY - 10 - Math.random() * 30,
        size: 4 + Math.random() * 6,
        delay: Math.random() * 0.1,
        drift: (Math.random() - 0.5) * 20,
      })),
    ]
    setParticles((prev) => [...prev, ...newParticles])
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.includes(p)))
    }, 1600)

    // Delay mist effect until particles visually reach the mushroom
    if (hit) {
      setTimeout(() => {
        useMushroomStore.getState().mist()
        const splashId = nextIdRef.current++
        setSplashes((prev) => [...prev, { id: splashId, x: centerX, y: centerY }])
        setTimeout(() => {
          setSplashes((prev) => prev.filter((s) => s.id !== splashId))
        }, 1000)
      }, 500)
    }
  }, [])

  return (
    <>
      <div className={styles.wrapper}>
        <div
          className={classNames(styles.button, active && styles.active, needsMist && styles.shake)}
          onClick={handleToggle}
        >
          <span className={styles.emoji}>🚿</span>
        </div>
        <span className={styles.label}>Mist</span>
      </div>

      {/* Full-screen spray zone portal — sits above R3F canvas (z-index 9)
          but below HUD toolbar (z-index 10). Captures all clicks for spraying
          and blocks them from triggering mushroom pokes. */}
      {active && createPortal(
        <div
          className={styles.sprayZone}
          onClick={handleSpray}
          onPointerMove={(e) => setCursorPos({ x: e.clientX, y: e.clientY })}
        >
          <div className={styles.cursor} style={{ left: cursorPos.x, top: cursorPos.y }}>
            🚿
          </div>
        </div>,
        document.body
      )}

      {particles.map((p) => (
        <div
          key={p.id}
          className={styles.mistParticle}
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            '--drift': `${p.drift}px`,
          } as React.CSSProperties}
        />
      ))}

      {splashes.map((s) => (
        <div
          key={s.id}
          className={styles.hitSplash}
          style={{ left: s.x, top: s.y }}
        />
      ))}
    </>
  )
}
