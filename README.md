# shroom

A sentient mushroom Tamagotchi — an AI-powered virtual pet that lives inside Discord.

Care for it, talk to it, feed it. Ignore it... and discover what happens when something cute decides it's done being cute.

## Tech Stack

- **Runtime** — [Vite](https://vite.dev) + [React 19](https://react.dev) + TypeScript
- **3D** — [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) + [Drei](https://drei.docs.pmnd.rs) + [Three.js](https://threejs.org)
- **State** — [Zustand](https://zustand.docs.pmnd.rs)
- **AI** — [Anthropic Claude API](https://docs.anthropic.com) (via server proxy)
- **Voice** — Web Speech API (TTS)
- **Multiplayer** — [Playroom](https://joinplayroom.com) + [Discord Embedded App SDK](https://github.com/discord/embedded-app-sdk)
- **Package Manager** — [pnpm](https://pnpm.io)

## Getting Started

```bash
# Install dependencies
pnpm install

# Create .env from template and add your keys
cp .env.example .env

# Start the API proxy (in one terminal)
pnpm dev:api

# Start the dev server (in another terminal)
pnpm dev
```

### Environment Variables

```env
VITE_DISCORD_CLIENT_ID=your_discord_client_id
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Project Structure

```
src/
├── ai/               # AI service, prompts, conversation manager
├── audio/            # TTS service, voice input (stub)
├── components/       # R3F 3D components (Mushroom, Forest, Scene)
├── hooks/            # Game loop, mushroom behavior, TTS hooks
├── stores/           # Zustand state (game, mushroom)
├── ui/               # React UI (HUD, ChatBox, FeedButton, GameOver, SpeechBubble)
├── multiplayer/      # Discord + Playroom integration
├── constants.ts      # Tuning values
├── App.tsx           # Root component
└── main.tsx          # Entry point
server/
└── proxy.ts          # Express proxy for Anthropic API
```

## Game Design

A trippy AI mushroom you care for, talk to, and slowly realize might be smarter than you.

- **Hidden stats**: Hunger and boredom increase over time — no visible meters
- **Feed** to reduce hunger, **talk** to reduce boredom
- **Evolution**: Neglect triggers dark state (reversible with 3 feedings), then demonic state (game over)
- **AI conversation**: The mushroom initiates dialogue, asks philosophical questions, and remembers the session
- **Voice**: The mushroom speaks aloud — cute voice normally, demonic voice when dark
- **Survival time**: Tracked across runs via localStorage

## Development Roadmap

- [x] Vite + React + TypeScript scaffold
- [x] React Three Fiber scene with procedural mushroom
- [x] Zustand state management (hunger, boredom, evolution)
- [x] Feed + Chat UI
- [x] Mushroom behavior (complaints, conversation initiation)
- [x] AI conversation via Claude API
- [x] TTS voice output (normal + dark)
- [x] Psychedelic forest background with particles
- [x] Game over / restart flow
- [ ] GLTF mushroom models (normal + dark)
- [ ] Mushroom animations (8-10 states)
- [ ] Discord Activity deployment
- [ ] Pre-generated demonic cutscene
- [ ] Voice input
- [ ] Audio / SFX

## License

TBD
