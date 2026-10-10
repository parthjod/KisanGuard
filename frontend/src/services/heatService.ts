import { apiClient, registerMock } from "./apiClient"
import { CROPS, LOCATIONS } from "./mockData"
import { between, clamp, createRandom, minutesAgo, pick, round } from "./random"
import type {
  HeatSnapshot,
  HeatTrendPoint,
  LocationRecord,
  RiskCell,
  Severity,
  WorkAdvice,
} from "./types"

/**
 * Hyperlocal heat risk (Feature 01).
 *
 * WBGT is modelled as the solar component of air temperature plus a humidity
 * correction, which is roughly how the field WBGT is reconstructed from
 * station + satellite inputs. PSI here stands for a heat stress index on a
 * 0..100 scale (heat power / discomfort composite), not air quality.
 */

/** Daily WBGT peak, deg C, by district — hotter in the drier northern blocks. */
const BASE_DISTRICT_HEAT: Record<string, number> = {
  Nashik: 31.5,
  Latur: 35.4,
  Sangli: 32.8,
  Beed: 35.8,
  Nanded: 34.6,
  Dhule: 36.2,
}

/** Daily mean relative humidity, %, by district. */
const BASE_DISTRICT_HUMIDITY: Record<string, number> = {
  Nashik: 58,
  Latur: 44,
  Sangli: 68,
  Beed: 46,
  Nanded: 51,
  Dhule: 38,
}

export function severityForWbgt(
  wbgt: number,
  caution = 28,
  red = 33,
): Severity {
  if (wbgt >= red) return "red"
  if (wbgt >= caution) return "caution"
  return "safe"
}

export function locationOrDefault(
  locationId: string,
  lat?: number,
  lng?: number,
): LocationRecord {
  const found = LOCATIONS.find((location) => location.id === locationId)
  if (found) return found
  if (lat !== undefined && lng !== undefined) {
    const isNorth = lat > 28.0
    const isWest = lng < 75.0 && lat > 24.0
    return {
      id: locationId,
      village: locationId.replace(/^(pin|geo|nat|custom)-/, "").replace(/-/g, " "),
      district: isNorth ? "Northern Plains" : isWest ? "Western Arid" : "Central Plateau",
      state: isNorth ? "Punjab" : isWest ? "Rajasthan" : "Maharashtra",
      pincode: locationId.startsWith("pin-") ? locationId.replace("pin-", "") : "—",
      lat,
      lng,
      acres: 4.5,
      soilType: isNorth ? "alluvial" : isWest ? "arid" : "medium-black",
    }
  }
  return LOCATIONS[0]
}

/**
 * The district's daily WBGT peak, deg C.
 *
 * Exported so the crop screen can count heat-stress days against the same heat
 * the heat screen reports — one district model, two consumers.
 */
export function districtHeatPeak(
  district: string,
  random: () => number,
  lat?: number,
): number {
  if (BASE_DISTRICT_HEAT[district]) {
    return round(BASE_DISTRICT_HEAT[district] + between(random, -1.6, 1.8), 1)
  }
  const base = lat !== undefined ? clamp(29.0 + (lat - 15) * 0.45, 28, 38.5) : 33.5
  return round(base + between(random, -1.6, 1.8), 1)
}

/** Approximate WBGT for an hour of the day given a daily peak and humidity. */
function wbgtAtHour(dailyPeak: number, hour: number, humidity: number): number {
  const peakHour = 14.5
  const distance = Math.abs(hour - peakHour)
  const diurnal = dailyPeak - 0.62 * distance - 0.035 * distance * distance
  const humidityPenalty = ((humidity - 45) / 100) * 2.6
  return clamp(diurnal + humidityPenalty, 18, 45)
}

/**
 * Relative humidity for an hour: a district baseline plus a diurnal swing.
 *
 * Humidity peaks just before dawn and bottoms out in the late afternoon, and a
 * humid district sits well above a dry one. Keeping the baseline per district
 * is what stops every field reading the same number.
 */
function humidityAtHour(base: number, hour: number, jitter: number): number {
  const amplitude = clamp(base * 0.42, 6, 34)
  const swing = Math.cos(((hour - 4.5) / 24) * 2 * Math.PI)
  return round(clamp(base + amplitude * swing + jitter, 14, 97), 0)
}

