import { useState } from "react"
import { Link } from "react-router-dom"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  ArrowRight,
  Clock,
  Droplets,
  Info,
  Layers,
  Timer,
  TriangleAlert,
} from "lucide-react"
import LocationPicker from "../components/LocationPicker"
import { millimetreFormatter } from "../components/chartFormatters"
import {
  BarRow,
  Card,
  CardHeader,
  ErrorNote,
  Loading,
  Metric,
  SEVERITY_CLASS,
  Segmented,
  SeverityBadge,
  SimulatedNotice,
} from "../components/ui"
import { FeatureShell } from "../components/SiteChrome"
import { RevealSection, RevealCard } from "../components/Reveal"
import { useService } from "../hooks/useService"
import { cropService } from "../services/cropService"
import { CROP_LIST } from "../services/mockData"
import {
  irrigationService,
  IRRIGATION_METHODS,
} from "../services/irrigationService"
import { PollyVoiceBanner } from "../components/PollyVoiceBanner"
import { relativeTime } from "../services/random"
import { useAppState } from "../state/AppState"
import type {
  CropId,
  CropStage,
  IrrigationRecommendation,
} from "../services/types"

const DECISION_COPY = {
  irrigate: {
    badge: "Irrigate" as const,
    tone: "red" as const,
    title: "Apply the recommendation tonight",
  },
  monitor: {
    badge: "Monitor" as const,
    tone: "caution" as const,
    title: "Hold irrigation, keep watching the profile",
  },
  skip: {
    badge: "Skip" as const,
    tone: "safe" as const,
    title: "No irrigation needed today",
  },
}

