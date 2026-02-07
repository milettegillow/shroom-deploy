import { TTS } from '../constants'

type VoiceMode = 'normal' | 'dark'

class TTSService {
  private synth = typeof window !== 'undefined' ? window.speechSynthesis : null
  private mode: VoiceMode = 'normal'
  private voices: SpeechSynthesisVoice[] = []

  constructor() {
    if (!this.synth) return
    this.synth.onvoiceschanged = () => { this.voices = this.synth?.getVoices() ?? [] }
    this.voices = this.synth.getVoices()
  }

  setMode(mode: VoiceMode) { this.mode = mode }

  speak(text: string) {
    if (!this.synth) return
    this.synth.cancel()
    setTimeout(() => {
      if (!this.synth) return
      const utt = new SpeechSynthesisUtterance(text)
      const settings = TTS[this.mode]
      utt.pitch = settings.pitch
      utt.rate = settings.rate
      utt.volume = settings.volume
      if (!this.voices.length) this.voices = this.synth.getVoices()
      const preferred = this.voices.find((v) => TTS.preferredVoices.some((n) => v.name.includes(n)))
      if (preferred) utt.voice = preferred
      this.synth.speak(utt)
    }, 50)
  }

  stop() { this.synth?.cancel() }
}

export const tts = new TTSService()
