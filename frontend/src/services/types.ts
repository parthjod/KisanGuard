/**
 * Shared domain types for the KisanGuard feature frontends.
 * These mirror the shapes the future KisanGuard REST API is expected to return,
 * so the mock layer can be swapped for `fetch` calls without touching the UI.
 */

export type Severity = "safe" | "caution" | "red"

/** Human label for each severity band, shared by every screen and the map. */
export const SEVERITY_LABEL: Record<Severity, string> = {
  safe: "Safe",
  caution: "Moderate",
  red: "High",
}

export type LocationId = string

export interface LocationRecord {
  id: LocationId
  village: string
  district: string
  state: string
  pincode: string
  lat: number
  lng: number
  acres?: number
  soilType?: string
}

/** A single grid cell used by the interactive risk map. */
export interface RiskCell {
  id: string
  name: string
  lat: number
  lng: number
  /** normalised 0..1 polygon radius for the map bubble */
  weight: number
  wbgt: number
  psi: number
  severity: Severity
  /** simulated farmer count inside the cell */
  population: number
}

export interface HeatSnapshot {
  locationId: LocationId
  observedAt: string
  wbgt: number
  psi: number
  severity: Severity
  temperature: number
  humidity: number
  feelsLike: number
  lst: number
  ndvi: number
  /** ISO timestamps, hourly, 24 entries */
  trend: HeatTrendPoint[]
  /** safe working window for the day; `wrapsMidnight` marks an overnight window */
  safeWindow: { from: string; to: string; wrapsMidnight: boolean }
  thresholds: { caution: number; red: number }
}

export interface HeatTrendPoint {
  time: string
  wbgt: number
  temperature: number
  humidity: number
  psi: number
}

export interface WorkAdvice {
  id: string
  intensity: "rest" | "light" | "moderate" | "heavy"
  label: string
  status: "go" | "caution" | "stop"
  headline: string
  detail: string
  guidance: string[]
}

export type CropId = "wheat" | "rice" | "maize" | "sorghum" | "millet" | "soybean" | "cotton"

export interface CropDefinition {
  id: CropId
  name: string
  nameLocal: string
  stages: CropStageDefinition[]
  /** crop specific heat thresholds (deg C WBGT / deg C Tmax) */
  thresholds: {
    wbgtCaution: number
    wbgtRed: number
    tmaxCaution: number
    tmaxRed: number
  }
  kc: number
  rootDepthMm: number
  seasonMonths: number[]
}

export type CropStage = "sowing" | "emergence" | "vegetative" | "flowering" | "grain-fill" | "maturity"

export interface CropStageDefinition {
  id: CropStage
  label: string
  kcMultiplier: number
  /** stress sensitivity 0..1 — flowering is highest */
  sensitivity: number
  durationDays: number
}

export interface CropHealthSnapshot {
  locationId: LocationId
  crop: CropId
  stage: CropStage
  observedAt: string
  /** Crop Drought Heat Index, 0..100 */
  cdhi: number
  riskLevel: Severity
  spi: number
  soilMoistureAnomaly: number
  soilMoisturePercent: number
  heatStressDays: number
  heatStressDaysWindow: number
  hsi: number
  hdd: number
  ndvi: number
  components: CropRiskComponent[]
  /** 30 day CDHI history for the Recharts trend */
  history: { date: string; cdhi: number; soilMoisture: number }[]
  thresholds: CropDefinition["thresholds"]
}

export interface CropRiskComponent {
  id: string
  label: string
  value: number
  unit: string
  /** contribution to CDHI, points out of 100 */
  contribution: number
  direction: "up" | "down"
  explanation: string
}

export interface YieldForecast {
  locationId: LocationId
  crop: CropId
  stage: CropStage
  generatedAt: string
  currentLossProbability: number
  projectedLossProbability: number
  horizonDays: 14
  /** 14 points, day 0..13 */
  series: YieldForecastPoint[]
  zones: YieldRiskZone[]
  withoutAction: ComparisonPoint[]
  withAction: ComparisonPoint[]
  action: RecommendedAction
  confidence: number
}

export interface YieldForecastPoint {
  day: number
  date: string
  probability: number
  withActionProbability: number
  band: { low: number; high: number }
  severity: Severity
}

export interface YieldRiskZone {
  id: string
  label: string
  probability: number
  severity: Severity
  cropImpact: string
  drivers: string[]
}

/** One before/after checkpoint row. `without` is the no-action path, `with` is the action path. */
export interface ComparisonPoint {
  label: string
  without: number
  with: number
}

export interface RecommendedAction {
  id: string
  title: string
  window: string
  detail: string
  bullets: string[]
  expectedLossAvoidancePct: number
  severity: Severity
}

export interface IrrigationRecommendation {
  locationId: LocationId
  crop: CropId
  stage: CropStage
  generatedAt: string
  /** true whenever values come from the deterministic mock engine */
  simulated: boolean
  decision: "irrigate" | "skip" | "monitor"
  headline: string
  /** millimetres of water applied */
  depthMm: number
  /** litres per acre */
  litresPerAcre: number
  method: string
  window: { from: string; to: string; label: string }
  reason: string
  factors: IrrigationFactor[]
  waterImpact: { label: string; without: number; with: number; unit: string }[]
  nextReview: string
}

export interface IrrigationFactor {
  id: string
  label: string
  value: string
  impact: "increase" | "decrease" | "neutral"
  weight: number
  note: string
}

export type VerificationStatus = "ai-verified" | "human-reviewed" | "pending"
export type AlertChannel = "whatsapp" | "sms" | "voice" | "push" | "web"

export interface AlertRecord {
  id: string
  severity: Severity
  title: string
  titleLocal: string
  message: string
  messageLocal: string
  createdAt: string
  location: LocationRecord
  wbgt: number
  psi: number
  temperature: number
  humidity: number
  confidence: number
  verification: VerificationStatus
  channel: AlertChannel
  language: string
  audienceCount: number
  acknowledgedCount: number
  recommendation: string
  timeline: AuditEvent[]
  crop: CropId | null
}

export interface AuditEvent {
  id: string
  at: string
  actor: "ai-model" | "field-officer" | "system" | "farmer"
  label: string
  detail: string
}

export interface Persona {
  id: string
  name: string
  nameLocal: string
  role: string
  village: string
  district: string
  crop: CropId
  stage: CropStage
  hectares: number
  avatarInitials: string
}

export type AlertFrequency = "realtime" | "hourly" | "daily" | "digest"

export interface AlertPreferences {
  personaId: string
  language: string
  channels: Record<AlertChannel, boolean>
  frequency: AlertFrequency
  quietHours: { from: string; to: string; enabled: boolean }
  thresholds: { caution: number; red: number }
  crops: CropId[]
  advisories: {
    heat: boolean
    irrigation: boolean
    yield: boolean
    cropHealth: boolean
  }
}

export interface AdvisoryPreview {
  language: string
  channel: AlertChannel
  subject: string
  body: string
  cta: string
}
