interface Env {
  ANTHROPIC_API_KEY: string
  DEV_BYPASS_AUTH?: string
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

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') ?? '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

async function validateDiscordToken(authHeader: string | null): Promise<boolean> {
  if (!authHeader || !authHeader.startsWith('Discord ')) return false
  const token = authHeader.split(' ')[1]
  if (!token) return false
  const res = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.ok
}

function mockResponse(body: Record<string, unknown>, headers: Record<string, string>): Response {
  const isDark = typeof body.system === 'string' && (body.system.includes('neglected') || body.system.includes('edge'))
  const text = isDark ? pick(MOCK_DARK) : pick(MOCK_NORMAL)
  return Response.json(
    { content: [{ type: 'text', text }], model: 'mock', usage: { input_tokens: 0, output_tokens: 0 } },
    { headers },
  )
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }

    // Only handle POST /api/chat
    if (url.pathname !== '/api/chat') {
      return new Response('Not found', { status: 404, headers: corsHeaders(request) })
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders(request) })
    }

    const body = await request.json() as Record<string, unknown>
    const headers = corsHeaders(request)

    // Validate Discord token — fall back to mock responses if invalid
    // DEV_BYPASS_AUTH is only set in .dev.vars (local wrangler dev, never deployed)
    const authenticated = env.DEV_BYPASS_AUTH === 'true' || await validateDiscordToken(request.headers.get('Authorization'))
    if (!authenticated || !env.ANTHROPIC_API_KEY) {
      return mockResponse(body, headers)
    }

    // Authenticated — proxy to Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return Response.json(data, { status: response.status, headers })
  },
}
