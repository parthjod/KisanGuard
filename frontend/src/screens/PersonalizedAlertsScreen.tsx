import { useEffect, useMemo, useRef, useState } from "react"
import {
  BellRing,
  CheckCircle2,
  Clock,
  Eye,
  Info,
  Languages,
  Play,
  Send,
  Square,
  User,
  UserCheck,
  UserRound,
  Volume2,
  VolumeX,
  Share2,
  Mic,
  MessageCircle,
} from "lucide-react"
import { PollyVoiceBanner } from "../components/PollyVoiceBanner"
import {
  Card,
  CardHeader,
  Disclosure,
  ErrorNote,
  Loading,
  ProgressBar,
  SEVERITY_CLASS,
  SEVERITY_LABEL,
  RangeField,
  Segmented,
  SeverityBadge,
  Toggle,
} from "../components/ui"
import { FeatureShell } from "../components/SiteChrome"
import { RevealSection, RevealCard } from "../components/Reveal"
import { useService } from "../hooks/useService"
import { alertService, type AlertDeliveryReceipt } from "../services/alertService"
import { CROP_LIST, LANGUAGES, LOCATIONS, PERSONAS } from "../services/mockData"
import {
  buildAdvisoryPreview,
  buildExplanation,
  CHANNEL_OPTIONS,
  DEFAULT_PREFERENCES,
  FREQUENCY_OPTIONS,
  preferenceService,
} from "../services/preferenceService"
import { getPersonalizedAdvisory } from "../services/farmerAdvisoryEngine"
import { pollySynthesizer } from "../services/pollyAudioSynthesizer"
import { relativeTime } from "../services/random"
import { useAppState } from "../state/AppState"
import { useAuth, DEMO_FARMERS, FarmerUser } from "../state/AuthState"
import type {
  AdvisoryPreview,
  AlertChannel,
  AlertFrequency,
  CropId,
  Persona,
} from "../services/types"

const CHANNEL_ICON: Record<AlertChannel, typeof Send> = {
  whatsapp: MessageCircle,
  web: Eye,
  sms: MessageCircle,
  voice: MessageCircle,
  push: Eye,
}

const ADVISORY_KEYS = [
  {
    id: "heat",
    label: "Heat risk advisories",
    detail: "WBGT and PSI threshold crossings",
  },
  {
    id: "irrigation",
    label: "Irrigation reminders",
    detail: "Window opens and closes",
  },
  {
    id: "yield",
    label: "Yield risk updates",
    detail: "14-day forecast movement",
  },
  {
    id: "cropHealth",
    label: "Crop health notices",
    detail: "CDHI state changes",
  },
] as const

// Channels and advisory mapping


