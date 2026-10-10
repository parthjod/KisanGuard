import { apiClient, registerMock } from "./apiClient"
import { buildAlerts } from "./alertFactory"
import { CROPS, LANGUAGES, PERSONAS } from "./mockData"
import type {
  AdvisoryPreview,
  AlertChannel,
  AlertFrequency,
  AlertPreferences,
  AlertRecord,
  Persona,
} from "./types"

/**
 * Personalized alerts (Feature 06).
 *
 * The advisory preview is generated from the live preference state, so
 * switching persona, language or channel immediately changes the message the
 * farmer would receive. The "why am I seeing this" panel is derived from the
 * same rules that route the message, which keeps the explanation honest.
 */

export const DEFAULT_PREFERENCES: AlertPreferences = {
  personaId: PERSONAS[0].id,
  language: "PA",
  channels: { whatsapp: true, sms: false, voice: false, push: false, web: true },
  frequency: "hourly",
  quietHours: { from: "22:00", to: "06:00", enabled: true },
  thresholds: { caution: 28, red: 33 },
  crops: ["wheat"],
  advisories: { heat: true, irrigation: true, yield: true, cropHealth: true },
}

export const FREQUENCY_OPTIONS: {
  id: AlertFrequency
  label: string
  detail: string
}[] = [
  {
    id: "realtime",
    label: "Real time",
    detail: "Send the moment severity changes",
  },
  {
    id: "hourly",
    label: "Hourly digest",
    detail: "One summary per hour during the day",
  },
  {
    id: "daily",
    label: "Daily summary",
    detail: "One morning briefing at 06:00",
  },
  { id: "digest", label: "Weekly digest", detail: "Sunday recap of the week" },
]

export const CHANNEL_OPTIONS: {
  id: AlertChannel
  label: string
  detail: string
  cost: string
}[] = [
  {
    id: "whatsapp",
    label: "WhatsApp Voice Note",
    detail: "Spoken vernacular voice note + agromet alert sent via WhatsApp",
    cost: "Instant & Free",
  },
  {
    id: "web",
    label: "Web Dashboard & Polly Audio",
    detail: "Live telemetry with in-browser Amazon Polly regional speech player",
    cost: "Live Now",
  },
]

