import { AI } from '../constants'
import { getDiscordToken } from '../multiplayer/playroom'
import type { Message } from '../types'

// In dev, Vite proxies /api to localhost:3001.
// In production, set VITE_API_URL to your Worker URL (e.g. https://shroom-api.<account>.workers.dev)
const API_BASE = import.meta.env.VITE_API_URL || ''

export async function chat(req: { messages: Message[]; systemPrompt: string }): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getDiscordToken()
  if (token) headers['Authorization'] = `Discord ${token}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: AI.model, max_tokens: AI.maxTokens, system: req.systemPrompt, messages: req.messages }),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout))
  if (!res.ok) throw new Error(`AI request failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  const text = data.content?.find((b: { type: string }) => b.type === 'text')?.text ?? data.content?.[0]?.text
  if (!text) {
    console.warn('[shroom] AI returned empty content:', JSON.stringify(data))
    throw new Error('No text content in AI response')
  }
  return text
}
