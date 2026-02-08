import { useState, useEffect, useCallback, useRef } from 'react'
import { useMushroomStore } from '../stores/mushroomStore'
import { useGameStore } from '../stores/gameStore'
import styles from './TutorialOverlay.module.css'
import type { AgeStage } from '../types'

interface CalloutDef {
  target: string
  label: string
  below?: boolean
}

interface TutorialStep {
  callouts: CalloutDef[]
  celebration?: boolean
}

const STAGE_INFO: Partial<Record<AgeStage, { title: string; subtitle: string }>> = {
  2: { title: 'Stage 2', subtitle: 'Thirst & new foods unlocked!' },
  3: { title: 'Stage 3', subtitle: 'Chat & fireflies unlocked!' },
}

const TUTORIAL_STEPS: Partial<Record<AgeStage, TutorialStep[]>> = {
  1: [
    { callouts: [
      { target: 'feed-meter', label: 'Prevent hunger' },
      { target: 'food-tray', label: 'Drag & toss to feed' },
    ]},
  ],
  2: [
    { callouts: [
      { target: 'mist-meter', label: 'Hydration level' },
      { target: 'mist-button', label: 'Tap, then hold on shroom' },
      { target: 'new-food', label: 'New food feeds more, but slower recharge', below: true },
    ], celebration: true },
  ],
  3: [
    { callouts: [
      { target: 'play-meter', label: 'Entertainment' },
      { target: 'firefly-jar', label: 'Click fireflies to catch & gift' },
      { target: 'chat-box', label: 'Talk to shroom' },
    ], celebration: true },
  ],
}

function positionCallout(el: HTMLDivElement, target: string, index: number, below?: boolean) {
  const targetEl = document.querySelector(`[data-tutorial="${target}"]`)
  if (!targetEl) return
  const rect = targetEl.getBoundingClientRect()
  if (below) {
    el.style.left = `${rect.left + rect.width / 2}px`
    el.style.top = `${rect.bottom + 24}px`
  } else {
    el.style.left = `${rect.right + 8}px`
    el.style.top = `${rect.top + rect.height / 2}px`
  }
  el.style.animationDelay = `${index * 0.12}s`
}

export default function TutorialOverlay() {
  const stage = useMushroomStore((s) => s.stage)
  const prevStage = useRef(stage)
  const [showStage, setShowStage] = useState<AgeStage | null>(null)
  const [step, setStep] = useState(0)

  const dismiss = useCallback(() => {
    setShowStage(null)
    setStep(0)
    useGameStore.getState().setPaused(false)
  }, [])

  const advance = useCallback(() => {
    if (!showStage) return
    const steps = TUTORIAL_STEPS[showStage]
    if (steps && step < steps.length - 1) {
      setStep(step + 1)
    } else {
      dismiss()
    }
  }, [showStage, step, dismiss])

  useEffect(() => {
    if (stage === 1) {
      const timer = setTimeout(() => {
        setShowStage(1)
        setStep(0)
        useGameStore.getState().setPaused(true)
      }, 500)
      return () => clearTimeout(timer)
    }
    if (stage > prevStage.current) {
      setShowStage(stage)
      setStep(0)
      useGameStore.getState().setPaused(true)
    }
    prevStage.current = stage
  }, [stage])

  // Elevate tutorial target elements above the backdrop
  // Global pointerdown advances step or dismisses
  useEffect(() => {
    if (!showStage) return
    const steps = TUTORIAL_STEPS[showStage]
    if (!steps || !steps[step]) return
    const defs = steps[step].callouts
    const targets = defs
      .flatMap((c) => Array.from(document.querySelectorAll(`[data-tutorial="${c.target}"]`)) as HTMLElement[])
      .filter(Boolean)
    targets.forEach((el) => {
      el.style.position = 'relative'
      el.style.zIndex = '21'
    })
    const handlePointerDown = () => advance()
    window.addEventListener('pointerdown', handlePointerDown, { once: true })
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      targets.forEach((el) => {
        el.style.position = ''
        el.style.zIndex = ''
      })
    }
  }, [showStage, step, advance])

  const calloutRef = useCallback((el: HTMLDivElement | null, target: string, index: number, below?: boolean) => {
    if (!el) return
    requestAnimationFrame(() => positionCallout(el, target, index, below))
  }, [])

  if (!showStage) return null
  const steps = TUTORIAL_STEPS[showStage]
  if (!steps || !steps[step]) return null

  const currentStep = steps[step]
  const stageInfo = showStage ? STAGE_INFO[showStage] : undefined
  const isLastStep = step >= steps.length - 1

  return (
    <>
      <div className={currentStep.celebration && stageInfo ? styles.backdropCelebrate : styles.backdrop} />
      {currentStep.celebration && stageInfo && (
        <div className={styles.celebration}>
          <div className={styles.sparkles} />
          <h2 className={styles.title}>{stageInfo.title}</h2>
          <p className={styles.subtitle}>{stageInfo.subtitle}</p>
        </div>
      )}
      {currentStep.callouts.map((c, i) =>
        c.below ? (
          <div
            key={`${step}-${i}`}
            ref={(el) => calloutRef(el, c.target, i, true)}
            className={styles.calloutBelow}
          >
            <div className={styles.stemV} />
            <span className={styles.label}>{c.label}</span>
          </div>
        ) : (
          <div
            key={`${step}-${i}`}
            ref={(el) => calloutRef(el, c.target, i)}
            className={styles.callout}
          >
            <div className={styles.ring} />
            <div className={styles.stem} />
            <span className={styles.label}>{c.label}</span>
          </div>
        )
      )}
      <div className={styles.dismissHint}>{isLastStep ? 'tap to play' : 'tap to continue'}</div>
    </>
  )
}