function buildTrend(
  location: LocationRecord,
  now: Date,
  dailyPeak: number,
): HeatTrendPoint[] {
  const random = createRandom(`trend-${location.id}`)
  const base = BASE_DISTRICT_HUMIDITY[location.district] ?? 52
  const points: HeatTrendPoint[] = []
  for (let index = 23; index >= 0; index -= 1) {
    const timestamp = new Date(now.getTime() - index * 3_600_000)
    const hour = timestamp.getHours() + timestamp.getMinutes() / 60
    const humidity = humidityAtHour(base, hour, between(random, -4, 4, 0))
    const wbgt = round(wbgtAtHour(dailyPeak, hour, humidity), 1)
    const temperature = round(wbgt - ((humidity - 40) / 100) * 3.4 + 0.6, 1)
    points.push({
      time: timestamp.toISOString(),
      wbgt,
      temperature,
      humidity,
      psi: Math.round(clamp((wbgt - 18) * 5.6, 0, 100)),
    })
  }
  return points
}

/**
 * Working limits by effort, deg C WBGT.
 *
 * `threshold` is the WBGT above which the activity is no longer a clear "go":
 * +3.5 deg C beyond it becomes "stop". The scale is inverted against effort on
 * purpose — resting in shade tolerates far more heat than lifting bundles, so
 * the numbers descend as the work gets heavier.
 */
export const WORK_INTENSITIES = [
  { id: "rest", label: "Rest / light shade", threshold: 36 },
  { id: "light", label: "Light field work", threshold: 30 },
  { id: "moderate", label: "Moderate work", threshold: 28 },
  { id: "heavy", label: "Heavy manual work", threshold: 26 },
] as const

export const heatService = {
  async getSnapshot(
    locationId: string,
    lat?: number,
    lng?: number,
  ): Promise<HeatSnapshot> {
    const { data } = await apiClient.request<HeatSnapshot>("/heat/snapshot", {
      locationId,
      lat: lat !== undefined ? String(lat) : undefined,
      lng: lng !== undefined ? String(lng) : undefined,
    })
    return data
  },

  async getRiskCells(
    centerId: string,
    lat?: number,
    lng?: number,
  ): Promise<RiskCell[]> {
    const { data } = await apiClient.request<RiskCell[]>("/heat/risk-cells", {
      centerId,
      lat: lat !== undefined ? String(lat) : undefined,
      lng: lng !== undefined ? String(lng) : undefined,
    })
    return data
  },

  async getWorkAdvice(wbgt: number): Promise<WorkAdvice[]> {
    const { data } = await apiClient.request<WorkAdvice[]>(
      "/heat/work-advice",
      { wbgt: String(wbgt) },
    )
    return data
  },
}

function buildSnapshot(
  locationId: string,
  lat?: number,
  lng?: number,
): HeatSnapshot {
  const location = locationOrDefault(locationId, lat, lng)
  const random = createRandom(`heat-${location.id}-${lat ?? 0}-${lng ?? 0}`)
  const now = new Date()
  const dailyPeak = districtHeatPeak(location.district, random, location.lat)
  const trend = buildTrend(location, now, dailyPeak)
  const current = trend[trend.length - 1]
  const caution = 28
  const red = 33
  const wbgt = current.wbgt
  const humidity = current.humidity

  const window = safeWindow(trend, caution)

  return {
    locationId: location.id,
    observedAt: current.time,
    wbgt,
    psi: current.psi,
    severity: severityForWbgt(wbgt, caution, red),
    temperature: current.temperature,
    humidity,
    feelsLike: round(wbgt + (humidity - 40) / 22, 1),
    lst: round(wbgt + 4.3, 1),
    ndvi: round(between(random, 0.38, 0.72), 2),
    trend,
    safeWindow: {
      from: `${clock(window.from)}:00`,
      to: `${clock(window.to)}:00`,
      wrapsMidnight: window.to <= window.from,
    },
    thresholds: { caution, red },
  }
}

function clock(hour: number): string {
  return String(((hour % 24) + 24) % 24).padStart(2, "0")
}

/**
 * The longest contiguous run of hours below the caution threshold.
 *
 * The window is cyclic, so a stretch that runs through midnight is reported as
 * 21:00 – 03:00 rather than being clamped into an impossible range like
 * 23:00 – 25:00. Falls back to the pre-dawn default when nothing qualifies.
 */
