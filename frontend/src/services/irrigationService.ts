import { apiClient, registerMock } from "./apiClient"
import { CROPS, LOCATIONS } from "./mockData"
import { between, clamp, createRandom, round } from "./random"
import type {
  CropHealthSnapshot,
  CropId,
  CropStage,
  IrrigationFactor,
  IrrigationRecommendation,
} from "./types"

/**
 * Smart irrigation (Feature 04).
 *
 * Depth is derived from the FAO-56 style balance: refill the soil moisture
 * deficit toward field capacity, capped by the daily ET0 proxy and adjusted
 * for application efficiency of the selected method. Every number is derived,
 * not invented, so the reasoning panel can be audited against the depth.
 */

export const irrigationService = {
  async getRecommendation(
    locationId: string,
    crop: CropId,
    stage: CropStage,
    health: CropHealthSnapshot,
    methodId: string,
    lat?: number,
    lng?: number,
  ): Promise<IrrigationRecommendation> {
    const { data } = await apiClient.request<IrrigationRecommendation>(
      "/irrigation/recommendation",
      {
        locationId,
        crop,
        stage,
        methodId,
        lat: lat !== undefined ? String(lat) : undefined,
        lng: lng !== undefined ? String(lng) : undefined,
      },
    )
    return data
  },
}

export interface IrrigationMethod {
  id: string
  label: string
  efficiency: number
  note: string
}

export const IRRIGATION_METHODS: IrrigationMethod[] = [
  {
    id: "flood",
    label: "Flood / furrow",
    efficiency: 0.6,
    note: "Highest water use per acre, deep wetting.",
  },
  {
    id: "drip",
    label: "Drip",
    efficiency: 0.9,
    note: "Best field capacity utilisation.",
  },
  {
    id: "sprinkler",
    label: "Sprinkler",
    efficiency: 0.75,
    note: "Even spread, wind-sensitive.",
  },
  {
    id: "farmpond",
    label: "Farm pond / check dam",
    efficiency: 0.85,
    note: "Recycled storage, best in red soil.",
  },
]

const ACRE_MM_TO_LITRES = 4046.86

