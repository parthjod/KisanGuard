import { CROPS, LOCATIONS } from "./mockData"
import { between, clamp, createRandom, round } from "./random"
import type {
  AlertChannel,
  AlertRecord,
  AuditEvent,
  CropId,
  LocationRecord,
  Severity,
  VerificationStatus,
} from "./types"

/**
 * Alert record generation, extracted so both the alerts service and the
 * preference-routing screen can show the same consistent alert history.
 */

const LANG_BY_STATE: Record<string, string> = {
  Maharashtra: "MR",
}

const TEMPLATES: {
  severity: Severity
  title: string
  titleLocal: string
  message: (values: {
    wbgt: number
    psi: number
    location: LocationRecord
    crop: string
  }) => string
  messageLocal: (values: { wbgt: number; location: LocationRecord }) => string
  recommendation: string
}[] = [
  {
    severity: "red",
    title: "Red alert: heat stress risk is high",
    titleLocal: "लाल चेतावनी: गर्मी का तनाव अधिक",
    message: ({ wbgt, psi, location, crop }) =>
      `WBGT at ${location.village}, ${location.district} is ${wbgt.toFixed(1)}°C with heat stress index ${psi}/100. ${crop} in the current flowering window can lose yield in this range.`,
    messageLocal: ({ wbgt, location }) =>
      `${location.village}, ${location.district} में WBGT ${wbgt.toFixed(1)}°C है। खेत का काम आज रोकें और शाम के समय सिंचाई करें।`,
    recommendation:
      "Stop field work. Irrigate in the evening window and move spraying to after 18:00.",
  },
  {
    severity: "red",
    title: "Red alert: irrigation window closing",
    titleLocal: "लाल चेतावनी: सिंचाई का समय बंद हो रहा है",
    message: ({ wbgt, location, crop }) =>
      `Only one safe ${crop} irrigation window left tonight at ${location.village}. Daytime WBGT of ${wbgt.toFixed(1)}°C will lose most of a midday application.`,
    messageLocal: ({ wbgt, location }) =>
      `${location.village} में आज रात सिंचाई का समय बाकी है। दोपहर WBGT ${wbgt.toFixed(1)}°C होगा, इसलिए सुबह जल्दी करें।`,
    recommendation: "Complete the recommended irrigation depth before 20:30.",
  },
  {
    severity: "caution",
    title: "Caution: heat rising above threshold",
    titleLocal: "सावधानी: गर्मी सीमा से ऊपर बढ़ रही है",
    message: ({ wbgt, psi, location }) =>
      `WBGT at ${location.village} is heading to ${wbgt.toFixed(1)}°C, heat stress index ${psi}/100. Moderate work is still possible with short breaks.`,
    messageLocal: ({ wbgt, location }) =>
      `${location.village} में WBGT ${wbgt.toFixed(1)}°C की ओर बढ़ रहा है। हर 30 मिनट आराम लें।`,
    recommendation:
      "Work in 30-minute blocks with shade breaks and carry drinking water.",
  },
  {
    severity: "caution",
    title: "Caution: soil moisture trending low",
    titleLocal: "सावधानी: मिट्टी में नमी कम हो रही है",
    message: ({ location, crop }) =>
      `Moisture in the root zone around ${location.village} has dropped below the refill point for ${crop}. Two more hot days without water will start leaf-area loss.`,
    messageLocal: ({ location }) =>
      `${location.village} में मिट्टी की नमी कम है। आज शाम को हल्की सिंचाई करें।`,
    recommendation: "Plan a light evening irrigation and mulch the inter-row.",
  },
  {
    severity: "safe",
    title: "Safe conditions confirmed",
    titleLocal: "सुरक्षित स्थिति की पुष्टि",
    message: ({ wbgt, location }) =>
      `WBGT at ${location.village} is ${wbgt.toFixed(1)}°C. Field work conditions are safe and soil moisture is in band.`,
    messageLocal: ({ wbgt, location }) =>
      `${location.village} में WBGT ${wbgt.toFixed(1)}°C है। खेत का काम सुरक्षित है।`,
    recommendation: "Good window for spraying and any pending field work.",
  },
]

const CHANNELS: AlertChannel[] = ["whatsapp", "web"]