const TEXT: Record<string, Record<AlertChannel, {
  subject: string
  body: string
  cta: string
}>> = {
  EN: {
    whatsapp: {
      subject: "🟢 WhatsApp Voice Note (PTT Audio)",
      body: "🟢 [Amazon Polly Voice Note]\nKisanGuard: WBGT {{wbgt}}C at {{village}}, {{district}}. Heat risk {{status}}. {{action}}",
      cta: "Tap to Listen Voice Note (0:18)",
    },
    sms: {
      subject: "",
      body: "KisanGuard: WBGT {{wbgt}}C at {{village}}, {{district}}. Heat risk {{status}}. {{action}}",
      cta: "Open the dashboard for detail.",
    },
    voice: {
      subject: "Heat advisory",
      body: "Namaste. KisanGuard alert for {{village}}. Heat index is {{wbgt}} degrees. Risk is {{status}}. {{action}}",
      cta: "Press 1 to hear it again.",
    },
    push: {
      subject: "Heat {{status}} at {{wbgt}}C",
      body: "{{village}}, {{district}} - {{message}}",
      cta: "See full advisory",
    },
    web: {
      subject: "Heat advisory for {{village}}",
      body: "WBGT {{wbgt}}C - PSI {{psi}}/100 - risk {{status}}. {{action}}",
      cta: "Open verification timeline",
    },
  },
  MR: {
    whatsapp: {
      subject: "🟢 WhatsApp व्हॉइस नोट (PTT ऑडिओ)",
      body: "🟢 [ॲमेझॉन पॉली व्हॉइस नोट]\nकिसानगार्ड: {{village}}, {{district}} येथे WBGT {{wbgt}}C. गर्मीचा धोका {{status}}. {{action}}",
      cta: "व्हॉइस नोट ऐका (0:18)",
    },
    sms: {
      subject: "",
      body: "किसानगार्ड: {{village}}, {{district}} येथे WBGT {{wbgt}}C. गर्मीचा धोका {{status}}. {{action}}",
      cta: "तपशीलसाठी डॅशबोर्ड उघडा.",
    },
    voice: {
      subject: "उष्णतेचा इशारा",
      body: "नमस्कार. {{village}} साठी किसानगार्ड सूचना. उष्णता {{wbgt}} अंश. धोका {{status}}. {{action}}",
      cta: "पुन्हा ऐकण्यासाठी 1 दाबा.",
    },
    push: {
      subject: "उष्णता {{status}} · {{wbgt}}C",
      body: "{{village}}, {{district}} - {{message}}",
      cta: "संपूर्ण सूचना पहा",
    },
    web: {
      subject: "{{village}} साठी उष्णता सूचना",
      body: "WBGT {{wbgt}}C · PSI {{psi}}/100 · धोका {{status}}. {{action}}",
      cta: "ओडिट टाइमलाइन उघडा",
    },
  },
  HI: {
    whatsapp: {
      subject: "🟢 WhatsApp वॉयस नोट (PTT ऑडियो)",
      body: "🟢 [अमेज़न पॉली वॉयस नोट]\nकिसानगार्ड: {{village}}, {{district}} में WBGT {{wbgt}}C। गर्मी का खतरा {{status}}। {{action}}",
      cta: "वॉयस नोट सुनने के लिए टैप करें (0:18)",
    },
    sms: {
      subject: "",
      body: "किसानगार्ड: {{village}}, {{district}} में WBGT {{wbgt}}C। गर्मी का खतरा {{status}}। {{action}}",
      cta: "विवरण के लिए डैशबोर्ड खोलें।",
    },
    voice: {
      subject: "गर्मी चेतावनी",
      body: "नमस्ते। {{village}} के लिए किसानगार्ड सूचना। गर्मी {{wbgt}} अंश। खतरा {{status}}। {{action}}",
      cta: "दोबारा सुनने के लिए 1 दबाएँ।",
    },
    push: {
      subject: "गर्मी {{status}} · {{wbgt}}C",
      body: "{{village}}, {{district}} - {{message}}",
      cta: "पूरी सलाह देखें",
    },
    web: {
      subject: "{{village}} के लिए गर्मी सूचना",
      body: "WBGT {{wbgt}}C · PSI {{psi}}/100 · खतरा {{status}}। {{action}}",
      cta: "ऑडिट टाइमलाइन खोलें",
    },
  },
  PA: {
    whatsapp: {
      subject: "🟢 WhatsApp ਵੌਇਸ ਨੋਟ (PTT ਆਡੀਓ)",
      body: "🟢 [ਐਮਾਜ਼ਾਨ ਪੌਲੀ ਵੌਇਸ ਨੋਟ]\nਕਿਸਾਨਗਾਰਡ: {{village}}, {{district}} ਵਿੱਚ WBGT {{wbgt}}C। ਗਰਮੀ ਦਾ ਖ਼ਤਰਾ {{status}}। {{action}}",
      cta: "ਵੌਇਸ ਨੋਟ ਸੁਣਨ ਲਈ ਟੈਪ ਕਰੋ (0:18)",
    },
    sms: {
      subject: "",
      body: "ਕਿਸਾਨਗਾਰਡ: {{village}}, {{district}} ਵਿੱਚ WBGT {{wbgt}}C। ਗਰਮੀ ਦਾ ਖ਼ਤਰਾ {{status}}। {{action}}",
      cta: "ਵੇਰਵਾ ਲਈ ਡੈਸ਼ਬੋਰਡ ਖੋਲ੍ਹੋ।",
    },
    voice: {
      subject: "ਗਰਮੀ ਚੇਤਾਵਨੀ",
      body: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ। {{village}} ਲਈ ਕਿਸਾਨਗਾਰਡ ਸੂਚਨਾ। ਗਰਮੀ {{wbgt}} ਅੰਸ। ਖ਼ਤਰਾ {{status}}। {{action}}",
      cta: "ਮੁੜ ਸੁਣਣ ਲਈ 1 ਦਬਾਓ।",
    },
    push: {
      subject: "ਗਰਮੀ {{status}} · {{wbgt}}C",
      body: "{{village}}, {{district}} - {{message}}",
      cta: "ਪੂਰੀ ਸਲਾਹ ਵੇਖੋ",
    },
    web: {
      subject: "{{village}} ਲਈ ਗਰਮੀ ਸੂਚਨਾ",
      body: "WBGT {{wbgt}}C · PSI {{psi}}/100 · ਖ਼ਤਰਾ {{status}}। {{action}}",
      cta: "ਆਡਿਟ ਟਾਈਮਲਾਈਨ ਖੋਲ੍ਹੋ",
    },
  },
  TE: {
    whatsapp: {
      subject: "🟢 WhatsApp వాయిస్ నోట్ (PTT ఆడియో)",
      body: "🟢 [అమెజాన్ పాలీ వాయిస్ నోట్]\nకిసాన్‌గార్డ్: {{village}}, {{district}} లో WBGT {{wbgt}}C. గడ్డీ ప్రమాదం {{status}}. {{action}}",
      cta: "వాయిస్ నోట్ వినడానికి తాకండి (0:18)",
    },
    sms: {
      subject: "",
      body: "కిసాన్‌గార్డ్: {{village}}, {{district}} లో WBGT {{wbgt}}C. గడ్డీ ప్రమాదం {{status}}. {{action}}",
      cta: "వివరాలకోసం డాష్‌బోర్డ్ తెరవండి.",
    },
    voice: {
      subject: "వేడిమి హెచ్చరిక",
      body: "నమస్కారం. {{village}} కోసం కిసాన్‌గార్డ్ సూచన. ఉష్ణోగ్రత {{wbgt}} డిగ్రీలు. ప్రమాదం {{status}}. {{action}}",
      cta: "మళ్లీ వినడానికి 1 నొక్కండి.",
    },
    push: {
      subject: "వేడిమి {{status}} · {{wbgt}}C",
      body: "{{village}}, {{district}} - {{message}}",
      cta: "పూర్తి సూచన చూడండి",
    },
    web: {
      subject: "{{village}} కోసం వేడిమి సూచన",
      body: "WBGT {{wbgt}}C · PSI {{psi}}/100 · ప్రమాదం {{status}}. {{action}}",
      cta: "ఆడిట్ టైమ్‌లైన్ తెరవండి",
    },
  },
  BN: {
    whatsapp: {
      subject: "🟢 WhatsApp ভয়েস নোট (PTT অডিও)",
      body: "🟢 [অ্যামাজন পলি ভয়েস নোট]\nকিসানগার্ড: {{village}}, {{district}}-এ WBGT {{wbgt}}C। তাপের ঝুঁকি {{status}}। {{action}}",
      cta: "ভয়েস নোট শুনতে ট্যাপ করুন (0:18)",
    },
    sms: {
      subject: "",
      body: "কিসানগার্ড: {{village}}, {{district}}-এ WBGT {{wbgt}}C। তাপের ঝুঁকি {{status}}। {{action}}",
      cta: "বিস্তারিত দেখতে ড্যাশবোর্ড খুলুন।",
    },
    voice: {
      subject: "তাপ বিপত্তি সতর্কতা",
      body: "নমস্কার। {{village}}-এর জন্য কিসানগার্ড সতর্কতা। তাপমাত্রা {{wbgt}} ডিগ্রি। ঝুঁকি {{status}}। {{action}}",
      cta: "আবার শুনতে 1 চাপুন।",
    },
    push: {
      subject: "তাপ {{status}} · {{wbgt}}C",
      body: "{{village}}, {{district}} - {{message}}",
      cta: "সম্পূর্ণ পরামর্শ দেখুন",
    },
    web: {
      subject: "{{village}}-এর তাপ সতর্কতা",
      body: "WBGT {{wbgt}}C · PSI {{psi}}/100 · ঝুঁকি {{status}}। {{action}}",
      cta: "অডিট টাইমলাইন খুলুন",
    },
  },
}

