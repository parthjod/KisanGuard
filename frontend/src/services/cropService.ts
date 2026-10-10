import { apiClient, registerMock } from "./apiClient"
import { districtHeatPeak } from "./heatService"
import { CROPS, LOCATIONS } from "./mockData"
import { between, clamp, createRandom, formatDay, round } from "./random"
import type {
  CropHealthSnapshot,
  CropId,
  CropRiskComponent,
  CropStage,
} from "./types"

/**
 * Crop health + CDHI (Feature 02).
 *
 * CDHI (Crop Drought Heat Index) is computed here as a weighted blend of a heat
 * excess term, a soil-moisture deficit term, a rainfall anomaly term and a
 * stage sensitivity term. Contributions are normalised to 100 points so the UI
 * can show exactly which driver is pushing the score up.
 */

const CROP_DROUGHT_OFFSET: Record<CropId, number> = {
  wheat: 1.8,
  rice: -2.6,
  maize: -0.4,
  sorghum: 2.2,
  millet: 3.1,
  soybean: 0.5,
  cotton: -1.0,
}

/**
 * Days in the last 10 on which the district's WBGT peak cleared the crop
 * threshold. Reusing `heatService`'s district base means the crop screen and the
 * heat screen can never disagree about how hot the block is.
 */
function heatStressDays(
  locationId: string,
  crop: CropId,
  random: () => number,
): number {
  const location =
    LOCATIONS.find((item) => item.id === locationId) ?? LOCATIONS[0]
  const districtPeak = districtHeatPeak(location.district, random)
  const threshold = CROPS[crop].thresholds.wbgtCaution
  const excess = districtPeak - threshold
  if (excess <= 0) return Math.round(clamp(between(random, 0, 1.6), 0, 3))
  // Roughly one stress day per 1.5 deg C of excess, capped at 10.
  return Math.round(clamp(excess / 1.5 + between(random, -1, 1.5), 1, 10))
}

const STAGE_SENSITIVITY: Record<CropStage, number> = {
  sowing: 0.42,
  emergence: 0.5,
  vegetative: 0.58,
  flowering: 0.95,
  "grain-fill": 0.85,
  maturity: 0.38,
}

export const cropService = {
  async getSnapshot(
    locationId: string,
    crop: CropId,
    stage: CropStage,
    lat?: number,
    lng?: number,
  ): Promise<CropHealthSnapshot> {
    const { data } = await apiClient.request<CropHealthSnapshot>(
      "/crop/health",
      {
        locationId,
        crop,
        stage,
        lat: lat !== undefined ? String(lat) : undefined,
        lng: lng !== undefined ? String(lng) : undefined,
      },
    )
    return data
  },
}

