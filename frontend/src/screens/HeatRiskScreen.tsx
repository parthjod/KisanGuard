import { Link } from "react-router-dom"
import { useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Droplets, Gauge, Thermometer, Wind } from "lucide-react"
import LocationPicker from "../components/LocationPicker"
import RiskMap from "../components/RiskMap"
import { heatTooltipFormatter } from "../components/chartFormatters"
import {
  Card,
  CardHeader,
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
import { LOCATIONS } from "../services/mockData"
import { heatService, WORK_INTENSITIES } from "../services/heatService"
import { formatClock, relativeTime } from "../services/random"
import { useAppState } from "../state/AppState"
import type { HeatSnapshot, WorkAdvice } from "../services/types"
import { useLanguage } from "../state/LanguageContext"
import { PollyVoiceBanner } from "../components/PollyVoiceBanner"

const STATUS_ICON: Record<WorkAdvice["status"], string> = {
  go: "GO",
  caution: "CAUTION",
  stop: "STOP",
}

export default function HeatRiskScreen() {
  const { location, setLocation, setLocationId } = useAppState()
  const { t } = useLanguage()
  const [metric, setMetric] = useState<"wbgt" | "psi">("wbgt")
  const [intensity, setIntensity] =
    useState<"rest" | "light" | "moderate" | "heavy">("moderate")

  const snapshot = useService(
    () => heatService.getSnapshot(location.id, location.lat, location.lng),
    [location.id, location.lat, location.lng],
  )
  const cells = useService(
    () => heatService.getRiskCells(location.id, location.lat, location.lng),
    [location.id, location.lat, location.lng],
  )
  const advice = useService(
    () => heatService.getWorkAdvice(snapshot.data?.wbgt ?? 30),
    [snapshot.data?.wbgt],
  )

  const data = snapshot.data

  /** Renders the safe window, calling out an all-day or overnight stretch. */
  function windowLabel(window: HeatSnapshot["safeWindow"]): string {
    if (window.from === "00:00" && window.to === "23:00") return t("common.all");
    const range = `${window.from} – ${window.to}`
    return window.wrapsMidnight ? `${range} (+1)` : range
  }


  return (
    <FeatureShell active="Heat Risk">
      <section className="kg-hero-band">
        <div className="container kg-hero-grid">
          <div>
            <p className="kg-eyebrow">{t("heatRisk.heroEyebrow")}</p>
            <h1>{t("heatRisk.heroTitle")}</h1>
            <p className="kg-hero-lead">{t("heatRisk.heroDesc")}</p>
            <LocationPicker
              value={location}
              onChange={(next) => (setLocation ? setLocation(next) : setLocationId(next.id))}
            />
          </div>

          <div className="kg-hero-panel">
            {snapshot.loading ? (
              <Loading label={t("heatRisk.readingLoading")} />
            ) : null}
            {snapshot.error ? (
              <ErrorNote message={t("common.error")} onRetry={snapshot.reload} />
            ) : null}
            {data ? (
              <>
                <div className="kg-panel-head">
                  <p className="kg-eyebrow">
                    {location.village}, {location.district}
                  </p>
                  <span className="live-dot">{t("common.live")}</span>
                </div>
                <div className="kg-panel-reading">
                  <strong>
                    {data.wbgt.toFixed(1)}
                    <em>°C</em>
                  </strong>
                  <div>
                    <span className="kg-panel-metric">
                      {t("heatRisk.panelMetric1")}
                    </span>
                    <span className="kg-panel-metric">
                      {t("common.psi")} {data.psi}/100 · {t(`common.${data.severity}` as const)} {t("heatRisk.panelMetric2")}
                    </span>
                  </div>
                </div>
                <SeverityBadge
                  severity={data.severity}
                  label={`${t(`common.${data.severity}` as const)} ${t("heatRisk.severityBadgeLabel")}`}
                />
                <ProgressBar
                  value={Math.min(100, (data.wbgt / 40) * 100)}
                  tone={data.severity}
                  label={t("heatRisk.progressLabel", { caution: data.thresholds.caution.toString(), red: data.thresholds.red.toString() })}
                />
                <p className="kg-panel-note">
                  {t("heatRisk.updated", { time: relativeTime(data.observedAt) })} · {t("heatRisk.safeWindow")}
                  {" "}<strong>{windowLabel(data.safeWindow)}</strong>
                </p>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {/* Alternative 2: One-Tap Vernacular Agromet Audio Player & WhatsApp Share */}
      <div className="container" style={{ marginTop: "24px", marginBottom: "8px" }}>
        <PollyVoiceBanner
          locationName={`${location.village || "Farm"}, ${location.district || "Local"}`}
          advisoryText={data?.recommendation || "High heat stress forecast. Halt field labor and spraying during peak heat hours."}
        />
      </div>

      <RevealSection className="section kg-section">
        <div className="container">
          <div className="kg-section-head">
            <div>
              <p className="kg-eyebrow">{t("heatRisk.condEyebrow")}</p>
              <h2>{t("heatRisk.condTitle")}</h2>
            </div>
            <p>
              {t("heatRisk.condDesc")}
            </p>
          </div>

          {data ? (
            <div className="kg-metric-grid">
              <Card className="kg-metric-card">
                <Metric
                  label={t("common.wbgt")}
                  value={data.wbgt.toFixed(1)}
                  unit="°C"
                  hint={t("heatRisk.metricWbgtHint")}
                  tone={
                    data.severity === "red"
                      ? "red"
                      : data.severity === "caution"
                        ? "caution"
                        : "green"
                  }
                />
              </Card>
              <Card className="kg-metric-card">
                <Metric
                  label={t("heatRisk.metricPsi")}
                  value={data.psi}
                  unit="/100"
                  hint={t("heatRisk.metricPsiHint")}
                  tone={
                    data.psi > 80 ? "red" : data.psi > 55 ? "caution" : "green"
                  }
                />
              </Card>
              <Card className="kg-metric-card">
                <Metric
                  label={t("heatRisk.metricTemp")}
                  value={data.temperature.toFixed(1)}
                  unit="°C"
                  hint={t("heatRisk.metricTempHint")}
                />
              </Card>
              <Card className="kg-metric-card">
                <Metric
                  label={t("heatRisk.metricRh")}
                  value={data.humidity}
                  unit="%"
                  hint={t("heatRisk.metricRhHint")}
                />
              </Card>
              <Card className="kg-metric-card">
                <Metric
                  label={t("heatRisk.metricFeelsLike")}
                  value={data.feelsLike.toFixed(1)}
                  unit="°C"
                  hint={t("heatRisk.metricFeelsLikeHint")}
                />
              </Card>
              <Card className="kg-metric-card">
                <Metric
                  label={t("heatRisk.metricLst")}
                  value={data.lst.toFixed(1)}
                  unit="°C"
                  hint={t("heatRisk.metricLstHint")}
                />
              </Card>
              <Card className="kg-metric-card">
                <Metric
                  label={t("common.ndvi")}
                  value={data.ndvi.toFixed(2)}
                  hint={t("heatRisk.metricNdviHint")}
                  tone="green"
                />
              </Card>
              <Card className="kg-metric-card">
                <Metric
                  label={t("heatRisk.metricWindow")}
                  value={windowLabel(data.safeWindow)}
                  hint={t("heatRisk.metricWindowHint")}
                  tone="green"
                />
              </Card>
            </div>
          ) : (
            <Loading />
          )}

          <div className="kg-icon-note">
            <Thermometer size={17} />
            <span>
              {t("heatRisk.iconNote1", { red: data?.thresholds.red.toString() ?? "40", caution: data?.thresholds.caution.toString() ?? "38" })}
            </span>
            <Wind size={17} />
            <span>
              {t("heatRisk.iconNote2")}
            </span>
          </div>
        </div>
      </RevealSection>

      <RevealSection className="section kg-section is-white">
        <div className="container">
          <div className="kg-section-head">
            <div>
              <p className="kg-eyebrow">{t("heatRisk.trendEyebrow")}</p>
              <h2>{t("heatRisk.trendTitle")}</h2>
            </div>
            <Segmented
              label={t("heatRisk.chartSeriesLabel")}
              value={metric}
              onChange={setMetric}
              options={[
                { value: "wbgt", label: "WBGT" },
                { value: "psi", label: "PSI" },
              ]}
              size="small"
            />
          </div>

          <Card>
            {snapshot.loading ? (
              <Loading label={t("heatRisk.loadingTrend")} />
            ) : null}
            {data ? (
              <div className="kg-chart-wrap">
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart
                    data={data.trend}
                    margin={{ top: 8, right: 12, left: -14, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="kg-wbgt-fill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#639841"
                          stopOpacity={0.34}
                        />
                        <stop
                          offset="100%"
                          stopColor="#639841"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#eceee9" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tickFormatter={(value: string) => formatClock(value)}
                      tick={{ fontSize: 11, fill: "#777971" }}
                      axisLine={{ stroke: "#dfe0db" }}
                      interval={3}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#777971" }}
                      axisLine={false}
                      domain={[
                        (dataMin: number) => Math.floor(dataMin - 3),
                        (dataMax: number) => Math.ceil(dataMax + 3),
                      ]}
                      unit="°"
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #dfe0db",
                        fontSize: 12,
                      }}
                      labelFormatter={(value) => formatClock(String(value))}
                      formatter={heatTooltipFormatter}
                    />
                    <ReferenceArea
                      y1={data.thresholds.caution}
                      y2={data.thresholds.red}
                      fill="#d68732"
                      fillOpacity={0.08}
                      label={{
                        value: t("common.caution"),
                        fontSize: 10,
                        fill: "#a05e25",
                        position: "insideTopRight",
                      }}
                    />
                    <ReferenceArea
                      y1={data.thresholds.red}
                      y2={45}
                      fill="#b44a34"
                      fillOpacity={0.08}
                      label={{
                        value: t("common.red"),
                        fontSize: 10,
                        fill: "#8e3524",
                        position: "insideTopRight",
                      }}
                    />
                    <ReferenceLine
                      y={data.thresholds.caution}
                      stroke="#d68732"
                      strokeDasharray="4 4"
                    />
                    <ReferenceLine
                      y={data.thresholds.red}
                      stroke="#b44a34"
                      strokeDasharray="4 4"
                    />
                    <Area
                      type="monotone"
                      dataKey="wbgt"
                      stroke="#639841"
                      strokeWidth={2.4}
                      fill="url(#kg-wbgt-fill)"
                      name="wbgt"
                      activeDot={{ r: 5, fill: "#4f7e32" }}
                    />
                    {metric === "psi" ? (
                      <Line
                        type="monotone"
                        dataKey="psi"
                        stroke="#8a7358"
                        strokeWidth={1.8}
                        strokeDasharray="5 4"
                        name="psi"
                        dot={false}
                      />
                    ) : null}
                  </AreaChart>
                </ResponsiveContainer>
                <p className="kg-chart-note">
                  {t("heatRisk.chartNote")}
                </p>
              </div>
            ) : null}
          </Card>

          <div className="kg-two-col">
            <Card>
              <CardHeader
                eyebrow={t("heatRisk.rhEyebrow")}
                title={t("heatRisk.rhTitle")}
                detail={t("heatRisk.rhDetail")}
              />
              <div className="kg-chart-wrap is-small">
                <ResponsiveContainer width="100%" height={210}>
                  <LineChart
                    data={data?.trend ?? []}
                    margin={{ top: 8, right: 12, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#eceee9" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tickFormatter={(value: string) => formatClock(value)}
                      tick={{ fontSize: 10, fill: "#777971" }}
                      interval={5}
                      axisLine={{ stroke: "#dfe0db" }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#777971" }}
                      axisLine={false}
                      unit="°"
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #dfe0db",
                        fontSize: 12,
                      }}
                      labelFormatter={(value) => formatClock(String(value))}
                    />
                    <Line
                      type="monotone"
                      dataKey="temperature"
                      stroke="#d68732"
                      strokeWidth={2}
                      dot={false}
                      name="temperature"
                    />
                    <Line
                      type="monotone"
                      dataKey="humidity"
                      stroke="#557d2b"
                      strokeWidth={2}
                      dot={false}
                      name="humidity"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader
                eyebrow={t("heatRisk.fieldEyebrow")}
                title={t("heatRisk.fieldTitle")}
              />
              <div className="kg-readout-list">
                <span>
                  <Droplets size={16} /> {t("heatRisk.metricRh")}{" "}
                  <strong>{data?.humidity ?? "—"}%</strong>
                </span>
                <span>
                  <Gauge size={16} /> {t("heatRisk.dewPoint")}{" "}
                  <strong>
                    {data
                      ? (data.temperature - data.humidity / 5).toFixed(1)
                      : "—"}
                    °C
                  </strong>
                </span>
                <span>
                  <Thermometer size={16} /> {t("heatRisk.metricLst")}{" "}
                  <strong>{data?.lst.toFixed(1) ?? "—"}°C</strong>
                </span>
                <span>
                  <Wind size={16} /> {t("heatRisk.canopyGap")}{" "}
                  <strong>
                    {data ? (data.lst - data.temperature).toFixed(1) : "—"}°C
                  </strong>
                </span>
              </div>
              <p className="kg-card-note">
                {t("heatRisk.fieldNote")}
              </p>
            </Card>
          </div>
        </div>
      </RevealSection>

      <RevealSection className="section kg-section">
        <div className="container">
          <div className="kg-section-head">
            <div>
              <p className="kg-eyebrow">{t("heatRisk.workEyebrow")}</p>
              <h2>{t("heatRisk.workTitle")}</h2>
            </div>
            <p>
              {t("heatRisk.workDesc")}
            </p>
          </div>

          <Segmented
            label={t("heatRisk.plannedActivity")}
            value={intensity}
            onChange={setIntensity}
            options={WORK_INTENSITIES.map((item) => ({
              value: item.id,
              label: item.label,
              hint: `${t("heatRisk.limit")} ${item.threshold}°C`,
            }))}
          />

          <div className="kg-advice-grid">
            {advice.loading ? (
              <Loading label={t("heatRisk.loadingAdvice")} />
            ) : null}
            {advice.data?.map((item) => (
              <Card
                key={item.id}
                className={`kg-advice-card is-${item.status}${item.id === intensity ? " is-active-selection" : ""}`}
                onClick={() => setIntensity(item.id)}
              >
                <div className="kg-advice-top">
                  <span className="kg-advice-status">
                    {STATUS_ICON[item.status]}
                  </span>
                  <h3>{item.label}</h3>
                  <p className="kg-advice-head">{item.headline}</p>
                  <p className="kg-card-detail">{item.detail}</p>
                </div>
                <ul>
                  {item.guidance.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <div className="kg-advice-card-footer">
                  {item.id === intensity ? (
                    <span className="kg-advice-active">
                      {t("heatRisk.currentlySelected")}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="kg-advice-select-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIntensity(item.id);
                      }}
                    >
                      Select this activity
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </RevealSection>

      <RevealSection className="section kg-section is-white">
        <div className="container">
          <div className="kg-section-head">
            <div>
              <p className="kg-eyebrow">{t("heatRisk.mapEyebrow")}</p>
              <h2>{t("heatRisk.mapTitle")}</h2>
            </div>
            <p>
              {t("heatRisk.mapDesc")}
            </p>
          </div>

          {cells.loading ? <Loading label={t("heatRisk.loadingCells")} /> : null}
          <RiskMap
            points={cells.data ?? []}
            center={{
              lat: location.lat,
              lng: location.lng,
              village: location.village,
              district: location.district,
            }}
            selectedWbgt={data?.wbgt ?? null}
            metric={metric}
            onMetricChange={setMetric}
          />

          <div className="kg-cell-table-wrap">
            <table className="kg-table">
              <caption>{t("heatRisk.cellTableCaption")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("heatRisk.tableColCell")}</th>
                  <th scope="col">{t("heatRisk.tableColWbgt")}</th>
                  <th scope="col">{t("heatRisk.tableColPsi")}</th>
                  <th scope="col">{t("heatRisk.tableColSeverity")}</th>
                  <th scope="col">{t("heatRisk.tableColFarmers")}</th>
                </tr>
              </thead>
              <tbody>
                {[...(cells.data ?? [])]
                  .sort((a, b) => b.wbgt - a.wbgt)
                  .slice(0, 8)
                  .map((cell) => (
                    <tr key={cell.id}>
                      <th scope="row">{cell.name}</th>
                      <td>{cell.wbgt.toFixed(1)}°C</td>
                      <td>{cell.psi}</td>
                      <td>
                        <span
                          className={`kg-badge ${SEVERITY_CLASS[cell.severity]}`}
                        >
                          {t(`common.${cell.severity}` as const)}
                        </span>
                      </td>
                      <td>{cell.population.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <SimulatedNotice />
        </div>
      </RevealSection>
    </FeatureShell>
  )
}
