// Amazon Polly & SpeechSynthesis Player for KisanGuard
// Speaks hyper-personalized agromet text with Indian regional voices and fallback audio.

export interface SpeechPlaybackState {
  isPlaying: boolean
  progress: number // 0 to 100
  currentTime: number // seconds
  duration: number // seconds
  error?: string
}

export type PlaybackCallback = (state: SpeechPlaybackState) => void

export function estimateSpeechDuration(text: string, rate: number = 0.93): number {
  if (!text || !text.trim()) return 18
  const words = text.trim().split(/\s+/).filter(Boolean).length
  // Indian agromet speech cadence: ~2.1-2.3 words/sec adjusted for deliberate rate
  const estFromWords = words / (2.2 * (rate || 0.93))
  const estFromChars = text.trim().length / (13.0 * (rate || 0.93))
  return Math.max(Math.ceil(Math.max(estFromWords, estFromChars)), 14)
}

export function formatAudioTime(seconds: number): string {
  const safeSec = Math.max(0, Math.floor(seconds || 0))
  const m = Math.floor(safeSec / 60)
  const s = safeSec % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

class PollySynthesizerService {
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private fallbackAudio: HTMLAudioElement | null = null
  private timer: any = null
  private startTime: number = 0
  private estimatedDuration: number = 18

  public stop(onUpdate?: PlaybackCallback) {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
    }
    if (this.fallbackAudio) {
      this.fallbackAudio.pause()
      this.fallbackAudio = null
    }
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.currentUtterance = null
    if (onUpdate) {
      onUpdate({
        isPlaying: false,
        progress: 0,
        currentTime: 0,
        duration: this.estimatedDuration,
      })
    }
  }

  public speak(
    text: string,
    langCode: string,
    durationSeconds: number = 20,
    fallbackAudioUrl: string,
    onUpdate: PlaybackCallback
  ) {
    this.stop(onUpdate)
    const calculatedDuration = estimateSpeechDuration(text, 0.93)
    this.estimatedDuration = Math.max(durationSeconds || 0, calculatedDuration)

    // 1. Prioritize authentic Amazon Polly Neural audio recording if available
    if (fallbackAudioUrl) {
      try {
        const audio = new Audio(fallbackAudioUrl)
        this.fallbackAudio = audio

        audio.onloadedmetadata = () => {
          const d = audio.duration && !isNaN(audio.duration) ? audio.duration : this.estimatedDuration
          this.estimatedDuration = d
          onUpdate({
            isPlaying: true,
            progress: 0,
            currentTime: 0,
            duration: d,
          })
        }

        audio.ontimeupdate = () => {
          const d = (audio.duration && !isNaN(audio.duration)) ? audio.duration : this.estimatedDuration
          const cur = Math.min(audio.currentTime, d)
          onUpdate({
            isPlaying: true,
            progress: Math.min((cur / (d || 1)) * 100, 100),
            currentTime: cur,
            duration: d,
          })
        }

        audio.onended = () => {
          const d = (audio.duration && !isNaN(audio.duration)) ? audio.duration : this.estimatedDuration
          onUpdate({
            isPlaying: false,
            progress: 100,
            currentTime: d,
            duration: d,
          })
          setTimeout(() => {
            onUpdate({
              isPlaying: false,
              progress: 0,
              currentTime: 0,
              duration: d,
            })
          }, 350)
        }

        audio.onerror = () => {
          console.warn("Polly audio file failed, using SpeechSynthesis fallback")
          this.speakSpeechSynthesis(text, langCode, this.estimatedDuration, onUpdate)
        }

        audio.play().catch((e) => {
          console.warn("Audio autoplay blocked, using SpeechSynthesis fallback:", e)
          this.speakSpeechSynthesis(text, langCode, this.estimatedDuration, onUpdate)
        })

        return
      } catch (err) {
        console.warn("Audio element initialization error:", err)
      }
    }

    // 2. Fallback to browser SpeechSynthesis
    this.speakSpeechSynthesis(text, langCode, this.estimatedDuration, onUpdate)
  }

  private speakSpeechSynthesis(
    text: string,
    langCode: string,
    durationSeconds: number,
    onUpdate: PlaybackCallback
  ) {
    const hasSpeechSynthesis =
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof SpeechSynthesisUtterance !== "undefined"

    if (!hasSpeechSynthesis) {
      onUpdate({
        isPlaying: false,
        progress: 0,
        currentTime: 0,
        duration: durationSeconds,
        error: "Audio playback unavailable",
      })
      return
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text)
      this.currentUtterance = utterance

      const voices = window.speechSynthesis.getVoices()
      const targetLang = (langCode || "en-IN").toLowerCase()
      const prefix = targetLang.split("-")[0]

      const matchedVoice =
        voices.find((v) => v.lang.toLowerCase() === targetLang) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ||
        null

      if (matchedVoice) {
        utterance.voice = matchedVoice
      }

      utterance.lang = langCode || "en-IN"
      utterance.rate = 0.93
      utterance.pitch = 1.0

      this.startTime = Date.now()

      this.timer = setInterval(() => {
        const elapsed = (Date.now() - this.startTime) / 1000
        if (elapsed >= this.estimatedDuration) {
          this.estimatedDuration = Math.ceil(elapsed + 1)
        }
        const displayTime = Math.min(elapsed, this.estimatedDuration)
        const progress = Math.min((displayTime / this.estimatedDuration) * 100, 99)
        onUpdate({
          isPlaying: true,
          progress,
          currentTime: displayTime,
          duration: this.estimatedDuration,
        })
      }, 150)

      utterance.onend = () => {
        if (this.timer) clearInterval(this.timer)
        const finalDuration = Math.max(
          Math.ceil((Date.now() - this.startTime) / 1000),
          this.estimatedDuration
        )
        onUpdate({
          isPlaying: false,
          progress: 100,
          currentTime: finalDuration,
          duration: finalDuration,
        })
        setTimeout(() => {
          onUpdate({
            isPlaying: false,
            progress: 0,
            currentTime: 0,
            duration: finalDuration,
          })
        }, 350)
      }

      utterance.onerror = (e) => {
        if (this.timer) clearInterval(this.timer)
        onUpdate({
          isPlaying: false,
          progress: 0,
          currentTime: 0,
          duration: durationSeconds,
          error: "Voice error",
        })
      }

      window.speechSynthesis.speak(utterance)
      onUpdate({
        isPlaying: true,
        progress: 0,
        currentTime: 0,
        duration: this.estimatedDuration,
      })
    } catch {
      onUpdate({
        isPlaying: false,
        progress: 0,
        currentTime: 0,
        duration: durationSeconds,
      })
    }
  }
}

export const pollySynthesizer = new PollySynthesizerService()