function safeWindow(
  trend: HeatTrendPoint[],
  caution: number,
): { from: number; to: number } {
  const cool = trend.map((point) => point.wbgt < caution)

  let bestStart = -1
  let bestLength = 0
  for (let start = 0; start < cool.length; start += 1) {
    // A run only starts where the previous hour is hot.
    if (!cool[start] || cool[(start - 1 + cool.length) % cool.length]) continue
    let length = 0
    while (length < cool.length && cool[(start + length) % cool.length])
      length += 1
    if (length > bestLength) {
      bestLength = length
      bestStart = start
    }
  }

  // A cool day never crosses the caution line, so the window is the full day.
  if (bestLength === cool.length) return { from: 0, to: 23 }
  if (bestStart < 0 || bestLength < 2) return { from: 4, to: 7 }

  // The trend starts 23 hours ago, so index 0 is not midnight — read the real
  // clock off the timestamps instead of assuming the array is day-aligned.
  const from = new Date(trend[bestStart].time).getHours()
  const to = new Date(
    trend[(bestStart + bestLength) % cool.length].time,
  ).getHours()
  return { from, to }
}

function buildRiskCells(
  centerId: string,
  lat?: number,
  lng?: number,
): RiskCell[] {
  const center = locationOrDefault(centerId, lat, lng)
  const random = createRandom(`cells-${center.id}-${center.lat}-${center.lng}`)
  const cells: RiskCell[] = []
  const names = [
    "North block",
    "River ward",
    "Canal belt",
    "Hill slope",
    "Market yard",
    "Sugar belt",
    "Dry plateau",
    "Old tank area",
  ]
  for (let index = 0; index < 14; index += 1) {
    const angle = (index / 14) * Math.PI * 2
    const spread = between(random, 0.02, 0.13)
    const cellLat = center.lat + Math.cos(angle) * spread * 1.35
    const cellLng = center.lng + Math.sin(angle) * spread * 1.7
    const wbgt = round(between(random, 27, 38.5), 1)
    cells.push({
      id: `${center.id}-cell-${index}`,
      name: names[index % names.length],
      lat: round(cellLat, 4),
      lng: round(cellLng, 4),
      weight: round(between(random, 0.35, 1), 2),
      wbgt,
      psi: Math.round(clamp((wbgt - 18) * 5.6, 0, 100)),
      severity: severityForWbgt(wbgt),
      population: Math.round(between(random, 180, 2600, 0)),
    })
  }
  return cells
}

function buildWorkAdvice(wbgt: number): WorkAdvice[] {
  return WORK_INTENSITIES.map((intensity) => {
    const status: WorkAdvice["status"] =
      wbgt >= intensity.threshold + 3.5
        ? "stop"
        : wbgt >= intensity.threshold
          ? "caution"
          : "go"
    const guidance =
      status === "stop"
        ? [
            "Stop all field work and move to shade or a vehicle cabin.",
            "Sip water every 15 minutes — about 250 ml each time.",
            "Delay spraying, threshing and lifting work until evening.",
          ]
        : status === "caution"
          ? [
            "Keep work to short 30-minute blocks with breaks in between.",
            "Carry drinking water and ORS packets to the field.",
            "Wear light cotton clothing and a wide-brim hat.",
          ]
        : [
            "Normal field work is acceptable for this intensity.",
            "Still take a water break every hour.",
            "Recheck WBGT before starting the afternoon block.",
          ]
    return {
      id: intensity.id,
      intensity: intensity.id,
      label: intensity.label,
      status,
      headline:
        status === "stop"
          ? "Unsafe for this activity right now"
          : status === "caution"
            ? "Proceed with short breaks and shade"
            : "Safe to continue",
      detail: `Current WBGT ${wbgt.toFixed(1)}°C against a ${intensity.threshold}°C working limit for ${intensity.label.toLowerCase()}.`,
      guidance,
    }
  })
}

registerMock<HeatSnapshot>("/heat/snapshot", (_pattern, _endpoint, params) =>
  buildSnapshot(
    params.locationId ?? "nashik",
    params.lat !== undefined ? Number(params.lat) : undefined,
    params.lng !== undefined ? Number(params.lng) : undefined,
  ),
)
registerMock<RiskCell[]>("/heat/risk-cells", (_pattern, _endpoint, params) =>
  buildRiskCells(
    params.centerId ?? "nashik",
    params.lat !== undefined ? Number(params.lat) : undefined,
    params.lng !== undefined ? Number(params.lng) : undefined,
  ),
)
registerMock<WorkAdvice[]>("/heat/work-advice", (_pattern, _endpoint, params) =>
  buildWorkAdvice(Number(params.wbgt ?? 30)),
)

export const cropOptions = Object.values(CROPS)
export const cropName = (id: keyof typeof CROPS): string => CROPS[id].name
export const heatSeedDistrict = (locationId: string): string =>
  locationOrDefault(locationId).district
export const heatSeedLocation = (locationId: string): LocationRecord =>
  locationOrDefault(locationId)
export const heatDemoTime = minutesAgo
export const heatPick = pick
