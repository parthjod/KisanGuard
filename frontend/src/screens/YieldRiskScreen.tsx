import { Link } from "react-router-dom"
import { useState } from "react"
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  TrendingUp,
} from "lucide-react"
import LocationPicker from "../components/LocationPicker"
import { percentFormatter } from "../components/chartFormatters"
import {
  Card,
  CardHeader,
  ErrorNote,
  Loading,
  Metric,
  ProgressBar,
  SEVERITY_CLASS,
  SEVERITY_LABEL,
  Segmented,
  SeverityBadge,
  SimulatedNotice,
} from "../components/ui"
import { FeatureShell } from "../components/SiteChrome"
import { useService } from "../hooks/useService"
import { cropService } from "../services/cropService"
import { CROP_LIST } from "../services/mockData"
import { yieldRiskService } from "../services/yieldRiskService"
import { formatDay, relativeTime } from "../services/random"
import { useAppState } from "../state/AppState"
import type { CropId, CropStage, YieldForecast } from "../services/types"

export default function YieldRiskScreen() {
  const { location, setLocation, setLocationId, crop, setCrop, stage, setStage } =
    useAppState()
  const [horizon, setHorizon] = useState<"7" | "14">("14")

  const health = useService(
    () => cropService.getSnapshot(location.id, crop, stage, location.lat, location.lng),
    [location.id, location.lat, location.lng, crop, stage],
  )
  // The forecast needs the CDHI snapshot, so it waits for the health load to settle.
  const forecast = useService<YieldForecast | null>(
    async () =>
      health.data
        ? yieldRiskService.getForecast(
          location.id,
          crop,
          stage,
          health.data,
          location.lat,
          location.lng,
        )
        : null,
    [location.id, location.lat, location.lng, crop, stage, health.data],
  )

  const data = forecast.data
  const definition = CROP_LIST.find((item) => item.id === crop) ?? CROP_LIST[0]
  const visibleSeries = (data?.series ?? [])
    .slice(0, horizon === "7" ? 7 : 14)
    // Recharts renders a range area when the datapoint is a [low, high] tuple.
    .map((point) => ({
      ...point,
      band: [point.band.low, point.band.high] as [number, number],
    }))
  return (
    <FeatureShell active="Yield Risk">
      <section className="kg-hero-band">
        <div className="container kg-hero-grid">
          <div>
            <p className="kg-eyebrow">14-day yield risk</p>
            <h1>
              Yield loss, forecast
              <br />
              14 days out.
            </h1>
            <p className="kg-hero-lead">
              A probability curve, not a guarantee — built from the current
              CDHI, the crop stage and the heat window. Every forecast carries a
              recommended action and the loss it would avoid.
            </p>
            <LocationPicker
              value={location}
              onChange={(next) => (setLocation ? setLocation(next) : setLocationId(next.id))}
              compact
            />
          </div>

          <div className="kg-hero-panel">
            {forecast.loading || health.loading ? (
              <Loading label="Running the forecast" />
            ) : null}
            {forecast.error ? (
              <ErrorNote message={forecast.error} onRetry={forecast.reload} />
            ) : null}
            {data ? (
              <>
                <div className="kg-panel-head">
                  <p className="kg-eyebrow">
                    {definition.name} · {stage.replace(/-/g, " ")}
                  </p>
                  <span className="live-dot">Model run</span>
                </div>
                <div className="kg-panel-reading">
                  <strong>
                    {data.currentLossProbability}
                    <em>% risk</em>
                  </strong>
                  <div>
                    <span className="kg-panel-metric">
                      Current yield-loss probability
                    </span>
                    <span className="kg-panel-metric">
                      Projected {data.projectedLossProbability}% in{" "}
                      {data.horizonDays} days
                    </span>
                  </div>
                </div>
                <SeverityBadge
                  severity={
                    visibleSeries[visibleSeries.length - 1]?.severity ??
                    "caution"
                  }
                  label={`${data.projectedLossProbability -
                    data.currentLossProbability >
                    0
                    ? "Rising"
                    : "Falling"
                    } trend`}
                />
                <ProgressBar
                  value={data.currentLossProbability}
                  tone="caution"
                  label={`Confidence ${data.confidence}%`}
                />
                <p className="kg-panel-note">
                  Generated {relativeTime(data.generatedAt)}
                </p>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <section className="section kg-section">
        <div className="container">
          <div className="kg-section-head">
            <div>
              <p className="kg-eyebrow">Forecast inputs</p>
              <h2>What this forecast is based on</h2>
            </div>
            <p>
              Crop and stage are shared with the Crop Health screen, so both
              always describe the same field.
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
              label="Horizon"
              value={horizon}
              onChange={(value) => setHorizon(value as "7" | "14")}
              options={[
                { value: "7", label: "Next 7 days" },
                { value: "14", label: "Next 14 days" },
              ]}
              size="small"
            />
          </div>

          {health.data ? (
            <div className="kg-metric-grid">
              <Card className="kg-metric-card">
                <Metric
                  label="Current CDHI"
                  value={health.data.cdhi}
                  unit="/100"
                  hint="From the Crop Health screen"
                  tone={
                    health.data.riskLevel === "red"
                      ? "red"
                      : health.data.riskLevel === "caution"
                        ? "caution"
                        : "green"
                  }
                />
              </Card>
              <Card className="kg-metric-card">
                <Metric
                  label="Heat stress days"
                  value={health.data.heatStressDays}
                  unit={`/ ${health.data.heatStressDaysWindow}`}
                  hint="Days above crop threshold"
                />
              </Card>
              <Card className="kg-metric-card">
                <Metric
                  label="Soil moisture"
                  value={health.data.soilMoisturePercent}
                  unit="%"
                  hint={`Anomaly ${health.data.soilMoistureAnomaly > 0 ? "+" : ""
                    }${health.data.soilMoistureAnomaly}%`}
                />
              </Card>
              <Card className="kg-metric-card">
                <Metric
                  label="Forecast confidence"
                  value={data?.confidence ?? "—"}
                  unit="%"
                  hint="Model agreement across the ensemble"
                  tone="green"
                />
              </Card>
            </div>
          ) : (
            <Loading />
          )}
        </div>
      </section>

      <section className="section kg-section is-white">
        <div className="container">
          <div className="kg-section-head">
            <div>
              <p className="kg-eyebrow">Probability curve</p>
              <h2>Yield-loss probability, day by day</h2>
            </div>
            <p>
              The band shows the model’s plausible range; the solid line is the
              central estimate.
            </p>
          </div>

          <Card>
            {forecast.loading ? <Loading label="Projecting 14 days" /> : null}
            {data ? (
              <div className="kg-chart-wrap">
                <ResponsiveContainer width="100%" height={340}>
                  <ComposedChart
                    data={visibleSeries}
                    margin={{ top: 8, right: 14, left: -14, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="kg-yield-band"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#b44a34"
                          stopOpacity={0.16}
                        />
                        <stop
                          offset="100%"
                          stopColor="#b44a34"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#eceee9" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "#777971" }}
                      axisLine={{ stroke: "#dfe0db" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#777971" }}
                      axisLine={false}
                      domain={[0, 100]}
                      unit="%"
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #dfe0db",
                        fontSize: 12,
                      }}
                      formatter={percentFormatter()}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceArea
                      y1={60}
                      y2={100}
                      fill="#b44a34"
                      fillOpacity={0.06}
                      label={{
                        value: "High risk",
                        fontSize: 10,
                        fill: "#8e3524",
                        position: "insideTopRight",
                      }}
                    />
                    <ReferenceArea
                      y1={32}
                      y2={60}
                      fill="#d68732"
                      fillOpacity={0.06}
                      label={{
                        value: "Moderate",
                        fontSize: 10,
                        fill: "#a05e25",
                        position: "insideTopRight",
                      }}
                    />
                    <ReferenceLine
                      y={32}
                      stroke="#d68732"
                      strokeDasharray="4 4"
                    />
                    <ReferenceLine
                      y={60}
                      stroke="#b44a34"
                      strokeDasharray="4 4"
                    />
                    <Area
                      type="monotone"
                      dataKey="band"
                      name="range"
                      fill="url(#kg-yield-band)"
                      stroke="none"
                    />
                    <Line
                      type="monotone"
                      dataKey="probability"
                      name="Probability"
                      stroke="#b44a34"
                      strokeWidth={2.6}
                      dot={{ r: 2.5, fill: "#b44a34" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="withActionProbability"
                      name="If action is taken"
                      stroke="#639841"
                      strokeWidth={2.2}
                      strokeDasharray="6 4"
                      dot={{ r: 2.5, fill: "#639841" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
                <p className="kg-chart-note">
                  The “range” band is the ensemble spread. The dashed green line
                  is the same forecast with the recommended action applied — the
                  gap between the two lines is the loss the action avoids.
                </p>
              </div>
            ) : null}
          </Card>

          <div className="kg-two-col">
            <Card>
              <CardHeader
                eyebrow="Risk zones"
                title="Where the loss comes from"
                detail="Contribution by driver, at the end of the horizon"
              />
              <div className="kg-zone-list">
                {(data?.zones ?? []).map((zone) => (
                  <div
                    key={zone.id}
                    className={`kg-zone-row is-${zone.severity}`}
                  >
                    <div className="kg-zone-head">
                      <strong>{zone.label}</strong>
                      <span
                        className={`kg-badge ${SEVERITY_CLASS[zone.severity]}`}
                      >
                        {zone.probability}%
                      </span>
                    </div>
                    <ProgressBar
                      value={zone.probability}
                      tone={zone.severity}
                    />
                    <p>{zone.cropImpact}</p>
                    <div className="kg-zone-drivers">
                      {zone.drivers.map((driver) => (
                        <span key={driver}>{driver}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader
                eyebrow="Before and after"
                title="Action vs no action"
                detail="Loss probability at four checkpoints"
                actions={<TrendingUp size={18} aria-hidden="true" />}
              />
              <div className="kg-chart-wrap is-small">
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart
                    data={data?.withoutAction ?? []}
                    margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
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
                      domain={[0, 100]}
                      unit="%"
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #dfe0db",
                        fontSize: 12,
                      }}
                      formatter={percentFormatter()}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      dataKey="without"
                      name="Without action"
                      fill="#b44a34"
                      radius={[6, 6, 0, 0]}
                      barSize={20}
                    />
                    <Bar
                      dataKey="with"
                      name="With action"
                      fill="#639841"
                      radius={[6, 6, 0, 0]}
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {data ? (
                <div className="kg-comparison-summary">
                  {data.withoutAction.map((point, index) => (
                    <div key={point.label}>
                      <span>{point.label}</span>
                      <strong className="is-bad">{point.without}%</strong>
                      <ArrowRight size={13} aria-hidden="true" />
                      <strong className="is-good">
                        {data.withoutAction[index].with}%
                      </strong>
                    </div>
                  ))}
                </div>
              ) : null}
            </Card>
          </div>
        </div>
      </section>

      <section className="section kg-section">
        <div className="container">
          <div className="kg-section-head">
            <div>
              <p className="kg-eyebrow">Recommended action</p>
              <h2>What to do, and by when</h2>
            </div>
            <p>
              This action is generated from the same forecast series shown
              above.
            </p>
          </div>

          {data ? (
            <Card className={`kg-action-card is-${data.action.severity}`}>
              <div className="kg-action-main">
                <span className="kg-action-icon">
                  <CalendarClock size={24} />
                </span>
                <div>
                  <p className="kg-eyebrow">
                    {SEVERITY_LABEL[data.action.severity]} priority
                  </p>
                  <h3>{data.action.title}</h3>
                  <p className="kg-card-detail">{data.action.detail}</p>
                  <p className="kg-action-window">
                    <CalendarClock size={15} /> Window:{" "}
                    <strong>{data.action.window}</strong>
                  </p>
                </div>
              </div>
              <div className="kg-action-avoidance">
                <CheckCircle2 size={20} />
                <strong>{data.action.expectedLossAvoidancePct}%</strong>
                <span>
                  expected loss avoided at day {horizon === "7" ? 7 : 14}
                </span>
              </div>
              <ul className="kg-action-list">
                {data.action.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
              <div className="kg-action-links">
                <Link className="kg-button" to="/features/smart-irrigation">
                  Open irrigation plan <ArrowRight size={16} />
                </Link>
                <Link
                  className="kg-button is-light"
                  to="/features/verified-alerts"
                >
                  See related alerts
                </Link>
              </div>
            </Card>
          ) : (
            <Loading label="Building recommended action" />
          )}

          <SimulatedNotice />
        </div>
      </section>

      <section className="section kg-section is-white">
        <div className="container">
          <div className="kg-section-head">
            <div>
              <p className="kg-eyebrow">Horizon detail</p>
              <h2>Daily readout</h2>
            </div>
            <p>
              Probability, action-adjusted probability and model band for each
              forecast day.
            </p>
          </div>

          <div className="kg-cell-table-wrap">
            <table className="kg-table">
              <caption>14-day forecast series</caption>
              <thead>
                <tr>
                  <th scope="col">Day</th>
                  <th scope="col">Date</th>
                  <th scope="col">Probability</th>
                  <th scope="col">Band</th>
                  <th scope="col">With action</th>
                  <th scope="col">Zone</th>
                </tr>
              </thead>
              <tbody>
                {(data?.series ?? []).map((point) => (
                  <tr key={point.day}>
                    <th scope="row">+{point.day}</th>
                    <td>{point.date}</td>
                    <td>{point.probability}%</td>
                    <td>
                      {point.band.low}–{point.band.high}%
                    </td>
                    <td className="is-good">{point.withActionProbability}%</td>
                    <td>
                      <span
                        className={`kg-badge ${SEVERITY_CLASS[point.severity]}`}
                      >
                        {SEVERITY_LABEL[point.severity]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="kg-card-note">
            Probability is a model output, not a promise. Use it to sequence
            actions and to decide when to re-check the forecast — the
            recommended action window matters more than any single number.
          </p>
        </div>
      </section>
    </FeatureShell>
  )
}
