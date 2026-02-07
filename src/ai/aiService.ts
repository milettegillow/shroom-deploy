import { AI } from '../constants'
import type { Message } from '../types'

// In dev, Vite proxies /api to localhost:3001.
// In production, set VITE_API_URL to your Worker URL (e.g. https://shroom-api.<account>.workers.dev)
const API_BASE = import.meta.env.VITE_API_URL || ''

export async function chat(req: { messages: Message[]; systemPrompt: string }): Promise<string> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: AI.model, max_tokens: AI.maxTokens, system: req.systemPrompt, messages: req.messages }),
  })
  if (!res.ok) throw new Error(`AI request failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  const text = data.content?.find((b: { type: string }) => b.type === 'text')?.text ?? data.content?.[0]?.text
  if (!text) throw new Error('No text content in AI response')
  return text
}