export default function PersonalizedAlertsScreen() {
  const { preferences, setPreferences, setPersonaId, persona, setLocation } = useAppState()
  const { user, login, allFarmers } = useAuth()
  const [channel, setChannel] = useState<AlertChannel>("whatsapp")
  const [dispatchedNotice, setDispatchedNotice] = useState<string | null>(null)

  // Derive active subscriber dynamically from logged-in user or active persona
  const activeSubscriber: Persona = useMemo(() => {
    if (user) {
      const initials = user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
      const localName =
        user.state === "Punjab"
          ? "ਹਰਪ੍ਰੀਤ ਸਿੰਘ"
          : user.name === "Sunita Deshmukh"
          ? "सुनीता देशमुख"
          : user.name === "Ramesh Patil"
          ? "रमेश पाटील"
          : user.name === "Devendra Rathore"
          ? "देवेन्द्र राठौड़"
          : user.name === "Suresh Reddy"
          ? "సురేష్ రెడ్డి"
          : user.name

      const safeCrops = Array.isArray(user.crops) && user.crops.length > 0 ? user.crops : ["wheat"]
      return {
        id: user.userId.replace("usr_farmer_", ""),
        name: user.name,
        nameLocal: localName,
        role: `${safeCrops.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(" & ")} Farmer`,
        village: user.village || user.district,
        district: user.district,
        state: user.state,
        crop: (safeCrops[0] as CropId) || "wheat",
        crops: safeCrops,
        soilType: user.soilType,
        irrigationMethod: user.irrigationMethod,
        stage: "flowering",
        hectares: user.acres ? user.acres * 0.404686 : 3.8,
        avatarInitials: initials,
      }
    }
    return persona
  }, [user, persona])

  const personas = useService(() => preferenceService.listPersonas(), [])
  const alerts = useService(() => alertService.listAlerts(), [])
  const preview = useService(
    () => preferenceService.preview(preferences, channel),
    [preferences, channel],
  )
  const explanation = useService(
    () => preferenceService.explain(preferences),
    [preferences],
  )

  useEffect(() => {
    if (!preferences.channels[channel]) {
      const first = CHANNEL_OPTIONS.find(
        (item) => preferences.channels[item.id],
      )
      if (first) setChannel(first.id)
    }
  }, [preferences.channels, channel])

  const previewData: AdvisoryPreview | null =
    preview.data ??
    (alerts.data
      ? buildAdvisoryPreview(preferences, channel, alerts.data, activeSubscriber)
      : null)

  const reasons = useMemo(
    () =>
      explanation.data ??
      (alerts.data ? buildExplanation(preferences, alerts.data, activeSubscriber) : []),
    [explanation.data, alerts.data, preferences, activeSubscriber],
  )

  const enabledChannels = CHANNEL_OPTIONS.filter(
    (item) => preferences.channels[item.id],
  )

  const farmerAdvisory = useMemo(() => {
    return getPersonalizedAdvisory(activeSubscriber, preferences.language)
  }, [activeSubscriber, preferences.language])

  function handleSelectFarmer(farmer: FarmerUser) {
    stopPollyAudio()
    login(farmer)
    const nextLang = (farmer.preferredLanguage?.toUpperCase() || (farmer.state === "Punjab" ? "PA" : farmer.state === "Telangana" ? "TE" : "HI"))
    setPreferences((prev) => ({
      ...prev,
      personaId: farmer.userId.replace("usr_farmer_", ""),
      language: nextLang,
      crops: farmer.crops.length > 0 ? (farmer.crops as any) : prev.crops,
    }))

    if (setLocation) {
      setLocation({
        id: `farmer-${farmer.userId}`,
        village: farmer.village || farmer.district,
        district: farmer.district,
        state: farmer.state,
        pincode: farmer.pincode || "—",
        lat: farmer.lat || 19.99,
        lng: farmer.lng || 73.78,
        acres: farmer.acres || 4.5,
        soilType: farmer.state === "Punjab" ? "alluvial" : "medium-black",
      })
    }
  }

  const [phoneNumber, setPhoneNumber] = useState(user?.phone || "+91 98765 43210")
  const [sendingAlert, setSendingAlert] = useState(false)
  const [deliveryReceipt, setDeliveryReceipt] = useState<AlertDeliveryReceipt | null>(null)

  useEffect(() => {
    if (user?.phone) {
      setPhoneNumber(user.phone)
    }
  }, [user])

  const [isPlayingPolly, setIsPlayingPolly] = useState(false)
  const [pollyProgress, setPollyProgress] = useState(0)
  const [pollyDuration, setPollyDuration] = useState(18)
  const [pollyCurrentTime, setPollyCurrentTime] = useState(0)

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      pollySynthesizer.stop()
    }
  }, [])

  const getAudioUrlForLanguage = (lang: string) => {
    const l = (lang || "hi").toLowerCase()
    if (l === "hi" || l === "en" || l === "mr" || l === "pa" || l === "te" || l === "bn") {
      return `/audio/advisory_${l}.mp3`
    }
    return `/audio/advisory_hi.mp3`
  }

  function playPollyAudio() {
    pollySynthesizer.speak(
      farmerAdvisory.spokenText,
      farmerAdvisory.voiceLangCode,
      farmerAdvisory.suggestedDuration,
      getAudioUrlForLanguage(preferences.language),
      (state) => {
        setIsPlayingPolly(state.isPlaying)
        setPollyProgress(state.progress)
        setPollyCurrentTime(state.currentTime)
        setPollyDuration(state.duration)
      }
    )
  }

  function stopPollyAudio() {
    pollySynthesizer.stop((state) => {
      setIsPlayingPolly(false)
      setPollyProgress(0)
      setPollyCurrentTime(0)
    })
  }

  function togglePollyAudio() {
    if (isPlayingPolly) {
      stopPollyAudio()
    } else {
      playPollyAudio()
    }
  }

  function handleSendWhatsAppDirect() {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, "")
    const audioUrl = `https://d2wnlort4mta2e.cloudfront.net/audio/advisory_${(preferences.language || "hi").toLowerCase()}.mp3`
    const textToSend = encodeURIComponent(
      `${farmerAdvisory.whatsappText}\n\n` +
      `🔊 *Listen to Amazon Polly Voice Note (${Math.round(farmerAdvisory.suggestedDuration)}s):*\n${audioUrl}\n\n` +
      `_Dispatched via KisanGuard Climate & Crop Intelligence_`
    )
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${textToSend}`
      : `https://api.whatsapp.com/send?text=${textToSend}`
    window.open(url, "_blank")
    handleDispatchAlert()
  }

  async function handleDispatchAlert() {
    setSendingAlert(true)
    const activeMsg =
      previewData?.body ||
      `[KisanGuard Alert] High heat stress expected in ${activeSubscriber.district}. Halt field labor 11:30-15:30.`

    try {
      const receipt = await alertService.sendAlert(
        phoneNumber,
        channel,
        preferences.language,
        activeMsg,
      )
      setDeliveryReceipt(receipt)
      setDispatchedNotice(
        `✓ Live agromet alert dispatched via ${channel.toUpperCase()} to ${phoneNumber} (${receipt.gateway}) · ID: ${receipt.messageId}`
      )
    } catch {
      setDispatchedNotice(
        `✓ Alert queued for delivery via ${channel.toUpperCase()} to ${phoneNumber}`
      )
    } finally {
      setSendingAlert(false)
    }
  }

  return (
    <FeatureShell active="Personalized Alerts">
      {/* HERO SECTION */}
      <section className="kg-hero-band is-compact">
        <div className="container kg-hero-grid">
          <div>
            <p className="kg-eyebrow">Agromet Voice &amp; WhatsApp Intelligence</p>
            <h1>
              Personalized Alerts &amp;
              <br />
              Voice Intelligence.
            </h1>
            <p className="kg-hero-lead">
              Hyperlocal agromet advisories delivered via WhatsApp Voice Notes and Web Audio, synthesized with Amazon Polly in regional Indian languages. Experience and test real spoken alerts below.
            </p>
          </div>

          <div className="kg-hero-panel">
            <div className="kg-panel-head">
              <p className="kg-eyebrow">Active Subscriber Route</p>
              <span className="live-dot">Live Route</span>
            </div>
            <div className="kg-persona-summary">
              <span className="kg-avatar">{activeSubscriber.avatarInitials}</span>
              <div>
                <strong>{activeSubscriber.name}</strong>
                <span>{activeSubscriber.nameLocal}</span>
                <em>{activeSubscriber.role}</em>
              </div>
            </div>
            <div className="text-xs text-stone-600 mt-2 space-y-1 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
              <div className="flex justify-between">
                <span>Location:</span>
                <strong>{activeSubscriber.village}, {activeSubscriber.district}</strong>
              </div>
              <div className="flex justify-between">
                <span>Phone Target:</span>
                <strong className="font-mono">{phoneNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span>Advisory Language:</span>
                <strong>{LANGUAGES.find((l) => l.code === preferences.language)?.native || preferences.language}</strong>
              </div>
              <div className="flex justify-between">
                <span>Soil &amp; Irrigation:</span>
                <strong className="capitalize">
                  {activeSubscriber.soilType || (activeSubscriber.district.toLowerCase().includes("ludhiana") ? "Alluvial Loam" : activeSubscriber.district.toLowerCase().includes("jodhpur") ? "Sandy Loam" : activeSubscriber.district.toLowerCase().includes("warangal") ? "Red Loam" : "Black Vertisol")} · {activeSubscriber.irrigationMethod || "Drip"}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Model Pipeline:</span>
                <strong className="text-emerald-800 font-semibold">Bedrock (Meta Llama 3) &rarr; Polly Neural</strong>
              </div>
              <div className="flex justify-between">
                <span>Primary Channel:</span>
                <strong className="capitalize">{channel.toUpperCase()}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DISPATCH SUCCESS NOTICE */}
      {dispatchedNotice && (
        <div className="container" style={{ marginTop: "16px" }}>
          <div
            style={{
              padding: "12px 18px",
              borderRadius: "10px",
              background: "#eaf5e9",
              border: "1px solid #7cb366",
              color: "#1c5123",
              fontWeight: 600,
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 4px 14px rgba(40, 80, 25, 0.08)",
            }}
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              {dispatchedNotice}
            </span>
            <button
              type="button"
              onClick={() => setDispatchedNotice(null)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                color: "#1c5123",
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: SELECT FARMER PROFILE */}
      <RevealSection className="section kg-section is-white">
        <div className="container">
          <div className="kg-section-head">
            <div>
              <p className="kg-eyebrow">Step 1: Target Subscriber</p>
              <h2>Select an Indian Farmer Profile to Test</h2>
            </div>
            <p>
              Switch between authentic farms across Punjab, Maharashtra, Rajasthan, and Telangana. Each profile updates the language, crop, and location telemetry instantly.
            </p>
          </div>

          <div className="kg-persona-grid">
            {allFarmers.map((f) => {
              const isActive = (user?.userId === f.userId) || (activeSubscriber.name === f.name)
              const initials = f.name.split(" ").map((n) => n[0]).join("").slice(0, 2)
              return (
                <button
                  key={f.userId}
                  type="button"
                  className={`kg-persona-card group${isActive ? " is-active" : ""}`}
                  onClick={() => handleSelectFarmer(f)}
                >
                  <div className="flex flex-col h-full justify-between w-full">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="kg-avatar">{initials}</span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100/90 text-emerald-900 uppercase">
                          {f.preferredLanguage?.toUpperCase() || "REGIONAL"}
                        </span>
                      </div>
                      <strong className="block text-stone-900 font-bold text-[15px]">{f.name}</strong>
                      <div className="text-xs text-emerald-800 font-semibold capitalize mt-0.5">
                        {f.crops.join(", ")} Farmer
                      </div>
                      <div className="text-[11px] text-stone-500 mt-1 line-clamp-2 leading-tight">
                        {f.village || f.district}, {f.district} ({f.state})
                      </div>
                    </div>
                    <div className="mt-4 pt-2.5 border-t border-stone-200/80 flex items-center justify-between text-[11px] w-full">
                      {isActive ? (
                        <span className="kg-persona-active">✓ Active Target</span>
                      ) : (
                        <span className="text-stone-500 font-medium group-hover:text-emerald-700 transition">
                          Select profile &rarr;
                        </span>
                      )}
                      <span className="font-semibold text-stone-600">
                        {f.irrigationMethod || "Drip"}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </RevealSection>

      {/* STEP 2: NOTIFICATION SIMULATOR & TESTING */}
      <RevealSection className="section kg-section">
        <div className="container">
          <div className="kg-section-head">
            <div>
              <p className="kg-eyebrow">Step 2: Live Simulator</p>
              <h2>Test How Farmers Receive Notifications</h2>
            </div>
            <p>
              Experience instant WhatsApp agromet delivery and listen to live vernacular voice advisories synthesized with Amazon Polly.
            </p>
          </div>

          {/* Alternative 2: One-Tap Vernacular Agromet Audio Player & WhatsApp Share */}
          <div style={{ marginBottom: "24px" }}>
            <PollyVoiceBanner
              language={preferences.language}
              locationName={`${farmerAdvisory.village}, ${farmerAdvisory.district}`}
              cropName={`${farmerAdvisory.cropName} (${farmerAdvisory.stageName})`}
              advisoryText={farmerAdvisory.spokenText}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Interactive Preview Card */}
            <Card className="flex flex-col justify-between h-full">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <CardHeader
                    eyebrow="Delivery Format"
                    title="Phone Message Simulator"
                    detail="Live preview rendered from active routing rules"
                  />

                  <Segmented
                    label="Channel"
                    value={channel}
                    onChange={setChannel}
                    options={CHANNEL_OPTIONS.map((item) => ({
                      value: item.id,
                      label: item.label,
                    }))}
                    size="small"
                  />

                  {/* Smartphone Mockup */}
                  {channel === "whatsapp" ? (
                    <div className="mt-4 rounded-2xl overflow-hidden border border-emerald-300 shadow-xs bg-[#e5ddd5]">
                      {/* WhatsApp Header */}
                      <div className="bg-[#075e54] text-white p-2.5 px-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-xs">
                            KG
                          </div>
                          <div>
                            <div className="font-bold text-xs leading-none">KisanGuard Agri-Advisory</div>
                            <div className="text-[10px] text-emerald-200">online &middot; Agromet Verified</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono bg-emerald-800 text-emerald-100 px-1.5 py-0.5 rounded font-bold">
                          WhatsApp
                        </span>
                      </div>

                      {/* WhatsApp Chat Body */}
                      <div className="p-3 space-y-2.5 text-xs">
                        {/* WhatsApp Voice Note Bubble */}
                        <div className="bg-[#dcf8c6] text-stone-900 p-2.5 rounded-xl rounded-tl-none shadow-xs border border-emerald-200/80 max-w-[92%] space-y-1.5">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={togglePollyAudio}
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 cursor-pointer shadow-xs ${
                                isPlayingPolly ? "bg-red-600 hover:bg-red-700" : "bg-[#075e54] hover:bg-[#128c7e]"
                              }`}
                              title={isPlayingPolly ? "Stop Voice Note" : "Play Voice Note (Amazon Polly)"}
                            >
                              {isPlayingPolly ? <Square size={12} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-emerald-950">
                                <span>Amazon Polly &middot; {farmerAdvisory.farmerName}</span>
                                <span>
                                  {isPlayingPolly
                                    ? `0:${Math.floor(pollyCurrentTime).toString().padStart(2, "0")} / 0:${Math.round(pollyDuration || farmerAdvisory.suggestedDuration)}`
                                    : `0:${Math.round(farmerAdvisory.suggestedDuration)}`}
                                </span>
                              </div>
                              {/* Waveform graphic */}
                              <div className="flex items-center gap-0.5 mt-1 h-3">
                                {[4, 8, 12, 6, 14, 9, 11, 7, 13, 10, 8, 14, 6, 12, 5, 10, 7].map((h, i) => (
                                  <span
                                    key={i}
                                    className={`w-1 rounded-full transition-all duration-150 ${
                                      isPlayingPolly ? "bg-[#075e54] animate-pulse" : "bg-emerald-700/60"
                                    }`}
                                    style={{ height: `${h}px` }}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="text-[10px] text-stone-600 flex items-center justify-between pt-1 border-t border-emerald-300/40">
                            <span className="italic font-medium text-emerald-900">Voice: {farmerAdvisory.voiceName}</span>
                            <span className="text-[#075e54] font-bold">✓✓ PTT Delivered</span>
                          </div>
                        </div>

                        {/* WhatsApp Text Bubble */}
                        <div className="bg-white text-stone-900 p-2.5 rounded-xl rounded-tl-none shadow-xs border border-stone-200 max-w-[92%] space-y-1">
                          <p className="text-[12px] leading-relaxed whitespace-pre-line">{farmerAdvisory.displayBody}</p>
                          <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1">
                            <span className="text-[#075e54] font-semibold">Halt Hours: {farmerAdvisory.haltHours}</span>
                            <span className="text-blue-600 font-bold">✓✓</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 p-4 rounded-xl border border-stone-200 bg-stone-50 shadow-xs space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
                        <div className="flex items-center gap-1.5 text-emerald-800">
                          <Eye size={14} />
                          <span>KisanGuard Web Intelligence Feed</span>
                        </div>
                        <span className="font-mono text-[10px] bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded">
                          {preferences.language}
                        </span>
                      </div>
                      <strong className="block text-xs text-stone-900 font-bold">
                        Heat Advisory for {farmerAdvisory.farmerName} ({farmerAdvisory.village})
                      </strong>
                      <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-line">
                        {farmerAdvisory.displayBody}
                      </p>
                      <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[11px] text-emerald-800 font-medium">
                        <span>Halt window: {farmerAdvisory.haltHours}</span>
                        <span className="text-[10px] text-stone-500">Live Telemetry &middot; Amazon Polly Audio Ready</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons for WhatsApp & Polly Audio */}
              <div className="mt-5 pt-4 border-t border-stone-200">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={handleSendWhatsAppDirect}
                    className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>🟢</span>
                    <span>Send / Share via WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={togglePollyAudio}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isPlayingPolly ? <Square size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
                    <span>{isPlayingPolly ? "Pause Voice Advisory" : `Listen to ${farmerAdvisory.farmerName}'s Voice`}</span>
                  </button>
                </div>
              </div>
            </Card>

            {/* Dispatch Gateway & Amazon Polly Architecture */}
            <Card className="flex flex-col justify-between h-full">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <CardHeader
                    eyebrow="Gateway Pipeline"
                    title="WhatsApp &amp; Amazon Polly Pipeline"
                    detail="Agromet speech synthesis with direct WhatsApp PTT voice delivery"
                  />

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Target Mobile Number (+91)
                      </label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#2e7d32] bg-white"
                      />
                      <span className="text-[11px] text-stone-500 mt-1 block">
                        Subscriber recipient: {activeSubscriber.name} ({activeSubscriber.district})
                      </span>
                    </div>

                    {/* Amazon Polly Voice Synthesis Panel & Real Audio Player */}
                    <div className="p-4 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/60 border border-emerald-300 rounded-2xl shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${isPlayingPolly ? "bg-emerald-600 animate-ping" : "bg-emerald-600"}`} />
                          <span className="text-xs font-bold text-emerald-950">Amazon Polly Voice Dispatch</span>
                        </div>
                        <span className="text-[10px] font-mono bg-emerald-200/90 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                          AWS Polly Neural
                        </span>
                      </div>

                      <p className="text-[11px] text-stone-600 leading-relaxed">
                        <strong>Personalized for {farmerAdvisory.farmerName}:</strong> Specific to {farmerAdvisory.village}, {farmerAdvisory.district} and {farmerAdvisory.cropName}. Amazon Polly synthesizes authentic regional guidance for field laborers.
                      </p>

                      {/* Audible Real Polly Player */}
                      <div className="p-3 bg-white rounded-xl border border-emerald-200/80 shadow-xs flex items-center gap-3">
                        <button
                          type="button"
                          onClick={togglePollyAudio}
                          className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold transition shadow-md cursor-pointer shrink-0 ${
                            isPlayingPolly ? "bg-red-600 hover:bg-red-700" : "bg-[#2e7d32] hover:bg-[#256628]"
                          }`}
                          aria-label={isPlayingPolly ? "Pause Voice Advisory" : "Play Voice Advisory"}
                        >
                          {isPlayingPolly ? (
                            <Square size={13} fill="currentColor" />
                          ) : (
                            <Play size={16} fill="currentColor" className="ml-0.5" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-stone-800 truncate">
                              {farmerAdvisory.voiceName} ({farmerAdvisory.farmerName})
                            </span>
                            <span className="font-mono text-[11px] text-emerald-800 font-bold">
                              {isPlayingPolly
                                ? `0:${Math.floor(pollyCurrentTime).toString().padStart(2, "0")} / 0:${Math.round(pollyDuration || farmerAdvisory.suggestedDuration).toString().padStart(2, "0")}`
                                : `0:00 / 0:${Math.round(farmerAdvisory.suggestedDuration)}`}
                            </span>
                          </div>

                          {/* Progress track */}
                          <div className="w-full bg-stone-100 rounded-full h-1.5 mt-1.5 overflow-hidden border border-stone-200">
                            <div
                              className="bg-emerald-600 h-full rounded-full transition-all duration-150"
                              style={{ width: `${pollyProgress}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-stone-500 mt-1">
                            <span>Target: {farmerAdvisory.village}, {farmerAdvisory.district}</span>
                            <span className={isPlayingPolly ? "text-emerald-700 font-bold" : ""}>
                              {isPlayingPolly ? "🔊 Speaking Now..." : "Click Play to Test Voice"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Spoken Text Script Preview */}
                      <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200/60 text-[11px] text-stone-700">
                        <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide mb-1 flex items-center justify-between">
                          <span>Personalized Polly Script</span>
                          <span className="font-mono text-[9px] bg-emerald-200 px-1 py-0.2 rounded font-semibold text-emerald-900">
                            {farmerAdvisory.voiceLangCode}
                          </span>
                        </div>
                        <p className="italic leading-relaxed text-stone-800">
                          &ldquo;{farmerAdvisory.spokenText}&rdquo;
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-2">
                      <div className="flex items-center justify-between font-bold text-stone-800">
                        <span>Delivery Pipeline</span>
                        <span className="text-emerald-700">Meta WhatsApp Cloud API</span>
                      </div>
                      <div className="flex items-center justify-between text-stone-600">
                        <span>Voice Synthesis</span>
                        <span>Amazon Polly Neural (22,050 Hz MP3)</span>
                      </div>
                    </div>

                    {deliveryReceipt && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-emerald-900">
                          <span>✓ Verified WhatsApp &amp; Audio Receipt</span>
                          <span className="font-mono text-[10px] bg-emerald-200 px-1.5 py-0.5 rounded text-emerald-800">
                            {deliveryReceipt.messageId}
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-800">
                          Gateway: {deliveryReceipt.gateway} &middot; Chars: {deliveryReceipt.charCount}
                        </p>
                        <p className="text-[10px] text-stone-500 font-mono">
                          Dispatched at: {deliveryReceipt.deliveredAt}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-200 text-[11px] text-stone-500 flex items-center justify-between">
                <span>Speech Synthesis Engine</span>
                <span className="font-semibold text-emerald-800">AWS Polly Neural (ap-south-1)</span>
              </div>
            </Card>
          </div>
        </div>
      </RevealSection>

      {/* STEP 3: ROUTING RULES (LANGUAGE, THRESHOLDS, QUIET HOURS) */}
      <RevealSection className="section kg-section is-white">
        <div className="container">
          <div className="kg-section-head">
            <div>
              <p className="kg-eyebrow">Step 3: Routing Rules</p>
              <h2>Language, Channels &amp; Thresholds</h2>
            </div>
            <p>Fine-tune when alerts fire and in what regional dialect.</p>
          </div>

          <div className="kg-two-col">
            <Card className="flex flex-col justify-between">
              <div>
                <CardHeader
                  eyebrow="Language"
                  title="Message language"
                  detail="Applied before text-to-speech synthesis or WhatsApp formatting"
                />
                <div className="kg-language-grid">
                  {LANGUAGES.map((language) => (
                    <button
                      key={language.code}
                      type="button"
                      className={`kg-language-chip${preferences.language === language.code ? " is-active" : ""}`}
                      onClick={() =>
                        setPreferences((previous) => ({
                          ...previous,
                          language: language.code,
                        }))
                      }
                    >
                      <Languages size={15} />
                      <span>{language.native}</span>
                      <em>{language.label}</em>
                    </button>
                  ))}
                </div>

                <div className="kg-channel-block">
                  <p className="kg-field-label">
                    <Volume2 size={14} /> Active delivery channels
                  </p>
                  <div className="kg-channel-list">
                    {CHANNEL_OPTIONS.map((option) => {
                      const Icon = CHANNEL_ICON[option.id]
                      return (
                        <button
                          key={option.id}
                          type="button"
                          className={`kg-channel-card${preferences.channels[option.id] ? " is-active" : ""}`}
                          onClick={() => {
                            setPreferences((previous) => ({
                              ...previous,
                              channels: {
                                ...previous.channels,
                                [option.id]: !previous.channels[option.id],
                              },
                            }))
                          }}
                        >
                          <Icon size={18} />
                          <strong>{option.label}</strong>
                          <span>{option.detail}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="flex flex-col justify-between">
              <div>
                <CardHeader
                  eyebrow="Thresholds &amp; Quiet Hours"
                  title="Escalation Rules"
                  detail="Custom WBGT thermal triggers and overnight quiet buffer"
                />

                <div className="kg-range-block">
                  <RangeField
                    label="Caution threshold"
                    value={preferences.thresholds.caution}
                    min={24}
                    max={33}
                    unit="°C"
                    onChange={(value) =>
                      setPreferences((previous) => ({
                        ...previous,
                        thresholds: {
                          ...previous.thresholds,
                          caution: Math.min(value, previous.thresholds.red - 1),
                        },
                      }))
                    }
                  />
                  <RangeField
                    label="Red threshold (Triggers Priority Advisory)"
                    value={preferences.thresholds.red}
                    min={30}
                    max={40}
                    unit="°C"
                    onChange={(value) =>
                      setPreferences((previous) => ({
                        ...previous,
                        thresholds: {
                          ...previous.thresholds,
                          red: Math.max(value, previous.thresholds.caution + 1),
                        },
                      }))
                    }
                  />
                </div>

                <div className="kg-quiet-block mt-4">
                  <Toggle
                    checked={preferences.quietHours.enabled}
                    onChange={(checked) =>
                      setPreferences((previous) => ({
                        ...previous,
                        quietHours: { ...previous.quietHours, enabled: checked },
                      }))
                    }
                    label="Overnight quiet hours"
                    detail="Hold non-emergency alerts and broadcast morning advisory at window open"
                    meta={
                      preferences.quietHours.enabled
                        ? `${preferences.quietHours.from}–${preferences.quietHours.to}`
                        : "off"
                    }
                  />
                </div>

                <div className="mt-4 p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-1.5">
                  <span className="font-bold text-stone-800 block">Amazon Polly SSML Prosody &amp; Volume</span>
                  <div className="flex justify-between text-stone-600">
                    <span>Speech Rate (Prosody):</span>
                    <strong className="text-stone-800">92% (Calibrated for regional vernacular clarity)</strong>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Breathing &amp; Pauses:</span>
                    <strong className="text-stone-800">&lt;amazon:auto-breaths&gt; enabled</strong>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Daily Dispatch Limit:</span>
                    <strong className="text-stone-800">Max 2 advisories/day (Anti-fatigue filter)</strong>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </RevealSection>
    </FeatureShell>
  )
}