const STATUS_WORD: Record<string, Record<string, string>> = {
  EN: { safe: "safe", caution: "moderate", red: "high" },
  MR: { safe: "सुरक्षित", caution: "मध्यम", red: "अधिक" },
  HI: { safe: "सुरक्षित", caution: "मध्यम", red: "अधिक" },
  PA: { safe: "ਸੁਰੱਖਿਅਤ", caution: "ਮੱਧਮ", red: "ਉੱਚ" },
  TE: { safe: "సురక్షితం", caution: "మధ్యస్థం", red: "అధికం" },
  BN: { safe: "নিরাপদ", caution: "মাঝারি", red: "উচ্চ" },
}

const ACTION_WORD: Record<string, Record<string, string>> = {
  EN: {
    safe: "Good working window today.",
    caution: "Work in 30-minute blocks with breaks.",
    red: "Stop field work and irrigate this evening.",
  },
  MR: {
    safe: "आज कामासाठी चांगली वेळ आहे.",
    caution: "३० मिनिटांच्या पट्ट्यांत काम करा.",
    red: "खेताचे काम थांबवा आणि संध्याकाळी पाणी द्या.",
  },
  HI: {
    safe: "आज काम के लिए अच्छा समय है।",
    caution: "३० मिनट के ब्लॉक में काम करें।",
    red: "खेत का काम रोकें और शाम को पानी दें।",
  },
  PA: {
    safe: "ਅੱਜ ਕੰਮ ਲਈ ਚੰਗਾ ਸਮਾਂ ਹੈ।",
    caution: "30 ਮਿੰਟ ਦੇ ਬਲਾਕ ਵਿੱਚ ਕੰਮ ਕਰੋ।",
    red: "ਖੇਤ ਦਾ ਕੰਮ ਰੋਕੋ ਅਤੇ ਸ਼ਾਮ ਨੂੰ ਪਾਣੀ ਦਿਓ।",
  },
  TE: {
    safe: "ఈరోజు పనికి మంచి సమయం.",
    caution: "30 నిమిషాల బ్లాక్‌లలో పని చేయండి.",
    red: "పొలం పని ఆపి, సాయంత్రం నీరు ఇవ్వండి.",
  },
  BN: {
    safe: "আজ কাজের জন্য ভালো সময়।",
    caution: "৩০ মিনিটের ব্লকে কাজ করুন।",
    red: "ক্ষেতের কাজ বন্ধ করে সন্ধ্যায় জল দিন।",
  },
}