function buildSnapshot(
  locationId: string,
  crop: CropId,
  stage: CropStage,
  lat?: number,
  lng?: number,
): CropHealthSnapshot {
  const definition = CROPS[crop]
  const stageDefinition =
    definition.stages.find((item) => item.id === stage) ?? definition.stages[0]
  const location =
    LOCATIONS.find((item) => item.id === locationId) ??
    (lat !== undefined && lng !== undefined
      ? {
          id: locationId,
          village: locationId.replace(/^(pin|geo|nat|custom)-/, "").replace(/-/g, " "),
          district: lat > 28 ? "Northern Plains" : "Central Plateau",
          state: lat > 28 ? "Punjab" : "Maharashtra",
          pincode: locationId.startsWith("pin-") ? locationId.replace("pin-", "") : "—",
          lat,
          lng,
          acres: 4.5,
          soilType: (lat > 28 ? "alluvial" : "medium-black") as const,
        }
      : LOCATIONS[0])
  const seed = `crop-${location.id}-${crop}-${stage}-${lat ?? 0}-${lng ?? 0}`
  const random = createRandom(seed)
  const now = new Date()

  const spi = round(between(random, -2.1, 1.1), 2)
  const anomaly = round(spi * 7.4 + between(random, -4, 4), 1)
  const soilMoisture = round(clamp(48 + anomaly * 1.5, 12, 78), 1)

  // Heat stress days are counted against the crop's own WBGT threshold using the
  // same district heat base as the Heat Risk screen, so both screens agree on how
  // hot the block actually is.
  const heatDays = heatStressDays(location.id, crop, random)
  const hdd = round(clamp(6 + heatDays * 1.6 - spi * 0.8, 0, 30), 1)
  const hsi = round(clamp(anomaly * 0.55 + 34, 0, 100), 0)

  const heatExcess = clamp(
    (heatDays - 2.4) * 7 + (stage === "maturity" ? -4 : 0),
    0,
    46,
  )
  const moistureDeficit = clamp(
    (46 - soilMoisture) * 1.25 + CROP_DROUGHT_OFFSET[crop],
    0,
    42,
  )
  const rainfallDeficit = clamp(-spi * 15, 0, 34)
  const stageTerm = STAGE_SENSITIVITY[stage] * 14

  const raw = heatExcess + moistureDeficit + rainfallDeficit + stageTerm
  const cdhi = Math.round(clamp(raw * 0.92, 3, 97))

  const riskLevel = cdhi >= 68 ? "red" : cdhi >= 38 ? "caution" : "safe"

  const components: CropRiskComponent[] = [
    {
      id: "heat",
      label: "Heat stress days",
      value: heatDays,
      unit: "days in last 10",
      contribution: Math.round((heatExcess / Math.max(raw, 1)) * 100),
      direction: "up",
      explanation: `WBGT crossed the ${definition.name} threshold of ${definition.thresholds.wbgtCaution}°C on ${heatDays} of the last 10 days. Each hot day above threshold interrupts photosynthesis and burns leaf area.`,
    },
    {
      id: "moisture",
      label: "Soil moisture deficit",
      value: anomaly,
      unit: "% vs normal",
      contribution: Math.round((moistureDeficit / Math.max(raw, 1)) * 100),
      direction: anomaly < -4 ? "up" : "down",
      explanation: `Profile moisture is ${soilMoisture}% against a ${(stageDefinition.kcMultiplier * definition.kc).toFixed(2)} crop coefficient at this stage. ${definition.name} can extract water from roughly ${definition.rootDepthMm} mm of root depth, so the deficit matters most while the profile is thin.`,
    },
    {
      id: "rainfall",
      label: "Rainfall anomaly (SPI)",
      value: spi,
      unit: "index",
      contribution: Math.round((rainfallDeficit / Math.max(raw, 1)) * 100),
      direction: spi < -0.5 ? "up" : "down",
      explanation:
        spi < -1
          ? "Severely dry spell. No effective recharge in the window."
          : spi < 0
            ? "Below-normal rainfall, partial recharge only."
            : "Rainfall at or above normal, recharge is available.",
    },
    {
      id: "stage",
      label: `${stageDefinition.label} sensitivity`,
      value: Math.round(stageDefinition.sensitivity * 100),
      unit: "% of maximum",
      contribution: Math.round((stageTerm / Math.max(raw, 1)) * 100),
      direction: "up",
      explanation:
        stage === "flowering"
          ? "Flowering is the single most heat-sensitive window. Pollen viability falls sharply above the threshold and lost flowers cannot be replaced, so a heat event here has outsized yield cost."
          : stage === "grain-fill"
            ? "Grain fill depends on current photosynthesis — leaf area lost now directly reduces grain weight."
            : `At ${stageDefinition.label.toLowerCase()} stage the canopy is still building, so it can recover if water and heat stress ease.`,
    },
  ]

  const history = Array.from({ length: 30 }, (_, index) => {
    const dayOffset = index - 29
    const drift = createRandom(`${seed}-d${dayOffset}`)
    const base = cdhi - dayOffset * 0.55
    return {
      date: formatDay(now, dayOffset),
      cdhi: Math.round(clamp(base + between(drift, -6, 7), 2, 98)),
      soilMoisture: round(
        clamp(soilMoisture - dayOffset * 0.32 + between(drift, -3, 3), 8, 82),
        1,
      ),
    }
  })

  return {
    locationId: location.id,
    crop,
    stage,
    observedAt: now.toISOString(),
    cdhi,
    riskLevel,
    spi,
    soilMoistureAnomaly: anomaly,
    soilMoisturePercent: soilMoisture,
    heatStressDays: heatDays,
    heatStressDaysWindow: 10,
    hsi,
    hdd,
    ndvi: round(clamp(0.72 - cdhi / 240, 0.18, 0.78), 2),
    components,
    history,
    thresholds: definition.thresholds,
  }
}

registerMock<CropHealthSnapshot>(
  "/crop/health",
  (_pattern, _endpoint, params) =>
    buildSnapshot(
      params.locationId ?? "nashik",
      params.crop as CropId ?? "sorghum",
      params.stage as CropStage ?? "flowering",
      params.lat !== undefined ? Number(params.lat) : undefined,
      params.lng !== undefined ? Number(params.lng) : undefined,
    ),
)
