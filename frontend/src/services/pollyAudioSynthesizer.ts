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
    // Compute exact dynamic duration from text to avoid hardcoded mismatch
    const calculatedDuration = estimateSpeechDuration(text, 0.93)
    this.estimatedDuration = Math.max(durationSeconds || 0, calculatedDuration)

    const hasSpeechSynthesis =
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof SpeechSynthesisUtterance !== "undefined"

    if (hasSpeechSynthesis) {
      try {
        const utterance = new SpeechSynthesisUtterance(text)
        this.currentUtterance = utterance

        // Choose appropriate voice
        const voices = window.speechSynthesis.getVoices()
        const targetLang = (langCode || "en-IN").toLowerCase()
        const prefix = targetLang.split("-")[0]

        // Find match in available browser voices
        const matchedVoice =
          voices.find((v) => v.lang.toLowerCase() === targetLang) ||
          voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ||
          voices.find((v) => v.lang.toLowerCase().includes("in") || v.name.includes("India")) ||
          null

        if (matchedVoice) {
          utterance.voice = matchedVoice
        }

        utterance.lang = langCode || "en-IN"
        utterance.rate = 0.93 // Slightly deliberate, clear cadence for agromet instruction
        utterance.pitch = 1.0

        this.startTime = Date.now()

        // Track progress with interval
        this.timer = setInterval(() => {
          const elapsed = (Date.now() - this.startTime) / 1000
          // Dynamically expand estimatedDuration if voice continues beyond estimate, ensuring currentTime <= duration always
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
          }, 400)
        }

        utterance.onerror = (e) => {
          console.warn("SpeechSynthesis error, switching to fallback audio:", e)
          this.playAudioFallback(fallbackAudioUrl, durationSeconds, onUpdate)
        }

        window.speechSynthesis.speak(utterance)
        onUpdate({
          isPlaying: true,
          progress: 0,
          currentTime: 0,
          duration: this.estimatedDuration,
        })
        return
      } catch (err) {
        console.warn("SpeechSynthesis exception, using audio fallback:", err)
      }
    }

    // Fallback to static audio file if speech synthesis is unavailable
    this.playAudioFallback(fallbackAudioUrl, durationSeconds, onUpdate)
  }

  private playAudioFallback(
    audioUrl: string,
    durationSeconds: number,
    onUpdate: PlaybackCallback
  ) {
    try {
      const audio = new Audio(audioUrl)
      this.fallbackAudio = audio

      audio.onloadedmetadata = () => {
        const d = audio.duration || durationSeconds || 18
        this.estimatedDuration = d
        onUpdate({
          isPlaying: true,
          progress: 0,
          currentTime: 0,
          duration: d,
        })
      }

      audio.ontimeupdate = () => {
        const d = audio.duration || this.estimatedDuration || 18
        onUpdate({
          isPlaying: true,
          progress: (audio.currentTime / d) * 100,
          currentTime: audio.currentTime,
          duration: d,
        })
      }

      audio.onended = () => {
        onUpdate({
          isPlaying: false,
          progress: 0,
          currentTime: 0,
          duration: this.estimatedDuration,
        })
      }

      audio.onerror = () => {
        onUpdate({
          isPlaying: false,
          progress: 0,
          currentTime: 0,
          duration: this.estimatedDuration,
          error: "Unable to play audio",
        })
      }

      audio.play().catch((e) => {
        console.warn("Audio autoplay blocked:", e)
        onUpdate({
          isPlaying: false,
          progress: 0,
          currentTime: 0,
          duration: this.estimatedDuration,
        })
      })
    } catch {
      onUpdate({
        isPlaying: false,
        progress: 0,
        currentTime: 0,
        duration: this.estimatedDuration,
      })
    }
  }
}

export const pollySynthesizer = new PollySynthesizerService()
