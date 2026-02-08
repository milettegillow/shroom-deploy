import * as Playroom from 'playroomkit'

const GAME_ID = import.meta.env.VITE_PLAYROOM_GAME_ID || 'JhJR8CWNeOWDXs92t898'
const DISCORD_ENABLED = import.meta.env.VITE_PLAYROOM_DISCORD_ENABLED === 'true'
const ENABLE_API_MAPPING = import.meta.env.VITE_ENABLE_DISCORD_API_MAPPING === 'true'
const API_MAPPING_URL = import.meta.env.VITE_DISCORD_API_MAPPING_URL || ''

type PatchUrlMappings = (mappings: Array<{ prefix: string; target: string }>) => void

export async function initPlayroom() {
  // Patch URL mappings before insertCoin so /api routes work inside Discord iframe
  if (ENABLE_API_MAPPING && API_MAPPING_URL) {
    const discordSdk = (await Playroom.getDiscordSDK()) as {
      patchUrlMappings: PatchUrlMappings
    }
    discordSdk.patchUrlMappings([{ prefix: '/api', target: API_MAPPING_URL }])
  }

  await Playroom.insertCoin({
    gameId: GAME_ID,
    skipLobby: true,
    discord: DISCORD_ENABLED
      ? { scope: ['guilds.members.read', 'identify', 'rpc.activities.write'] }
      : false,
  })
}

export function getMyProfile(): { name: string; photo: string } {
  return Playroom.me().getProfile()
}

export function getDiscordToken(): string | null {
  try {
    return Playroom.getDiscordAccessToken() || null
  } catch {
    return null
  }
}
