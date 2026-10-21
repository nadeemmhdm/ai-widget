export type SpeechHooks = {
  onStart?: () => void
  onBoundary?: () => void
  onEnd?: () => void
}

export function speak(text: string, enabled: boolean, hooks: SpeechHooks = {}) {
  if (!enabled || !('speechSynthesis' in window)) {
    hooks.onEnd?.()
    return
  }
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 1.02
  utterance.pitch = 1.08
  utterance.volume = 0.9
  utterance.onstart = () => hooks.onStart?.()
  utterance.onboundary = () => hooks.onBoundary?.()
  utterance.onend = () => hooks.onEnd?.()
  utterance.onerror = () => hooks.onEnd?.()
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}

export async function playAlarmTone() {
  const AudioContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextCtor) return
  try {
    const context = new AudioContextCtor()
    if (context.state === 'suspended') await context.resume()
    const start = context.currentTime
    const pattern = [0, 0.34, 0.68]
    for (const offset of pattern) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, start + offset)
      gain.gain.exponentialRampToValueAtTime(0.18, start + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.22)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(start + offset)
      oscillator.stop(start + offset + 0.24)
    }
    window.setTimeout(() => void context.close(), 1300)
  } catch {
    // Speech + notification remain available if Web Audio is blocked by the host.
  }
}