export function buildAlertTimeline(
  random: () => number,
  createdAt: Date,
  severity: Severity,
  verification: VerificationStatus,
): AuditEvent[] {
  const events: AuditEvent[] = [
    {
      id: "raw",
      at: createdAt.toISOString(),
      actor: "system",
      label: "Sensor + satellite ingest",
      detail:
        "Hourly station observation fused with MODIS LST and ERA5 humidity for the field polygon.",
    },
    {
      id: "model",
      at: new Date(createdAt.getTime() + 90_000).toISOString(),
      actor: "ai-model",
      label: "KisanGuard risk model scored",
      detail: `WBGT derived, severity classified as ${severity}, recommendation ranked against available actions.`,
    },
  ]

  if (verification === "ai-verified") {
    events.push({
      id: "verify",
      at: new Date(createdAt.getTime() + 240_000).toISOString(),
      actor: "ai-model",
      label: "AI Cross-Check Confirmed (Model 3 & Bedrock Meta Llama 3)",
      detail: `Dual-model agreement tolerance passed (delta ${between(random, 0.1, 0.4).toFixed(1)}°C). Auto-cleared for immediate broadcast.`,
    })
  } else if (verification === "human-reviewed") {
    events.push({
      id: "verify",
      at: new Date(createdAt.getTime() + 3 * 3_600_000).toISOString(),
      actor: "field-officer",
      label: "Signed off by Block Agriculture Officer",
      detail:
        "Dr. S. K. Sharma (Senior Agromet Specialist & Block Officer) cross-verified local soil telemetry and cleared multi-channel dispatch.",
    })
  } else {
    events.push({
      id: "verify",
      at: new Date(createdAt.getTime() + 600_000).toISOString(),
      actor: "system",
      label: "Held in verification escrow",
      detail:
        "High thermal load threshold triggered. WhatsApp voice advisory queued pending field officer manual clearance.",
    })
  }

  events.push({
    id: "delivered",
    at: new Date(
      createdAt.getTime() + (verification === "pending" ? 900_000 : 420_000),
    ).toISOString(),
    actor: "system",
    label: "Dispatched via Amazon SNS & Polly Gateway",
    detail:
      "Delivered with regional DLT header (VK-KSNGRD) to subscriber devices in preferred regional language.",
  })

  if (random() > 0.45) {
    events.push({
      id: "ack",
      at: new Date(
        createdAt.getTime() + between(random, 1.5, 6, 1) * 3_600_000,
      ).toISOString(),
      actor: "farmer",
      label: "Acknowledged by subscriber",
      detail:
        "Farmer confirmed receipt and the advisory was marked as acted on.",
    })
  }

  return events.sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  )
}

export function buildAlerts(count = 14, activeLocation?: LocationRecord): AlertRecord[] {
  const now = new Date()
  const alerts: AlertRecord[] = []

  for (let index = 0; index < count; index += 1) {
    // When activeLocation is provided, the first 3 alerts reflect that exact farm
    const location = (index < 3 && activeLocation) ? activeLocation : LOCATIONS[index % LOCATIONS.length]
    const cropId = ([
      "sorghum",
      "maize",
      "wheat",
      "rice",
      "millet",
    ] as CropId[])[index % 5]
    const crop = CROPS[cropId]
    const random = createRandom(`alert-${index}-${location.id}`)
    const severity: Severity =
      index < 3 ? "red" : index < 8 ? "caution" : "safe"
    const template =
      TEMPLATES.find((item) => item.severity === severity) ?? TEMPLATES[0]
    const wbgt = round(
      severity === "red"
        ? between(random, 33.5, 38)
        : severity === "caution"
          ? between(random, 28.5, 33)
          : between(random, 23, 28),
      1,
    )
    const psi = Math.round(clamp((wbgt - 18) * 5.6, 0, 100))
    const humidity = round(between(random, 28, 88), 0)
    const temperature = round(wbgt - ((humidity - 40) / 100) * 3.2, 1)
    const verification: VerificationStatus =
      index < 4 ? "human-reviewed" : index < 11 ? "ai-verified" : "pending"
    const confidence = Math.round(
      clamp(
        95 -
          index * 1.6 -
          (verification === "pending" ? 12 : 0) +
          between(random, -3, 3),
        58,
        97,
      ),
    )
    const channel = CHANNELS[index % CHANNELS.length]
    const language = LANG_BY_STATE[location.state] ?? "EN"
    const createdAt = new Date(
      now.getTime() - (index * between(random, 3, 9, 1) + 1) * 3_600_000,
    )
    const audienceCount = Math.round(between(random, 120, 4200, 0))
    const acknowledgedCount = Math.round(
      audienceCount * between(random, 0.42, 0.93),
    )

    alerts.push({
      id: `ALT-${2400 - index}`,
      severity,
      title: template.title,
      titleLocal: template.titleLocal,
      message: template.message({ wbgt, psi, location, crop: crop.name }),
      messageLocal: template.messageLocal({ wbgt, location }),
      createdAt: createdAt.toISOString(),
      location,
      wbgt,
      psi,
      temperature,
      humidity,
      confidence,
      verification,
      channel,
      language,
      audienceCount,
      acknowledgedCount,
      recommendation: template.recommendation,
      crop: cropId,
      timeline: buildAlertTimeline(random, createdAt, severity, verification),
    })
  }

  return alerts
}
