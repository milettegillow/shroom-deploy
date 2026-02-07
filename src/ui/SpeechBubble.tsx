import { useEffect, useState } from 'react'
import { useMushroomStore } from '../stores/mushroomStore'
import { TIMING } from '../constants'
import styles from './SpeechBubble.module.css'

const cx = (...args: (string | false | undefined)[]) => args.filter(Boolean).join(' ')

export default function SpeechBubble() {
  const lastMessage = useMushroomStore((s) => s.lastMushroomMessage)
  const messageId = useMushroomStore((s) => s.lastMushroomMessageId)
  const evolution = useMushroomStore((s) => s.evolution)
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)
  const [text, setText] = useState('')

  useEffect(() => {
    if (!lastMessage || messageId === 0) return
    setText(lastMessage)
    setVisible(true)
    setFading(false)
    const fadeTimer = setTimeout(() => setFading(true), TIMING.speechBubbleDuration - TIMING.speechBubbleFade)
    const hideTimer = setTimeout(() => setVisible(false), TIMING.speechBubbleDuration)
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer) }
  }, [lastMessage, messageId])

  if (!visible) return null
  return <div className={cx(styles.bubble, evolution === 'dark' && styles.dark, fading && styles.fadeOut)}>{text}</div>
}