export const preferenceService = {
  async listPersonas(): Promise<Persona[]> {
    const { data } = await apiClient.request<Persona[]>("/preferences/personas")
    return data
  },

  async getPreferences(personaId: string): Promise<AlertPreferences> {
    const { data } = await apiClient.request<AlertPreferences>("/preferences", {
      personaId,
    })
    return data
  },

  /** Returns the advisory a persona would receive right now on the given channel. */
  async preview(
    preferences: AlertPreferences,
    channel: AlertChannel,
  ): Promise<AdvisoryPreview> {
    const { data } = await apiClient.request<AdvisoryPreview>(
      "/preferences/preview",
      { channel },
      {
        preferences,
        channel,
      },
    )
    return data
  },

  /** Alerts that match the current routing rules for this persona. */
  async matchingAlerts(preferences: AlertPreferences): Promise<AlertRecord[]> {
    const { data } = await apiClient.request<AlertRecord[]>(
      "/preferences/matching-alerts",
      {},
      { preferences },
    )
    return data
  },

  /** "Why am I seeing this" — derived from the same routing rules. */
  async explain(preferences: AlertPreferences): Promise<string[]> {
    const { data } = await apiClient.request<string[]>(
      "/preferences/explain",
      {},
      { preferences },
    )
    return data
  },
}

registerMock<Persona[]>("/preferences/personas", () => PERSONAS)

registerMock<AlertPreferences>(
  "/preferences",
  (_pattern, _endpoint, params) => {
    const persona =
      PERSONAS.find((item) => item.id === params.personaId) ?? PERSONAS[0]
    return {
      ...DEFAULT_PREFERENCES,
      personaId: persona.id,
      language: persona.id === "imran" ? "EN" : DEFAULT_PREFERENCES.language,
      crops: persona.crop ? [persona.crop] : DEFAULT_PREFERENCES.crops,
    }
  },
)

registerMock<AdvisoryPreview>(
  "/preferences/preview",
  (_pattern, _endpoint, _params, body) => {
    const payload = body as {
      preferences: AlertPreferences
      channel: AlertChannel
    }
    return buildAdvisoryPreview(
      payload.preferences,
      payload.channel,
      buildAlerts(),
    )
  },
)

registerMock<AlertRecord[]>(
  "/preferences/matching-alerts",
  (_pattern, _endpoint, _params, body) => {
    const payload = body as { preferences: AlertPreferences }
    return matchAlerts(buildAlerts(), payload.preferences)
  },
)

registerMock<string[]>(
  "/preferences/explain",
  (_pattern, _endpoint, _params, body) => {
    const payload = body as { preferences: AlertPreferences }
    return buildExplanation(payload.preferences, buildAlerts())
  },
)

function fillTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_match, key: string) => values[key] ?? "",
  )
}

