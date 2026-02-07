import { useState, useRef, useEffect } from 'react'
import { useMushroomStore } from '../stores/mushroomStore'
import styles from './ChatBox.module.css'

export default function ChatBox() {
  const history = useMushroomStore((s) => s.conversationHistory)
  const sendMessage = useMushroomStore((s) => s.sendMessage)
  const isConversing = useMushroomStore((s) => s.isConversing)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isConversing) return
    sendMessage(input.trim())
    setInput('')
  }

  return (
    <div className={styles.chatBox}>
      <div className={styles.messages}>
        {history.map((msg, i) => (
          <div
            key={i}
            className={msg.role === 'user' ? styles.userMsg : styles.shroomMsg}
          >
            {msg.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className={styles.inputArea}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Talk to your shroom..."
          className={styles.input}
          disabled={isConversing}
        />
        <button type="submit" className={styles.sendBtn} disabled={isConversing}>
          Send
        </button>
      </form>
    </div>
  )
}
