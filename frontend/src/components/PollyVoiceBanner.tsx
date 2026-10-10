import React, { useState, useRef, useEffect } from "react"
import { Volume2, VolumeX, Play, Square, Share2, Check, ExternalLink } from "lucide-react"
import { LANGUAGES } from "../services/mockData"

interface PollyVoiceBannerProps {
  language?: string
  locationName?: string
  cropName?: string
  advisoryText?: string
  compact?: boolean
  className?: string
}

export function PollyVoiceBanner({
  language = "HI",
  locationName = "Your Farm",
  cropName,
  advisoryText,
  compact = false,
  className = "",
}: PollyVoiceBannerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(18)
  const [activeLang, setActiveLang] = useState(language.toUpperCase())
  const [copiedLink, setCopiedLink] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Map language code to audio file name
  const langKey = activeLang.toLowerCase()
  const audioSrc = `/audio/advisory_${langKey}.mp3`
  const cdnAudioUrl = `https://d2wnlort4mta2e.cloudfront.net/audio/advisory_${langKey}.mp3`

  // Update when prop changes
  useEffect(() => {
    setActiveLang(language.toUpperCase())
  }, [language])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  function togglePlay() {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      setIsPlaying(false)
    } else {
      if (!audioRef.current || audioRef.current.src !== window.location.origin + audioSrc) {
        audioRef.current = new Audio(audioSrc)
        audioRef.current.ontimeupdate = () => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime)
            if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
              setDuration(audioRef.current.duration)
            }
          }
        }
        audioRef.current.onended = () => {
          setIsPlaying(false)
          setCurrentTime(0)
        }
        audioRef.current.onerror = () => {
          setIsPlaying(false)
        }
      }
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false))
    }
  }

  function handleShareWhatsApp() {
    const textMsg = encodeURIComponent(
      `🌾 *KisanGuard Agromet Voice Advisory (Amazon Polly)*\n` +
      `📍 Location: ${locationName}${cropName ? ` | Crop: ${cropName}` : ""}\n\n` +
      `${advisoryText ? `"${advisoryText}"\n\n` : ""}` +
      `🔊 *Listen to Spoken Voice Note (Amazon Polly):*\n${cdnAudioUrl}\n\n` +
      `_Delivered by KisanGuard Climate & Crop Risk Intelligence_`
    )
    window.open(`https://api.whatsapp.com/send?text=${textMsg}`, "_blank")
  }

  function handleCopyVoiceLink() {
    navigator.clipboard.writeText(cdnAudioUrl).then(() => {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 3000)
    })
  }

  const langNames: Record<string, string> = {
    HI: "हिन्दी (Hindi)",
    MR: "मराठी (Marathi)",
    PA: "ਪੰਜਾਬੀ (Punjabi)",
    EN: "English (Indian)",
    TE: "తెలుగు (Telugu)",
    BN: "বাংলা (Bengali)",
  }

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2.5 p-2 px-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs shadow-xs ${className}`}
      >
        <button
          type="button"
          onClick={togglePlay}
          className={`h-8 w-8 rounded-full flex items-center justify-center text-white font-bold transition shrink-0 cursor-pointer ${
            isPlaying ? "bg-red-600 hover:bg-red-700" : "bg-[#2e7d32] hover:bg-[#256628]"
          }`}
          title={isPlaying ? "Stop Voice Advisory" : "Listen via Amazon Polly"}
        >
          {isPlaying ? <Square size={11} fill="currentColor" /> : <Play size={13} fill="currentColor" className="ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 font-bold truncate">
            <Volume2 size={13} className="text-emerald-700 shrink-0" />
            <span>सुनो / Listen Advisory</span>
            <span className="text-[10px] font-mono bg-emerald-200/80 px-1.5 py-0.2 rounded font-semibold text-emerald-900">
              Polly
            </span>
          </div>
          <p className="text-[10px] text-stone-600 truncate">
            {langNames[activeLang] || activeLang} &middot; {locationName}
          </p>
        </div>

        <button
          type="button"
          onClick={handleShareWhatsApp}
          className="flex items-center gap-1 bg-[#25D366] hover:bg-[#20bd5a] text-white text-[11px] font-bold px-2 py-1.5 rounded-lg transition shrink-0 cursor-pointer shadow-xs"
          title="Share Voice Note on WhatsApp"
        >
          <span className="text-xs">🟢</span>
          <span className="hidden sm:inline">WhatsApp</span>
        </button>
      </div>
    )
  }

  return (
    <div
      className={`p-4 rounded-2xl bg-gradient-to-r from-emerald-900 via-stone-900 to-emerald-950 text-white shadow-md border border-emerald-700/50 relative overflow-hidden ${className}`}
    >
      {/* Background ambient badge */}
      <div className="absolute top-2 right-3 flex items-center gap-2">
        <span className="text-[10px] font-mono tracking-wider uppercase bg-emerald-800/80 text-emerald-200 px-2.5 py-0.5 rounded-full font-bold border border-emerald-600/50">
          AWS Polly Neural 22,050 Hz
        </span>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Play button + Title */}
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={togglePlay}
            className={`h-12 w-12 rounded-full flex items-center justify-center text-white font-bold transition shadow-lg shrink-0 cursor-pointer ${
              isPlaying
                ? "bg-red-600 hover:bg-red-700 ring-4 ring-red-500/30"
                : "bg-emerald-500 hover:bg-emerald-400 text-stone-950 ring-4 ring-emerald-400/20"
            }`}
            aria-label={isPlaying ? "Stop Voice Advisory" : "Listen to Agromet Voice Advisory"}
          >
            {isPlaying ? (
              <Square size={15} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" className="ml-1" />
            )}
          </button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <strong className="text-sm font-bold tracking-tight">
                {isPlaying ? "बोल रहा है / Speaking Advisory..." : "🔊 सुनो / Listen Agromet Advisory"}
              </strong>
              {isPlaying && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono animate-pulse">
                  ● LIVE
                </span>
              )}
            </div>
            <p className="text-xs text-stone-300 mt-0.5">
              Amazon Polly Regional Voice for <strong>{locationName}</strong>
              {cropName ? ` (${cropName})` : ""}
            </p>
          </div>
        </div>

        {/* Audio Waveform progress & Language Selector */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Language selector chips */}
          <div className="flex items-center gap-1 bg-stone-850/80 p-1 rounded-xl border border-stone-700/80">
            {["HI", "PA", "MR", "EN", "TE", "BN"].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  if (isPlaying && audioRef.current) {
                    audioRef.current.pause()
                    setIsPlaying(false)
                  }
                  setActiveLang(code)
                }}
                className={`text-[11px] px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                  activeLang === code
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-stone-400 hover:text-white"
                }`}
              >
                {code}
              </button>
            ))}
          </div>

          {/* Alternative 1: WhatsApp Voice Note Share */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm cursor-pointer"
            title="Share Voice Note directly on WhatsApp"
          >
            <span className="text-sm">🟢</span>
            <span>WhatsApp Voice Note</span>
          </button>

          {/* Copy Audio Link */}
          <button
            type="button"
            onClick={handleCopyVoiceLink}
            className="text-stone-300 hover:text-white p-2 rounded-xl bg-stone-800 hover:bg-stone-700 transition cursor-pointer text-xs flex items-center gap-1 border border-stone-700"
            title="Copy Direct Polly Audio Link"
          >
            {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
            <span className="hidden sm:inline">{copiedLink ? "Copied" : "Link"}</span>
          </button>
        </div>
      </div>

      {/* Progress track when playing */}
      <div className="mt-3 pt-2.5 border-t border-emerald-800/40 flex items-center gap-3 text-[11px] text-stone-300 font-mono">
        <span className="text-emerald-400 font-bold">
          0:{Math.floor(currentTime).toString().padStart(2, "0")} / 0:{Math.floor(duration).toString().padStart(2, "0")}
        </span>
        <div className="flex-1 bg-stone-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-emerald-400 h-full transition-all duration-150"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>
        <span className="text-stone-400 text-[10px]">
          {activeLang === "EN" ? "Voice: Kajal Neural" : "Voice: Aditi Neural"}
        </span>
      </div>
    </div>
  )
}
