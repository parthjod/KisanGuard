// Amazon Polly & Bedrock Real-Time Neural Speech Synthesizer for KisanGuard
// Generates and plays 100% real-time, live agromet voice advisories for ANY arbitrary farmer.
// Uses Amazon Bedrock (Meta Llama 3) for metric intelligence + Amazon Polly Neural (Kajal) for live speech synthesis.

export const LIVE_VOICE_API_URL = "https://yzvsegt7li.execute-api.ap-south-1.amazonaws.com"

export interface SpeechPlaybackState {
  isPlaying: boolean
  progress: number // 0 to 100
  currentTime: number // seconds
  duration: number // seconds
  isLiveSynthesizing?: boolean
  error?: string
}

export type PlaybackCallback = (state: SpeechPlaybackState) => void

export interface LiveSynthesisRequest {
  farmerName: string
  village?: string
  district?: string
  state?: string
  crop?: string
  crops?: string[]
  stage?: string
  soilType?: string
  irrigationMethod?: string
  wbgt?: number
  severity?: "red" | "caution"
  language?: string
}

export interface LiveSynthesisResponse {
  success: boolean
  farmerName: string
  district: string
  language: string
  generatedText: string
  audioBase64: string
  audioMimeType: string
  audioSizeBytes?: number
  estimatedDuration: number
  metrics?: {
    wbgt?: number
    severity?: string
    crop?: string
    stage?: string
    soil?: string
    irrigation?: string
  }
  meta?: {
    model: string
    voiceEngine: string
    bedrockTime: number
    pollyTime: number
    totalTime: number
  }
}

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
  private currentAudio: HTMLAudioElement | null = null
  private timer: any = null
  private startTime: number = 0
  private estimatedDuration: number = 18
  private liveCache = new Map<string, LiveSynthesisResponse>()

  public stop(onUpdate?: PlaybackCallback) {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
    }
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio = null
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

  /**
   * Invokes real-time Amazon Bedrock (Meta Llama 3) and Amazon Polly Neural API for any farmer.
   */
  public async synthesizeLive(req: LiveSynthesisRequest): Promise<LiveSynthesisResponse> {
    const cacheKey = `${req.farmerName}_${req.language || "hi"}_${req.crop || "crop"}_${req.wbgt || 33.8}_${req.district || ""}`
    if (this.liveCache.has(cacheKey)) {
      return this.liveCache.get(cacheKey)!
    }

    try {
      const resp = await fetch(LIVE_VOICE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req),
      })

      if (!resp.ok) {
        throw new Error(`API returned HTTP ${resp.status}`)
      }

      const data: LiveSynthesisResponse = await resp.json()
      if (data && data.audioBase64) {
        this.liveCache.set(cacheKey, data)
        return data
      }
      throw new Error(data?.generatedText || "No audio returned from live synthesizer")
    } catch (err: any) {
      console.warn("Real-time synthesis API error, falling back:", err)
      throw err
    }
  }

  /**
   * Synthesizes and plays real-time spoken audio for ANY arbitrary farmer.
   */
  public async speakLive(
    req: LiveSynthesisRequest,
    fallbackText: string,
    fallbackAudioUrl: string,
    onUpdate: PlaybackCallback
  ): Promise<LiveSynthesisResponse | null> {
    this.stop(onUpdate)

    onUpdate({
      isPlaying: false,
      progress: 0,
      currentTime: 0,
      duration: 18,
      isLiveSynthesizing: true,
    })

    try {
      const liveData = await this.synthesizeLive(req)
      if (liveData && liveData.audioBase64) {
        const audioSrc = `data:${liveData.audioMimeType || "audio/mpeg"};base64,${liveData.audioBase64}`
        this.playAudioSource(audioSrc, liveData.generatedText, req.language || "hi", liveData.estimatedDuration || 18, onUpdate)
        return liveData
      }
    } catch (e) {
      console.warn("Live synthesis failed, falling back to cached/pre-rendered audio:", e)
    }

    // Fallback: Play static/pre-rendered or speech synthesis
    this.speak(fallbackText, req.language || "hi", 18, fallbackAudioUrl, onUpdate)
    return null
  }

  /**
   * Plays given audio source (URL or base64 data URI) with native HTML5 media duration & progress tracking.
   */
  public playAudioSource(
    audioSrc: string,
    text: string,
    langCode: string,
    durationSeconds: number,
    onUpdate: PlaybackCallback
  ) {
    this.stop(onUpdate)
    this.estimatedDuration = durationSeconds || estimateSpeechDuration(text, 0.93)

    try {
      const audio = new Audio(audioSrc)
      this.currentAudio = audio

      audio.onloadedmetadata = () => {
        const d = audio.duration && !isNaN(audio.duration) ? audio.duration : this.estimatedDuration
        this.estimatedDuration = d
        onUpdate({
          isPlaying: true,
          progress: 0,
          currentTime: 0,
          duration: d,
          isLiveSynthesizing: false,
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
          isLiveSynthesizing: false,
        })
      }

      audio.onended = () => {
        const d = (audio.duration && !isNaN(audio.duration)) ? audio.duration : this.estimatedDuration
        onUpdate({
          isPlaying: false,
          progress: 100,
          currentTime: d,
          duration: d,
          isLiveSynthesizing: false,
        })
        setTimeout(() => {
          onUpdate({
            isPlaying: false,
            progress: 0,
            currentTime: 0,
            duration: d,
            isLiveSynthesizing: false,
          })
        }, 350)
      }

      audio.onerror = () => {
        console.warn("Audio element playback error, falling back to SpeechSynthesis")
        this.speakSpeechSynthesis(text, langCode, this.estimatedDuration, onUpdate)
      }

      audio.play().catch((e) => {
        console.warn("Audio play rejected:", e)
        this.speakSpeechSynthesis(text, langCode, this.estimatedDuration, onUpdate)
      })
    } catch (err) {
      console.warn("Audio element initialization error:", err)
      this.speakSpeechSynthesis(text, langCode, this.estimatedDuration, onUpdate)
    }
  }

  public speak(
    text: string,
    langCode: string,
    durationSeconds: number = 20,
    fallbackAudioUrl: string,
    onUpdate: PlaybackCallback
  ) {
    if (fallbackAudioUrl) {
      this.playAudioSource(fallbackAudioUrl, text, langCode, durationSeconds, onUpdate)
    } else {
      this.speakSpeechSynthesis(text, langCode, durationSeconds, onUpdate)
    }
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
        isLiveSynthesizing: false,
        error: "Audio playback unavailable",
      })
      return
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text)
      this.currentUtterance = utterance

      const langMap: Record<string, string> = {
        HI: "hi-IN",
        EN: "en-IN",
        MR: "mr-IN",
        PA: "pa-IN",
        TE: "te-IN",
        BN: "bn-IN",
      }
      const targetLang = langMap[(langCode || "HI").toUpperCase()] || "hi-IN"
      utterance.lang = targetLang
      utterance.rate = 0.93

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
          isLiveSynthesizing: false,
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
          isLiveSynthesizing: false,
        })
        setTimeout(() => {
          onUpdate({
            isPlaying: false,
            progress: 0,
            currentTime: 0,
            duration: finalDuration,
            isLiveSynthesizing: false,
          })
        }, 350)
      }

      utterance.onerror = () => {
        if (this.timer) clearInterval(this.timer)
        onUpdate({
          isPlaying: false,
          progress: 0,
          currentTime: 0,
          duration: durationSeconds,
          isLiveSynthesizing: false,
          error: "Voice error",
        })
      }

      window.speechSynthesis.speak(utterance)
      onUpdate({
        isPlaying: true,
        progress: 0,
        currentTime: 0,
        duration: this.estimatedDuration,
        isLiveSynthesizing: false,
      })
    } catch {
      onUpdate({
        isPlaying: false,
        progress: 0,
        currentTime: 0,
        duration: durationSeconds,
        isLiveSynthesizing: false,
      })
    }
  }
}

export const pollySynthesizer = new PollySynthesizerService()