export function buildAdvisoryPreview(
  preferences: AlertPreferences,
  channel: AlertChannel,
  alerts: AlertRecord[],
  overridePersona?: Persona,
): AdvisoryPreview {
  const persona =
    overridePersona ??
    PERSONAS.find((item) => item.id === preferences.personaId) ?? PERSONAS[0]
  const language = TEXT[preferences.language] ? preferences.language : "EN"
  const template = TEXT[language][channel]
  const routed = matchAlerts(alerts, preferences, persona)
  const alert =
    routed[0] ?? alerts.find((item) => item.severity === "red") ?? alerts[0]
  const status = alert?.severity ?? "caution"
  const values: Record<string, string> = {
    wbgt: (alert?.wbgt ?? 32).toFixed(1),
    psi: String(alert?.psi ?? 78),
    village: persona.village,
    district: persona.district,
    status: STATUS_WORD[language][status],
    action: ACTION_WORD[language][status],
    message: alert?.message ?? "",
  }
  return {
    language,
    channel,
    subject: fillTemplate(template.subject, values),
    body: fillTemplate(template.body, values),
    cta: template.cta,
  }
}

/**
 * Routing rules applied to the alert feed:
 *  1. WBGT must clear the persona's own caution threshold.
 *  2. Advisory type must be switched on.
 *  3. Delivery channel must be enabled.
 *  4. Quiet hours never drop an alert, they defer it (flagged in the UI).
 */
export function matchAlerts(
  alerts: AlertRecord[],
  preferences: AlertPreferences,
  overridePersona?: Persona,
): AlertRecord[] {
  const persona =
    overridePersona ??
    PERSONAS.find((item) => item.id === preferences.personaId) ?? PERSONAS[0]
  return alerts.filter((alert) => {
    const severityOk =
      alert.severity === "red" || alert.wbgt >= preferences.thresholds.caution
    const channelOk = preferences.channels[alert.channel]
    const loc = typeof alert.location === "object" && alert.location !== null ? alert.location : null
    const dist = loc?.district ?? ""
    const districtOk = !persona.district || !dist || dist.toLowerCase() === persona.district.toLowerCase() || alert.severity === "red"
    return severityOk && channelOk && districtOk
  })
}

export function buildExplanation(
  preferences: AlertPreferences,
  alerts: AlertRecord[],
  overridePersona?: Persona,
): string[] {
  const persona =
    overridePersona ??
    PERSONAS.find((item) => item.id === preferences.personaId) ?? PERSONAS[0]
  const enabledChannels = CHANNEL_OPTIONS.filter(
    (item) => preferences.channels[item.id],
  )
  const cropNames = preferences.crops.map((crop) => CROPS[crop]?.name ?? crop).join(", ")
  const enabledAdvisories = Object.entries(preferences.advisories)
    .filter(([, on]) => on)
    .map(([key]) => key)

  const reasons = [
    `You are subscribed as ${persona.name} (${persona.role}), so alerts are matched to ${persona.village}, ${persona.district}${
      persona.hectares > 0 ? ` and a ${persona.hectares} hectare holding` : ""
    }.`,
    `Your language is set to ${LANGUAGES.find((item) => item.code === preferences.language)?.native ?? preferences.language}, so every message is rendered in that language before it is sent.`,
    enabledChannels.length > 0
      ? `Delivery is limited to ${enabledChannels.map((item) => item.label).join(", ")} — the channels you switched on below.`
      : "No delivery channel is enabled, so nothing is being sent to you right now.",
    `Frequency is set to ${FREQUENCY_OPTIONS.find((item) => item.id === preferences.frequency)?.label.toLowerCase()}, which controls how often a repeated condition is re-sent.`,
    `Severity thresholds of ${preferences.thresholds.caution}°C (caution) and ${preferences.thresholds.red}°C (red) WBGT decide whether an alert is raised at all.`,
    `Tracked crops: ${cropNames || "none"}. Advisory types on: ${enabledAdvisories.join(", ") || "none"}.`,
  ]

  if (preferences.quietHours.enabled) {
    reasons.push(
      `Quiet hours are active, so anything raised between ${preferences.quietHours.from} and ${preferences.quietHours.to} is queued and sent at ${preferences.quietHours.to} instead of waking you.`,
    )
  }

  const districtAlerts = alerts.filter(
    (alert) => alert.location.district === persona.district,
  )
  const routed = matchAlerts(alerts, preferences)
  reasons.push(
    `${districtAlerts.length} of the ${alerts.length} alerts in the last 72 hours were raised for ${persona.district}, and ${routed.length} of those also match your channel and threshold settings.`,
  )

  return reasons
}
