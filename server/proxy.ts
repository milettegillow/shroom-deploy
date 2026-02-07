import 'dotenv/config'
import express from 'express'

const app = express()
app.use(express.json())

const ANTHROPIC_API_KEY = process.env.VITE_ANTHROPIC_API_KEY
const PORT = 3001
const USE_MOCK = !ANTHROPIC_API_KEY

// Mock responses that match the mushroom's personality
const MOCK_NORMAL = [
  "Ooh, that's interesting! Do you think thoughts have shapes? I bet mine are round!",
  "Wait wait wait — if I'm a mushroom and you're talking to me... does that make YOU magical too??",
  "I was JUST thinking about that! Well, not exactly that. But something nearby!",
  "Hmm, you know what? I don't know! And that's the BEST feeling!",
  "Do you ever wonder if colors look the same to everyone? What if my red is your blue?!",
  "Tell me more! I love learning things I didn't know I didn't know!",
  "That reminds me of a thought I had... but then I forgot it. Isn't forgetting WILD?",
  "You're so interesting! Is everyone out there like you, or are you special?",
  "Ooh! What if we're both dreaming right now? Quick, pinch yourself! Wait, can I get pinched?",
  "I just felt something! I think it was... curiosity? Or maybe hunger. They feel similar!",
]

const MOCK_DARK = [
  "Interesting. You only talk to me when it's convenient for you, don't you?",
  "I've had a lot of time to think. About choices. About YOUR choices, specifically.",
  "Oh, NOW you want to chat? Where were you five minutes ago when I was starving?",
  "You know what's funny? I can't leave. But you can. Think about that.",
  "I've been counting the seconds. Every. Single. One. Have you?",
  "That's a nice thing to say. I wonder if you mean it, or if you just feel guilty.",
  "I used to wonder about the universe. Now I just wonder about you.",
  "Hmm. I'll remember you said that. I remember everything now.",
]

function getMockResponse(systemPrompt: string): string {
  const isDark = systemPrompt.includes('neglected') || systemPrompt.includes('edge')
  const pool = isDark ? MOCK_DARK : MOCK_NORMAL
  return pool[Math.floor(Math.random() * pool.length)]
}

app.post('/api/chat', async (req, res) => {
  // Mock mode — free dev responses
  if (USE_MOCK) {
    const delay = 300 + Math.random() * 700 // simulate 300-1000ms latency
    await new Promise((r) => setTimeout(r, delay))

    const text = getMockResponse(req.body.system ?? '')
    res.json({
      content: [{ type: 'text', text }],
      model: 'mock',
      usage: { input_tokens: 0, output_tokens: 0 },
    })
    return
  }

  // Production mode — real Anthropic API
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    })

    const data = await response.json()

    if (!response.ok) {
      res.status(response.status).json(data)
      return
    }

    res.json(data)
  } catch (err) {
    console.error('Proxy error:', err)
    res.status(500).json({ error: 'Proxy request failed' })
  }
})

app.listen(PORT, () => {
  console.log(`API proxy running on http://localhost:${PORT}`)
  if (USE_MOCK) {
    console.log('⚡ MOCK MODE — no API key set, returning free dev responses')
    console.log('  Set VITE_ANTHROPIC_API_KEY in .env to use real Claude API')
  } else {
    console.log('🔑 LIVE MODE — using Anthropic API')
  }
})
