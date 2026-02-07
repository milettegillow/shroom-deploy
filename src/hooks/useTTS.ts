import { useEffect } from 'react'
import { useMushroomStore } from '../stores/mushroomStore'
import { tts } from '../audio/ttsService'

export function useTTS() {
  const evolution = useMushroomStore((s) => s.evolution)

  useEffect(() => {
    tts.setMode(evolution === 'dark' ? 'dark' : 'normal')
  }, [evolution])

  useEffect(() => useMushroomStore.subscribe(
    (s) => s.lastMushroomMessageId,
    () => {
      const msg = useMushroomStore.getState().lastMushroomMessage
      if (msg) tts.speak(msg)
    },
  ), [])

  useEffect(() => () => tts.stop(), [])
}
