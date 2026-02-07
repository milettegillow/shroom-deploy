// Voice input via Web Speech Recognition API (nice-to-have, not wired in yet)

type VoiceInputCallback = (text: string) => void

export function startListening(onResult: VoiceInputCallback): () => void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechRecognition = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition

  if (!SpeechRecognition) {
    console.warn('SpeechRecognition not supported in this browser')
    return () => {}
  }

  const recognition = new SpeechRecognition()
  recognition.continuous = false
  recognition.interimResults = false
  recognition.lang = 'en-US'

  recognition.onresult = (event: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => {
    const transcript = event.results[0]?.[0]?.transcript
    if (transcript) onResult(transcript)
  }

  recognition.onerror = (event: Event) => {
    console.warn('Speech recognition error:', event)
  }

  recognition.start()

  return () => recognition.stop()
}