export default function SmartIrrigationScreen() {
  const { location, setLocation, setLocationId, crop, setCrop, stage, setStage } =
    useAppState()
  const [methodId, setMethodId] = useState("drip")

  const health = useService(
    () => cropService.getSnapshot(location.id, crop, stage, location.lat, location.lng),
    [location.id, location.lat, location.lng, crop, stage],
  )
  // The recommendation is derived from the CDHI snapshot, so it waits for it.
  const recommendation = useService<IrrigationRecommendation | null>(
    async () =>
      health.data
        ? irrigationService.getRecommendation(
          location.id,
          crop,
          stage,
          health.data,
          methodId,
          location.lat,
          location.lng,
        )
        : null,
    [location.id, location.lat, location.lng, crop, stage, methodId, health.data],
  )

  const data = recommendation.data
  const definition = CROP_LIST.find((item) => item.id === crop) ?? CROP_LIST[0]
  const copy = data ? DECISION_COPY[data.decision] : DECISION_COPY.monitor

  const factorTotal = (data?.factors ?? []).reduce(
    (sum, factor) => sum + factor.weight,
    0,
  )

  return (
    <FeatureShell active="Smart Irrigation">
      <section className="kg-hero-band">
        <div className="container kg-hero-grid">
          <div>
            <p className="kg-eyebrow">Smart irrigation</p>
            <h1>
              How much water,
              <br />
              and at what hour.
            </h1>
            <p className="kg-hero-lead">
              A depth, a window and a reason — computed from crop stage, heat
              load and soil-moisture deficit, then compared against what you
              would use irrigating daily.
            </p>
            <LocationPicker
              value={location}
              onChange={(next) => (setLocation ? setLocation(next) : setLocationId(next.id))}
              compact
            />
          </div>

          <div className="kg-hero-panel">
            {recommendation.loading || health.loading ? (
              <Loading label="Computing irrigation plan" />
            ) : null}
            {recommendation.error ? (
              <ErrorNote
                message={recommendation.error}
                onRetry={recommendation.reload}
              />
            ) : null}
            {data ? (
              <>
                <div className="kg-panel-head">
                  <p className="kg-eyebrow">
                    {location.village}, {location.district} &middot; PIN {location.pincode || "—"}
                  </p>
                  <span className="live-dot">Plan ready</span>
                </div>
                <div className="kg-panel-reading">
                  <strong>
                    {data.depthMm.toFixed(1)}
                    <em>mm</em>
                  </strong>
                  <div>
                    <span className="kg-panel-metric">
                      Recommended depth ·{" "}
                      {data.litresPerAcre.toLocaleString("en-IN")} L/acre
                    </span>
                    <span className="kg-panel-metric">
                      Window {data.window.label} · {data.nextReview}
                    </span>
                  </div>
                </div>
                <SeverityBadge severity={copy.tone} label={copy.badge} />
                <p className="kg-panel-note">{copy.title}</p>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {/* Alternative 2: One-Tap Agromet Audio Player & WhatsApp Share */}
      <div className="container" style={{ marginTop: "24px", marginBottom: "8px" }}>
        <PollyVoiceBanner
          locationName={`${location.village}, ${location.district}`}
          cropName={crop.name}
          advisoryText={data ? `Recommended depth ${data.depthMm.toFixed(1)} mm for ${crop.name}. Window: ${data.window.label}.` : undefined}
        />
      </div>

      <RevealSection className="section kg-section">
        <div className="container">
          <div className="kg-section-head">
            <div>
              <p className="kg-eyebrow">Setup</p>
              <h2>Crop, stage and delivery method</h2>
            </div>
            <p>
              Method efficiency changes the applied depth but never the net
              requirement.
            </p>
          </div>

          <div className="kg-select-grid">
            <Segmented
              label="Crop"
              value={crop}
              onChange={(value) => setCrop(value as CropId)}
              options={CROP_LIST.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
            <Segmented
              label="Growth stage"
              value={stage}
              onChange={(value) => setStage(value as CropStage)}
              options={definition.stages.map((item) => ({
                value: item.id,
                label: item.label,
              }))}
            />
            <Segmented
              label="Delivery method"
              value={methodId}
              onChange={setMethodId}
              options={IRRIGATION_METHODS.map((item) => ({
                value: item.id,
                label: item.label,
                hint: `${Math.round(item.efficiency * 100)}% efficient`,
              }))}
            />
          </div>

          <div className="kg-method-note">
            <Layers size={16} />
            <span>
              {IRRIGATION_METHODS.find((item) => item.id === methodId)?.note}
            </span>
          </div>
        </div>
      </RevealSection>

      <RevealSection className="section kg-section is-white">
        <div className="container">
          <div className="kg-section-head">
            <div>
              <p className="kg-eyebrow">Recommendation</p>
              <h2>What to do tonight</h2>
              <div className="kg-active-location-pill">
                📍 Schedule optimized for <strong>{location.village}, {location.district}</strong> (PIN {location.pincode || "—"}) &middot; Coordinates {location.lat != null ? location.lat.toFixed(2) : "19.99"}°N, {location.lng != null ? location.lng.toFixed(2) : "73.78"}°E
              </div>
            </div>
            <p>
              Derived from the factors below — change any input and the numbers
              move together.
            </p>
          </div>

          {data ? (
            <>
              <div className="kg-recommend-grid">
                <Card className={`kg-recommend-card is-${data.decision}`}>
                  <CardHeader
                    eyebrow="Decision"
                    title={data.headline}
                    detail={data.reason}
                  />
                  <div className="kg-recommend-stats">
                    <Metric
                      label="Depth"
                      value={data.depthMm.toFixed(1)}
                      unit="mm"
                      tone={
                        data.decision === "irrigate"
                          ? "red"
                          : data.decision === "monitor"
                            ? "caution"
                            : "green"
                      }
                    />
                    <Metric
                      label="Volume"
                      value={data.litresPerAcre.toLocaleString("en-IN")}
                      unit="L / acre"
                    />
                    <Metric label="Method" value={data.method} />
                  </div>
                  <p className="kg-recommend-window">
                    <Clock size={16} />
                    Recommended window <strong>{data.window.label}</strong>
                    <span>Local time · {location.district}</span>
                  </p>
                  <p className="kg-card-note">
                    Irrigating earlier than {data.window.from} or later than{" "}
                    {data.window.to} raises evaporation loss enough to lose
                    roughly a fifth of the applied depth on a day like this.
                  </p>
                </Card>

                <Card>
                  <CardHeader
                    eyebrow="Reasoning"
                    title="Why this depth and window"
                    detail={`Factor weights sum to ${(factorTotal * 100).toFixed(0)}%`}
                  />
                  <div className="kg-factor-list">
                    {data.factors.map((factor) => (
                      <BarRow
                        key={factor.id}
                        label={factor.label}
                        value={factor.weight * 100}
                        max={40}
                        tone={
                          factor.impact === "decrease"
                            ? "green"
                            : factor.impact === "increase"
                              ? "caution"
                              : "safe"
                        }
                        trailing={`${(factor.weight * 100).toFixed(0)}%`}
                      />
                    ))}
                  </div>
                  <div className="kg-factor-notes">
                    {data.factors.map((factor) => (
                      <div key={factor.id}>
                        <strong>{factor.label}</strong>
                        <span>{factor.note}</span>
                        <em className={`is-${factor.impact}`}>
                          {factor.value}
                        </em>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <Card className="kg-impact-card">
                <CardHeader
                  eyebrow="Water impact"
                  title="What this saves"
                  detail="Compared with irrigating the same crop on a daily flood schedule"
                  actions={<Droplets size={18} />}
                />
                <div className="kg-two-col is-tight">
                  <div className="kg-chart-wrap is-small">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart
                        data={data.waterImpact.filter(
                          (item) => item.unit === "mm",
                        )}
                        margin={{ top: 8, right: 8, left: -14, bottom: 0 }}
                      >
                        <CartesianGrid stroke="#eceee9" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: "#55584f" }}
                          axisLine={{ stroke: "#dfe0db" }}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#777971" }}
                          axisLine={false}
                          unit="mm"
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid #dfe0db",
                            fontSize: 12,
                          }}
                        />
                        <Bar
                          dataKey="without"
                          name="Without plan"
                          fill="#b44a34"
                          radius={[6, 6, 0, 0]}
                          barSize={22}
                        />
                        <Bar
                          dataKey="with"
                          name="With plan"
                          fill="#639841"
                          radius={[6, 6, 0, 0]}
                          barSize={22}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="kg-impact-table">
                    {data.waterImpact.map((item) => (
                      <div key={item.label}>
                        <span>{item.label}</span>
                        <strong>
                          {item.with} {item.unit}
                        </strong>
                        <em>
                          vs {item.without} {item.unit}
                        </em>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>


            </>
          ) : (
            <Loading label="Computing the plan" />
          )}
        </div>
      </RevealSection>

      <RevealSection className="section kg-section">
        <div className="container">
          <div className="kg-section-head">
            <div>
              <p className="kg-eyebrow">Method comparison</p>
              <h2>Same field, four methods</h2>
            </div>
            <p>
              Efficiency only changes applied depth — the crop requirement stays
              the same.
            </p>
          </div>

          <Card>
            <div className="kg-method-chart">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart
                  data={IRRIGATION_METHODS.map((method) => ({
                    name: method.label,
                    efficiency: method.efficiency,
                    depth:
                      health.data && data
                        ? Number(
                          (
                            ((Math.max(
                              0,
                              health.data.soilMoisturePercent - 18,
                            ) *
                              0.62) /
                              method.efficiency) *
                            (1 +
                              (health.data.riskLevel === "red"
                                ? 0.18
                                : 0.07)) +
                            0
                          ).toFixed(1),
                        )
                        : 0,
                    saved: Number(
                      (
                        ((health.data?.soilMoisturePercent ?? 24) *
                          0.62 *
                          (1 - method.efficiency)) /
                        (health.data?.soilMoisturePercent || 1)
                      ).toFixed(1),
                    ),
                  }))}
                  margin={{ top: 8, right: 8, left: -14, bottom: 0 }}
                >
                  <CartesianGrid stroke="#eceee9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#55584f" }}
                    axisLine={{ stroke: "#dfe0db" }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#777971" }}
                    axisLine={false}
                    unit="mm"
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #dfe0db",
                      fontSize: 12,
                    }}
                    formatter={millimetreFormatter("Applied depth")}
                  />
                  <ReferenceLine y={0} stroke="#dfe0db" />
                  <Bar dataKey="depth" radius={[6, 6, 0, 0]} barSize={30}>
                    {IRRIGATION_METHODS.map((method, index) => (
                      <Cell
                        key={method.id}
                        fill={method.id === methodId ? "#639841" : "#c8dcc0"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </RevealSection>
    </FeatureShell>
  )
}
