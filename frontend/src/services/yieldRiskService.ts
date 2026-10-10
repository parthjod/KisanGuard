import { apiClient, registerMock } from "./apiClient"
import { CROPS, LOCATIONS } from "./mockData"
import { between, clamp, createRandom, formatDay, round } from "./random"
import type {
  ComparisonPoint,
  CropHealthSnapshot,
  CropId,
  CropStage,
  Severity,
  YieldForecast,
  YieldForecastPoint,
  YieldRiskZone,
} from "./types"

/**
 * 14-day yield risk forecast (Feature 03).
 *
 * The probability series starts from the current CDHI and walks a 14-day
 * weather ensemble proxy. The "with action" series applies the loss avoidance
 * of the recommended action so the before/after comparison is an honest
 * simulation rather than a hardcoded constant.
 */

const ACTION_LIBRARY = [
  {
    id: "irrigate-now",
    title: "Irrigate within the evening window",
    window: "Today, 18:30 – 20:30",
    detail:
      "Apply the recommended depth now to pull soil moisture back into the safe band before the next heat peak.",
    bullets: [
      "Run the recommended depth across the whole block, not spot patches.",
      "Avoid midday irrigation — evaporation loss rises sharply above 30°C WBGT.",
      "Recheck the Crop Health screen after 48 hours for CDHI movement.",
    ],
    severity: "caution" as Severity,
  },
  {
    id: "shift-work",
    title: "Shift field work to the cool window",
    window: "Today, 05:30 – 08:00",
    detail:
      "Move spraying, weeding and lifting into the safe window to protect both the crop and the crew.",
    bullets: [
      "Complete all spraying before 08:00 to avoid droplet evaporation drift.",
      "Brief the crew on the WBGT limits before they start.",
      "Log completion so the next forecast can weight your field as protected.",
    ],
    severity: "caution" as Severity,
  },
  {
    id: "spray-skip",
    title: "Hold off on spraying and spray late",
    window: "After 17:00, next 2 days",
    detail:
      "Spray during a high-WBGT window causes immediate crop injury and evaporates product before uptake.",
    bullets: [
      "Postpone fungicide and herbicide applications.",
      "If spraying is unavoidable, use a low-VOC formulation and add a sticker.",
      "Re-check WBGT on the Heat Risk screen before resuming.",
    ],
    severity: "red" as Severity,
  },
  {
    id: "mulch",
    title: "Mulch and reduce irrigation frequency",
    window: "Next 3 days",
    detail:
      "Soil surface cover cuts evaporation and holds the moisture you already have.",
    bullets: [
      "Apply 4–5 t/acre of straw or residue mulch on the inter-row.",
      "Lengthen the irrigation interval instead of increasing depth.",
      "Watch for white crust on leaves as a heat-burn indicator.",
    ],
    severity: "safe" as Severity,
  },
]

export const yieldRiskService = {
  async getForecast(
    locationId: string,
    crop: CropId,
    stage: CropStage,
    health: CropHealthSnapshot,
    lat?: number,
    lng?: number,
  ): Promise<YieldForecast> {
    const { data } = await apiClient.request<YieldForecast>("/yield/forecast", {
      locationId,
      crop,
      stage,
      lat: lat !== undefined ? String(lat) : undefined,
      lng: lng !== undefined ? String(lng) : undefined,
    })
    return data
  },
}

