interface Env {
  ANTHROPIC_API_KEY: string
}

const MOCK_NORMAL = [
  "Ooh, that's interesting! Do you think thoughts have shapes? I bet mine are round!",
  "Wait wait wait — if I'm a mushroom and you're talking to me... does that make YOU magical too??",
  "I was JUST thinking about that! Well, not exactly that. But something nearby!",
  "Hmm, you know what? I don't know! And that's the BEST feeling!",
  "Tell me more! I love learning things I didn't know I didn't know!",
]

const MOCK_DARK = [
  "Interesting. You only talk to me when it's convenient for you, don't you?",
  "I've had a lot of time to think. About choices. About YOUR choices, specifically.",
  "Oh, NOW you want to chat? Where were you five minutes ago when I was starving?",
]

function pick(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { ANTHROPIC_API_KEY } = context.env
  const body = await context.request.json() as Record<string, unknown>

  // Mock mode when no API key is configured
  if (!ANTHROPIC_API_KEY) {
    const isDark = typeof body.system === 'string' && (body.system.includes('neglected') || body.system.includes('edge'))
    const text = isDark ? pick(MOCK_DARK) : pick(MOCK_NORMAL)
    return Response.json({
      content: [{ type: 'text', text }],
      model: 'mock',
      usage: { input_tokens: 0, output_tokens: 0 },
    })
  }

  // Production — proxy to Anthropic API
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()

  return Response.json(data, { status: response.status })
}
