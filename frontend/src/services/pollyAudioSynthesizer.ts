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
    this.estimatedDuration = durationSeconds || 18

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
          const progress = Math.min((elapsed / this.estimatedDuration) * 100, 99)
          onUpdate({
            isPlaying: true,
            progress,
            currentTime: elapsed,
            duration: this.estimatedDuration,
          })
        }, 150)

        utterance.onend = () => {
          if (this.timer) clearInterval(this.timer)
          onUpdate({
            isPlaying: false,
            progress: 100,
            currentTime: this.estimatedDuration,
            duration: this.estimatedDuration,
          })
          setTimeout(() => {
            onUpdate({
              isPlaying: false,
              progress: 0,
              currentTime: 0,
              duration: this.estimatedDuration,
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