function buildForecast(
  locationId: string,
  crop: CropId,
  stage: CropStage,
  health: CropHealthSnapshot,
  lat?: number,
  lng?: number,
): YieldForecast {
  const definition = CROPS[crop]
  const location =
    LOCATIONS.find((item) => item.id === locationId) ??
    (lat !== undefined && lng !== undefined
      ? {
          id: locationId,
          village: locationId.replace(/^(pin|geo|nat|custom)-/, "").replace(/-/g, " "),
          district: lat > 28 ? "Northern Plains" : "Deccan Central",
          state: lat > 28 ? "Punjab" : "Maharashtra",
          pincode: locationId.startsWith("pin-") ? locationId.replace("pin-", "") : "—",
          lat,
          lng,
          acres: 4.5,
          soilType: (lat > 28 ? "alluvial" : "medium-black") as const,
        }
      : LOCATIONS[0])
  const seed = `yield-${location.id}-${crop}-${stage}-${lat ?? 0}-${lng ?? 0}`
  const random = createRandom(seed)
  const now = new Date()

  const currentLossProbability = Math.round(
    clamp(health.cdhi * 0.62 + 12, 4, 88),
  )
  const action =
    ACTION_LIBRARY.find(
      (item) => item.id === pickActionId(currentLossProbability, stage),
    ) ?? ACTION_LIBRARY[3]
  const avoidance = round(
    clamp(8 + (currentLossProbability / 100) * 26, 6, 34),
    0,
  )

  const series: YieldForecastPoint[] = Array.from({ length: 14 }, (_, day) => {
    const dayRandom = createRandom(`${seed}-day${day}`)
    const walk =
      currentLossProbability +
      day * between(dayRandom, 0.9, 2.6) +
      between(dayRandom, -3.5, 3.5)
    const probability = Math.round(clamp(walk, 2, 95))
    const spread = between(dayRandom, 3, 7)
    return {
      day,
      date: formatDay(now, day),
      probability,
      withActionProbability: Math.round(clamp(probability - avoidance, 1, 92)),
      band: {
        low: Math.round(clamp(probability - spread, 0, 100)),
        high: Math.round(clamp(probability + spread, 0, 100)),
      },
      severity: riskFromProbability(probability),
    }
  })

  const projectedLossProbability = series[series.length - 1].probability

  const zones: YieldRiskZone[] = [
    {
      id: "thermal",
      label: "Thermal stress zone",
      probability: Math.round(
        clamp(projectedLossProbability * 0.82 + 6, 3, 96),
      ),
      severity: riskFromProbability(
        clamp(projectedLossProbability * 0.82 + 6, 0, 100),
      ),
      cropImpact: `${definition.name} at ${stage.replace("-", " ")} loses grain weight for every day above ${definition.thresholds.tmaxCaution}°C air temperature.`,
      drivers: [
        `WBGT trend above ${definition.thresholds.wbgtCaution}°C`,
        "Night-time cooling below 24°C",
        "Canopy temperature +4°C over air",
      ],
    },
    {
      id: "water",
      label: "Water availability zone",
      probability: Math.round(clamp(health.cdhi * 0.55 + 8, 3, 94)),
      severity: riskFromProbability(clamp(health.cdhi * 0.55 + 8, 0, 100)),
      cropImpact: `Root zone at ${health.soilMoisturePercent}% — ${
        health.soilMoistureAnomaly < 0 ? "below" : "above"
      } the seasonal normal for this profile.`,
      drivers: [
        `SPI ${health.spi}`,
        `Soil moisture anomaly ${
          health.soilMoistureAnomaly > 0 ? "+" : ""
        }${health.soilMoistureAnomaly}%`,
        `HSD ${health.hsi}`,
      ],
    },
    {
      id: "stage",
      label: "Stage exposure zone",
      probability: Math.round(clamp(health.cdhi * 0.7 + 4, 3, 94)),
      severity: riskFromProbability(clamp(health.cdhi * 0.7 + 4, 0, 100)),
      cropImpact:
        stage === "flowering"
          ? "Flowering exposure dominates the forecast — pollen viability is the single largest loss channel right now."
          : stage === "grain-fill"
            ? "Grain-fill exposure — canopy area lost now directly reduces grain weight."
            : "Vegetative stage can partially recover, so the forecast is weighted by current canopy condition.",
      drivers: [
        `Stage ${stage.replace("-", " ")}`,
        `CDHI ${health.cdhi}`,
        `NDVI ${health.ndvi}`,
      ],
    },
  ]

  const withoutAction: ComparisonPoint[] = [
    {
      label: "Today",
      without: currentLossProbability,
      with: Math.round(
        clamp(currentLossProbability - avoidance * 0.25, 0, 100),
      ),
    },
    {
      label: "+3 days",
      without: Math.round(clamp(currentLossProbability + 5, 0, 100)),
      with: Math.round(clamp(currentLossProbability - avoidance * 0.5, 0, 100)),
    },
    {
      label: "+7 days",
      without: Math.round(clamp(currentLossProbability + 13, 0, 100)),
      with: Math.round(
        clamp(currentLossProbability - avoidance * 0.75, 0, 100),
      ),
    },
    {
      label: "+14 days",
      without: projectedLossProbability,
      with: series[series.length - 1].withActionProbability,
    },
  ]

  // The action path is the same checkpoint list, read from the `with` column.
  const withAction: ComparisonPoint[] = withoutAction.map((point) => ({
    label: point.label,
    without: point.with,
    with: point.with,
  }))

  return {
    locationId: location.id,
    crop,
    stage,
    generatedAt: now.toISOString(),
    currentLossProbability,
    projectedLossProbability,
    horizonDays: 14,
    series,
    zones,
    withoutAction,
    withAction,
    action: { ...action, expectedLossAvoidancePct: avoidance },
    confidence: Math.round(clamp(88 - health.cdhi * 0.14, 55, 96)),
  }
}

function pickActionId(probability: number, stage: CropStage): string {
  if (probability >= 62)
    return stage === "vegetative" ? "irrigate-now" : "spray-skip"
  if (probability >= 40) return "irrigate-now"
  if (probability >= 22) return "shift-work"
  return "mulch"
}

function riskFromProbability(probability: number): Severity {
  if (probability >= 60) return "red"
  if (probability >= 32) return "caution"
  return "safe"
}

registerMock<YieldForecast>(
  "/yield/forecast",
  async (_pattern, _endpoint, params) => {
    const locationId = params.locationId ?? "nashik"
    const crop = params.crop as CropId ?? "sorghum"
    const stage = params.stage as CropStage ?? "flowering"
    const lat = params.lat !== undefined ? Number(params.lat) : undefined
    const lng = params.lng !== undefined ? Number(params.lng) : undefined
    // reuse the crop health snapshot so the forecast and the CDHI screen agree
    const { cropService } = await import("./cropService")
    const health = await cropService.getSnapshot(locationId, crop, stage, lat, lng)
    return buildForecast(locationId, crop, stage, health, lat, lng)
  },
)