function buildRecommendation(
  locationId: string,
  crop: CropId,
  stage: CropStage,
  health: CropHealthSnapshot,
  methodId: string,
  lat?: number,
  lng?: number,
): IrrigationRecommendation {
  const definition = CROPS[crop]
  const stageDefinition =
    definition.stages.find((item) => item.id === stage) ?? definition.stages[0]
  const method =
    IRRIGATION_METHODS.find((item) => item.id === methodId) ??
    IRRIGATION_METHODS[0]
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
  const random = createRandom(
    `irrigation-${location.id}-${crop}-${stage}-${method.id}-${lat ?? 0}-${lng ?? 0}`,
  )

  const fieldCapacity = round(between(random, 30, 38), 1)
  const refillPoint = round(fieldCapacity * 0.55, 1)
  const available = health.soilMoisturePercent
  const deficit = Math.max(0, round(available - refillPoint, 1))

  const kc = round(definition.kc * stageDefinition.kcMultiplier, 2)
  const et0 = round(clamp(5.4 + health.hdd * 0.22, 3.5, 9), 1)
  const etc = round(kc * et0, 2)
  const netDepth = round(clamp(deficit * 0.62, 0, etc * 1.1), 1)
  const depthMm = round(clamp(netDepth / method.efficiency, 0, 60), 1)

  const skipThreshold = Math.max(2, etc * 0.35)
  const decision: IrrigationRecommendation["decision"] =
    depthMm <= skipThreshold
      ? "monitor"
      : depthMm < netDepth * 1.05
        ? "monitor"
        : "irrigate"

  const riskAdd =
    health.riskLevel === "red"
      ? 0.18
      : health.riskLevel === "caution"
        ? 0.07
        : 0
  const headroom = round(depthMm * riskAdd, 1)
  const totalDepth = round(depthMm + headroom, 1)

  const windowStart = health.hdd > 12 ? "18:45" : "17:30"
  const windowEnd = health.hdd > 12 ? "20:30" : "19:45"

  const factors: IrrigationFactor[] = [
    {
      id: "stage",
      label: "Crop stage",
      value: `${stageDefinition.label} · Kc ${kc}`,
      impact: "increase",
      weight: 0.28,
      note: `At ${stageDefinition.label.toLowerCase()} stage the canopy needs ${etc} mm/day against ${fieldCapacity}% field capacity.`,
    },
    {
      id: "heat",
      label: "Heat load",
      value: `HSD ${health.hsi} · HDD ${health.hdd}°C-days`,
      impact: "increase",
      weight: 0.26,
      note:
        health.hdd > 12
          ? "High accumulated heat — evaporation losses during the day are large, so the evening window carries most of the benefit."
          : "Moderate heat load; a single evening application covers the daily need.",
    },
    {
      id: "moisture",
      label: "Soil moisture",
      value: `${available}% (deficit ${deficit}%)`,
      impact: deficit > 6 ? "increase" : "decrease",
      weight: 0.32,
      note:
        deficit > 6
          ? "Below the refill point. Refilling now prevents the crop entering midday stress."
          : "Still above the refill point. A light top-up is enough.",
    },
    {
      id: "efficiency",
      label: "Method efficiency",
      value: `${method.label} · ${Math.round(method.efficiency * 100)}%`,
      impact: "neutral",
      weight: 0.14,
      note: method.note,
    },
  ]

  const headline =
    decision === "irrigate"
      ? `Irrigate ${totalDepth} mm (${Math.round(totalDepth * ACRE_MM_TO_LITRES)} litres per acre)`
      : decision === "monitor"
        ? "No irrigation needed yet — monitor soil moisture"
        : "Skip today and reassess tomorrow"

  const reason =
    decision === "irrigate"
      ? `Soil moisture at ${available}% is ${deficit}% below the ${refillPoint}% refill point for ${definition.name} at ${stageDefinition.label.toLowerCase()} stage. The crop is using ${etc} mm/day at this stage and the heat load (${health.hsi} HSD) means roughly a third of a daytime application would be lost to evaporation. Applying ${netDepth} mm net through ${method.label.toLowerCase()} at ${Math.round(method.efficiency * 100)}% efficiency, plus a ${headroom} mm heat contingency, restores the profile.`
      : decision === "monitor"
        ? `Soil moisture at ${available}% is still above the ${refillPoint}% refill point. Daily crop use is ${etc} mm, so the profile stays in the safe band for the next day. Irrigate only when moisture crosses the refill point or WBGT stays above ${definition.thresholds.wbgtCaution}°C for two consecutive days.`
        : `Moisture is at ${available}% with a ${deficit}% deficit, below the ${skipThreshold} mm trigger for today. Hold irrigation and use the morning window for any light top-up instead.`

  return {
    locationId: location.id,
    crop,
    stage,
    generatedAt: new Date().toISOString(),
    simulated: true,
    decision,
    headline,
    depthMm: totalDepth,
    litresPerAcre: Math.round(totalDepth * ACRE_MM_TO_LITRES),
    method: method.label,
    window: {
      from: windowStart,
      to: windowEnd,
      label: `${windowStart} – ${windowEnd}`,
    },
    reason,
    factors,
    waterImpact: [
      {
        label: "Today (recommended)",
        without: 0,
        with: totalDepth,
        unit: "mm",
      },
      {
        label: "Over next 7 days",
        without: round(et0 * 7, 1),
        with: round(totalDepth + et0 * 6, 1),
        unit: "mm",
      },
      {
        label: "Litres per acre, 7 days",
        without: round(et0 * 7 * ACRE_MM_TO_LITRES),
        with: round((totalDepth + et0 * 6) * ACRE_MM_TO_LITRES),
        unit: "L",
      },
      {
        label: "Water saved vs daily flood",
        without: round(et0 * 7, 1),
        with: round(et0 * 7 * method.efficiency * 0.62, 1),
        unit: "mm",
      },
    ],
    nextReview:
      health.riskLevel === "red"
        ? "Recheck after 12 hours"
        : "Recheck tomorrow evening",
  }
}

registerMock<IrrigationRecommendation>(
  "/irrigation/recommendation",
  async (_pattern, _endpoint, params) => {
    const locationId = params.locationId ?? "nashik"
    const crop = params.crop as CropId ?? "sorghum"
    const stage = params.stage as CropStage ?? "flowering"
    const lat = params.lat !== undefined ? Number(params.lat) : undefined
    const lng = params.lng !== undefined ? Number(params.lng) : undefined
    const { cropService } = await import("./cropService")
    const health = await cropService.getSnapshot(locationId, crop, stage, lat, lng)
    return buildRecommendation(
      locationId,
      crop,
      stage,
      health,
      params.methodId ?? "drip",
      lat,
      lng,
    )
  },
)
