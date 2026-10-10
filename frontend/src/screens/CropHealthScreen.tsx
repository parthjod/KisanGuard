import { Link } from "react-router-dom"
import { useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Droplets, Sprout, Sun, ThermometerSun, Waves } from "lucide-react"
import LocationPicker from "../components/LocationPicker"
import {
  degreeFormatter,
  percentFormatter,
} from "../components/chartFormatters"
import {
  BarRow,
  Card,
  CardHeader,
  Disclosure,
  ErrorNote,
  Loading,
  Metric,
  ProgressBar,
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
import { relativeTime } from "../services/random"
import { useAppState } from "../state/AppState"
import type { CropId, CropStage } from "../services/types"
import { useLanguage } from "../state/LanguageContext"
import { PollyVoiceBanner } from "../components/PollyVoiceBanner"

export default function CropHealthScreen() {
  const { location, setLocation, setLocationId, crop, setCrop, stage, setStage } =
    useAppState()
  const { t } = useLanguage()
  const [openComponent, setOpenComponent] = useState<string | null>(null)

  const snapshot = useService(
    () => cropService.getSnapshot(location.id, crop, stage, location.lat, location.lng),
    [location.id, location.lat, location.lng, crop, stage],
  )
  const data = snapshot.data
  const definition = CROP_LIST.find((item) => item.id === crop) ?? CROP_LIST[0]

  const thresholdData = [
    { name: `Caution WBGT`, value: definition.thresholds.wbgtCaution },
    { name: `High WBGT`, value: definition.thresholds.wbgtRed },
    { name: `Caution Tmax`, value: definition.thresholds.tmaxCaution },
    { name: `High Tmax`, value: definition.thresholds.tmaxRed },
  ]

  const componentChart = (data?.components ?? []).map((component) => ({
    name:
      component.label.length > 22
        ? `${component.label.slice(0, 21)}…`
        : component.label,
    contribution: component.contribution,
    tone: SEVERITY_CLASS[component.direction === "down" ? "safe" : "caution"],
  }))

  return (
    <FeatureShell active="Crop Health">
      <section className="kg-hero-band">
        <div className="container kg-hero-grid">
          <div>
            <p className="kg-eyebrow">{t("cropHealth.heroEyebrow")}</p>
            <h1>{t("cropHealth.heroTitle")}</h1>
            <p className="kg-hero-lead">{t("cropHealth.heroDesc")}</p>
            <LocationPicker
              value={location}
              onChange={(next) => (setLocation ? setLocation(next) : setLocationId(next.id))}
              compact
            />
          </div>

          <div className="kg-hero-panel">
            {snapshot.loading ? <Loading label={t("cropHealth.loadingScoring")} /> : null}
            {snapshot.error ? (
              <ErrorNote message={t("common.error")} onRetry={snapshot.reload} />
            ) : null}
            {data ? (
              <>
                <div className="kg-panel-head">
                  <p className="kg-eyebrow">
                    {location.village}, {location.district} &middot; PIN {location.pincode || "—"}
                  </p>
                  <span className="live-dot">{t("cropHealth.scored")}</span>
                </div>
                <div className="kg-panel-reading">
                  <strong>
                    {data.cdhi}
                    <em>/100</em>
                  </strong>
                  <div>
                    <span className="kg-panel-metric">
                      {t("cropHealth.cdhiIndex")}
                    </span>
                    <span className="kg-panel-metric">
                      {t(`common.${data.riskLevel}` as const)} {t("cropHealth.riskLevel")} · {t("common.ndvi")} {data.ndvi}
                    </span>
                  </div>
                </div>
                <SeverityBadge
                  severity={data.riskLevel}
                  label={`${t(`common.${data.riskLevel}` as const)} ${t("cropHealth.riskLevel")}`}
                />
                <ProgressBar
                  value={data.cdhi}
                  tone={data.riskLevel}
                  label={`${t("cropHealth.heatStressDays", { days: data.heatStressDays.toString(), window: data.heatStressDaysWindow.toString() })} · HSD ${data.hsi}`}
                />
                <p className="kg-panel-note">
                  {t("heatRisk.updated", { time: relativeTime(data.observedAt) })} ·{" "}
                  {t("cropHealth.soilMoistureText", { percent: data.soilMoisturePercent.toString() })}
                </p>
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
          advisoryText={data ? `Crop Health index CDHI ${data.cdhi.toFixed(0)} for ${crop.name} (${stage}). Soil moisture ${data.soilMoisturePercent}%.` : undefined}
        />
      </div>

      <RevealSection className="section kg-section">
        <div className="container">
          <div className="kg-section-head">
            <div>
              <p className="kg-eyebrow">{t("cropHealth.setupEyebrow")}</p>
              <h2>{t("cropHealth.setupTitle")}</h2>
            </div>
            <p>
              {t("cropHealth.setupDesc")}
            </p>
          </div>

          <div className="kg-select-grid">
            <Segmented
              label={t("cropHealth.cropLabel")}
              value={crop}
              onChange={(value) => setCrop(value as CropId)}
              options={CROP_LIST.map((item) => ({
                value: item.id,
                label: item.name,
                hint: item.nameLocal,
              }))}
            />
            <Segmented
              label={t("cropHealth.stageLabel")}
              value={stage}
              onChange={(value) => setStage(value as CropStage)}
              options={definition.stages.map((item) => ({
                value: item.id,
                label: item.label,
              }))}
            />
          </div>

          <div className="kg-stage-strip">
            {definition.stages.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`kg-stage-cell${stage === item.id ? " is-active" : ""
                  }`}
                onClick={() => setStage(item.id)}
              >
                <span>{item.label}</span>
                <em>{Math.round(item.sensitivity * 100)}% {t("cropHealth.sensitive")}</em>
                <small>{item.durationDays} {t("cropHealth.days")}</small>
              </button>
            ))}
          </div>
        </div>
      </RevealSection>

      <RevealSection className="section kg-section is-white">
        <div className="container">
          <div className="kg-section-head">
            <div>
              <p className="kg-eyebrow">{t("cropHealth.indicesEyebrow")}</p>
              <h2>{t("cropHealth.indicesTitle")}</h2>
              <div className="kg-active-location-pill">
                📍 Telemetry calculated for <strong>{location.village}, {location.district}</strong> (PIN {location.pincode || "—"}) &middot; Coordinates {location.lat != null ? location.lat.toFixed(2) : "19.99"}°N, {location.lng != null ? location.lng.toFixed(2) : "73.78"}°E
              </div>
            </div>
            <p>
              {t("cropHealth.indicesDesc")}
            </p>
          </div>

          <div className="kg-metric-grid">
            <Card className="kg-metric-card">
              <Metric
                label={t("cropHealth.cdhiScore")}
                value={data?.cdhi ?? "—"}
                unit="/100"
                hint={`${t(`common.${data?.riskLevel ?? "safe"}` as const)} ${t("cropHealth.riskLevel")}`}
                tone={
                  data?.riskLevel === "red"
                    ? "red"
                    : data?.riskLevel === "caution"
                      ? "caution"
                      : "green"
                }
              />
            </Card>
            <Card className="kg-metric-card">
              <Metric
                label={t("cropHealth.spiLabel")}
                value={data?.spi.toFixed(2) ?? "—"}
                hint={
                  (data?.spi ?? 0) < -1
                    ? "Severely dry"
                    : (data?.spi ?? 0) < 0
                      ? "Below normal"
                      : "At or above normal"
                }
                tone={(data?.spi ?? 0) < -0.5 ? "red" : "green"}
              />
            </Card>
            <Card className="kg-metric-card">
              <Metric
                label={t("cropHealth.soilMoistureAnomaly")}
                value={
                  data
                    ? `${data.soilMoistureAnomaly > 0 ? "+" : ""
                    }${data.soilMoistureAnomaly}`
                    : "—"
                }
                unit="%"
                hint={t("cropHealth.soilMoistureProfile", { percent: data?.soilMoisturePercent.toString() ?? "—" })}
                tone={
                  (data?.soilMoistureAnomaly ?? 0) < -4
                    ? "red"
                    : (data?.soilMoistureAnomaly ?? 0) < 0
                      ? "caution"
                      : "green"
                }
              />
            </Card>
            <Card className="kg-metric-card">
              <Metric
                label={t("cropHealth.heatStressDays", { days: (data?.heatStressDays ?? "—").toString(), window: (data?.heatStressDaysWindow ?? 10).toString() })}
                value={data?.heatStressDays ?? "—"}
                unit={`/ ${data?.heatStressDaysWindow ?? 10}`}
                hint={""}
                tone={
                  (data?.heatStressDays ?? 0) > 4
                    ? "red"
                    : (data?.heatStressDays ?? 0) > 2
                      ? "caution"
                      : "green"
                }
              />
            </Card>
            <Card className="kg-metric-card">
              <Metric
                label={t("cropHealth.hsiLabel")}
                value={data?.hsi ?? "—"}
                unit="/100"
                hint={t("cropHealth.hsiHint")}
                tone={(data?.hsi ?? 0) > 60 ? "red" : "caution"}
              />
            </Card>
            <Card className="kg-metric-card">
              <Metric
                label={t("cropHealth.hddLabel")}
                value={data?.hdd ?? "—"}
                unit="°C-days"
                hint={t("cropHealth.hddHint")}
                tone={(data?.hdd ?? 0) > 14 ? "red" : "caution"}
              />
            </Card>
          </div>

          <div className="kg-two-col">
            <Card>
              <CardHeader
                eyebrow={t("cropHealth.trendEyebrow")}
                title={t("cropHealth.trendTitle")}
                detail={t("cropHealth.trendDetail")}
              />
              <div className="kg-chart-wrap is-small">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart
                    data={data?.history ?? []}
                    margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="kg-cdhi-fill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#d68732"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="#d68732"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#eceee9" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "#777971" }}
                      interval={4}
                      axisLine={{ stroke: "#dfe0db" }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#777971" }}
                      axisLine={false}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #dfe0db",
                        fontSize: 12,
                      }}
                    />
                    <ReferenceLine
                      y={38}
                      stroke="#d68732"
                      strokeDasharray="4 4"
                    />
                    <ReferenceLine
                      y={68}
                      stroke="#b44a34"
                      strokeDasharray="4 4"
                    />
                    <Area
                      type="monotone"
                      dataKey="cdhi"
                      stroke="#d68732"
                      strokeWidth={2.2}
                      fill="url(#kg-cdhi-fill)"
                      name="CDHI"
                    />
                    <Line
                      type="monotone"
                      dataKey="soilMoisture"
                      stroke="#557d2b"
                      strokeWidth={1.8}
                      dot={false}
                      name="Soil moisture %"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader
                eyebrow={t("cropHealth.contribEyebrow")}
                title={t("cropHealth.contribTitle")}
                detail={t("cropHealth.contribDetail")}
              />
              <div className="kg-chart-wrap is-small">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={componentChart}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 12, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#eceee9" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: "#777971" }}
                      axisLine={false}
                      unit="%"
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={128}
                      tick={{ fontSize: 10, fill: "#55584f" }}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #dfe0db",
                        fontSize: 12,
                      }}
                      formatter={percentFormatter("Contribution")}
                    />
                    <Bar
                      dataKey="contribution"
                      radius={[0, 6, 6, 0]}
                      barSize={16}
                    >
                      {componentChart.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={
                            entry.tone === SEVERITY_CLASS.safe
                              ? "#639841"
                              : "#d68732"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      </RevealSection>

      <RevealSection className="section kg-section">
        <div className="container">
          <div className="kg-section-head">
            <div>
              <p className="kg-eyebrow">{t("cropHealth.explainEyebrow")}</p>
              <h2>{t("cropHealth.explainTitle")}</h2>
            </div>
            <p>
              {t("cropHealth.explainDesc")}
            </p>
          </div>

          <div className="kg-disclosure-list">
            {(data?.components ?? []).map((component) => (
              <Disclosure
                key={component.id}
                title={component.label}
                meta={`${component.value} ${component.unit} · ${component.contribution}% of score`}
                defaultOpen={openComponent === component.id}
              >
                <p>{component.explanation}</p>
                <BarRow
                  label={t("cropHealth.contribToCdhi")}
                  value={component.contribution}
                  max={100}
                  tone={
                    component.direction === "down"
                      ? "green"
                      : component.contribution > 30
                        ? "red"
                        : "caution"
                  }
                  trailing={`${component.contribution} ${t("cropHealth.pts")}`}
                />
                <span
                  className={`kg-tag ${component.direction === "down" ? "is-good" : "is-warn"
                    }`}
                >
                  {component.direction === "down"
                    ? t("cropHealth.lowersRisk")
                    : t("cropHealth.raisesRisk")}
                </span>
              </Disclosure>
            ))}
          </div>
        </div>
      </RevealSection>

      <RevealSection className="section kg-section is-white">
        <div className="container">
          <div className="kg-section-head">
            <div>
              <p className="kg-eyebrow">{t("cropHealth.cropLimitsEyebrow")}</p>
              <h2>{t("cropHealth.cropLimitsTitle")}</h2>
            </div>
            <p>
              {t("cropHealth.cropLimitsDesc", {
                crop: definition.name,
                otherCrop: CROP_LIST.filter((item) => item.id !== crop).reduce(
                  (best, item) =>
                    item.thresholds.wbgtCaution > best.thresholds.wbgtCaution
                      ? item
                      : best,
                ).name,
                moreOrLess: definition.thresholds.wbgtCaution >= 31 ? "more" : "less"
              })}
            </p>
          </div>

          <div className="kg-two-col">
            <Card>
              <CardHeader
                eyebrow={t("cropHealth.specificLimitsEyebrow")}
                title={t("cropHealth.specificLimitsTitle")}
                detail={t("cropHealth.specificLimitsDetail", { depth: definition.rootDepthMm.toString(), kc: definition.kc.toString() })}
              />
              <div className="kg-chart-wrap is-small">
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart
                    data={thresholdData}
                    margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
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
                      domain={[0, 50]}
                      unit="°"
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #dfe0db",
                        fontSize: 12,
                      }}
                      formatter={degreeFormatter("Threshold")}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={26}>
                      {thresholdData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={
                            entry.name.startsWith("Caution")
                              ? "#d68732"
                              : "#b44a34"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader
                eyebrow={t("cropHealth.allCropsEyebrow")}
                title={t("cropHealth.allCropsTitle")}
                detail={t("cropHealth.allCropsDetail")}
              />
              <div className="kg-threshold-list">
                {CROP_LIST.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`kg-threshold-row${item.id === crop ? " is-active" : ""
                      }`}
                    onClick={() => setCrop(item.id)}
                  >
                    <span className="kg-threshold-name">
                      <Sprout size={16} /> {item.name} <em>{item.nameLocal}</em>
                    </span>
                    <span className="kg-threshold-bar">
                      <i
                        style={{
                          width: `${(item.thresholds.wbgtRed / 40) * 100}%`,
                        }}
                      />
                    </span>
                    <strong>{item.thresholds.wbgtRed}°C</strong>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          <div className="kg-icon-note">
            <Sun size={17} />
            <span>
              {t("cropHealth.iconNote1", { crop: definition.name, caution: definition.thresholds.wbgtCaution.toString(), red: definition.thresholds.wbgtRed.toString() })}
            </span>
            <Droplets size={17} />
            <span>
              {t("cropHealth.iconNote2")}
            </span>
            <Waves size={17} />
            <span>
              {t("cropHealth.iconNote3")}
            </span>
            <ThermometerSun size={17} />
            <span>
              {t("cropHealth.iconNote4")}
            </span>
          </div>

          <SimulatedNotice />
        </div>
      </RevealSection>
    </FeatureShell>
  )
}
