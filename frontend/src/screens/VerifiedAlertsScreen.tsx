import { useMemo, useState } from "react"
import {
  Activity,
  Bot,
  CheckCircle2,
  Clock,
  Languages,
  MapPin,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { percentFormatter } from "../components/chartFormatters"
import {
  Card,
  CardHeader,
  Drawer,
  EmptyState,
  ErrorNote,
  KeyValue,
  Loading,
  ProgressBar,
  SEVERITY_CLASS,
  SEVERITY_LABEL,
  Segmented,
  SeverityBadge,
  SimulatedNotice,
} from "../components/ui"
import { FeatureShell } from "../components/SiteChrome"
import { RevealSection, RevealCard } from "../components/Reveal"
import { useService } from "../hooks/useService"
import { alertService, appendAcknowledgement } from "../services/alertService"
import { analyticsEvents } from "../services/apiClient"
import { formatStamp, relativeTime } from "../services/random"
import type {
  AlertChannel,
  AlertRecord,
  AuditEvent,
  Severity,
  VerificationStatus,
} from "../services/types"

import { useAuth } from "../state/AuthState"
import { useAppState } from "../state/AppState"

const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  "ai-verified": "AI verified",
  "human-reviewed": "Human reviewed",
  pending: "Pending verification",
}

const VERIFICATION_ICON: Record<VerificationStatus, typeof Bot> = {
  "ai-verified": Bot,
  "human-reviewed": UserCheck,
  pending: Clock,
}

const CHANNEL_LABEL: Record<AlertChannel, string> = {
  whatsapp: "WhatsApp Voice Note",
  web: "Web & Polly Audio",
  sms: "WhatsApp Voice Note",
  voice: "Amazon Polly Audio",
  push: "Web Telemetry",
}

const SEVERITY_ORDER: Severity[] = ["red", "caution", "safe"]

export default function VerifiedAlertsScreen() {
  const { user } = useAuth()
  const { location } = useAppState()
  const [scope, setScope] = useState<"all" | "my-farm">("all")
  const [severity, setSeverity] = useState<"all" | Severity>("all")
  const [verification, setVerification] = useState<"all" | VerificationStatus>(
    "all",
  )
  const [query, setQuery] = useState("")
  const [openId, setOpenId] = useState<string | null>(null)

  const alerts = useService(
    () => alertService.listAlerts(location),
    [location.id, location.lat, location.lng],
  )
  const detail = useService(
    () => (openId ? alertService.getAlert(openId) : Promise.resolve(null)),
    [openId],
  )
  /** Acknowledged alerts are appended to their own timeline so the audit trail grows. */
  const [acknowledged, setAcknowledged] = useState<Record<string, AuditEvent>>(
    {},
  )

  async function acknowledge(alert: AlertRecord) {
    analyticsEvents.track("alert-acknowledged", {
      alertId: alert.id,
      severity: alert.severity,
    })
    const ack = await alertService.acknowledge(alert.id)
    setAcknowledged((previous) => ({ ...previous, [alert.id]: ack.event }))
  }

  const activeDistrict = (user?.district || location.district || "").toLowerCase()

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase()
    return (alerts.data ?? []).filter((alert) => {
      const loc = typeof alert.location === "object" && alert.location !== null ? alert.location : null
      const village = loc?.village ?? (typeof alert.location === "string" ? alert.location : "")
      const district = loc?.district ?? ""
      const pincode = loc?.pincode ?? ""

      // Scope check: my-farm filters to the user's district, state or crops
      if (scope === "my-farm" && activeDistrict) {
        const matchesDistrict = district.toLowerCase().includes(activeDistrict) || village.toLowerCase().includes(activeDistrict)
        const matchesCrop = Array.isArray(user?.crops) ? user.crops.some((c) => alert.crop?.toLowerCase().includes(c.toLowerCase())) : false
        if (!matchesDistrict && !matchesCrop && alert.severity !== "red") return false
      }

      const severityOk = severity === "all" || alert.severity === severity
      const verificationOk =
        verification === "all" || alert.verification === verification
      const textOk =
        !text ||
        [
          alert.id ?? "",
          alert.title ?? "",
          village,
          district,
          pincode,
        ].some((field) => field.toLowerCase().includes(text))
      return severityOk && verificationOk && textOk
    })
  }, [alerts.data, severity, verification, query, scope, activeDistrict, user?.crops])

  const stats = useMemo(() => {
    const list = alerts.data ?? []
    return {
      red: list.filter((alert) => alert.severity === "red").length,
      caution: list.filter((alert) => alert.severity === "caution").length,
      safe: list.filter((alert) => alert.severity === "safe").length,
      pending: list.filter((alert) => alert.verification === "pending").length,
      reach: list.reduce((sum, alert) => sum + (alert.audienceCount || 0), 0),
      acknowledged: list.reduce(
        (sum, alert) => sum + (alert.acknowledgedCount || 0),
        0,
      ),
    }
  }, [alerts.data])

  const confidenceData = (alerts.data ?? []).slice(0, 10).map((alert) => ({
    id: (alert.id || "").replace("ALT-", "#"),
    confidence: alert.confidence || 85,
    fill:
      alert.verification === "pending"
        ? "#d68732"
        : alert.severity === "red"
          ? "#b44a34"
          : "#639841",
  }))

  const selected =
    detail.data ??
    (alerts.data ?? []).find((alert) => alert.id === openId) ??
    null

  return (
    <FeatureShell active="Verified Alerts">
      <section className="kg-hero-band is-compact">
        <div className="container">
          <p className="kg-eyebrow">Alerts &amp; verification</p>
          <h1>Every alert, and how it was verified.</h1>
          <p className="kg-hero-lead">
            Severity, confidence score, verification state and a full audit
            trail — so a farmer can tell the difference between a model estimate
            and an advisory a human signed off.
          </p>
          <div className="kg-active-location-pill my-3">
            📍 Showing verified bulletins for <strong>{location.village}, {location.district}</strong> (PIN {location.pincode || "—"}) &middot; State Agromet Cell &amp; KVK Review Network
          </div>

          <div className="kg-alert-stats">
            {SEVERITY_ORDER.map((level) => (
              <div key={level} className={`kg-stat-tile is-${level}`}>
                <span>
                  {level === "safe"
                    ? "Safe"
                    : level === "caution"
                      ? "Caution"
                      : "Red"}
                </span>
                <strong>{stats[level]}</strong>
                <em>in last 72 hours</em>
              </div>
            ))}
            <div className="kg-stat-tile">
              <span>Pending review</span>
              <strong>{stats.pending}</strong>
              <em>awaiting a field officer</em>
            </div>
            <div className="kg-stat-tile">
              <span>Reach</span>
              <strong>{stats.reach.toLocaleString("en-IN")}</strong>
              <em>
                {Math.round(
                  (stats.acknowledged / Math.max(1, stats.reach)) * 100,
                )}
                % acknowledged
              </em>
            </div>
          </div>
        </div>
      </section>

      <RevealSection className="section kg-section is-white">
        <div className="container">
          <div className="kg-section-head">
            <div>
              <p className="kg-eyebrow">Verification mix</p>
              <h2>Confidence against review state</h2>
            </div>
            <p>
              Pending alerts carry a reduced confidence score until a human
              confirms them.
            </p>
          </div>

          <div className="kg-two-col">
            <Card>
              <CardHeader
                eyebrow="Confidence score"
                title="Last ten alerts"
                detail="Bar colour follows the verification state"
              />
              <div className="kg-chart-wrap is-small">
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart
                    data={confidenceData}
                    margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#eceee9" vertical={false} />
                    <XAxis
                      dataKey="id"
                      tick={{ fontSize: 10, fill: "#777971" }}
                      axisLine={{ stroke: "#dfe0db" }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#777971" }}
                      axisLine={false}
                      domain={[40, 100]}
                      unit="%"
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #dfe0db",
                        fontSize: 12,
                      }}
                      formatter={percentFormatter("Confidence")}
                    />
                    <Bar
                      dataKey="confidence"
                      radius={[6, 6, 0, 0]}
                      barSize={20}
                    >
                      {confidenceData.map((entry) => (
                        <Cell key={entry.id} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader
                eyebrow="How verification works"
                title="Three states, one rule"
              />
              <div className="kg-verify-legend">
                {([
                  "ai-verified",
                  "human-reviewed",
                  "pending",
                ] as VerificationStatus[]).map((state) => {
                  const Icon = VERIFICATION_ICON[state]
                  return (
                    <div key={state} className={`kg-verify-row is-${state}`}>
                      <Icon size={20} className="kg-verify-icon" />
                      <div className="kg-verify-text-wrap">
                        <strong className="kg-verify-title">{VERIFICATION_LABEL[state]}</strong>
                        <p className="kg-verify-desc">
                          {state === "ai-verified"
                            ? "Two model passes agreed within tolerance. Released automatically."
                            : state === "human-reviewed"
                              ? "A block agriculture officer confirmed local conditions and signed it off."
                              : "Held back from voice broadcast until a field officer confirms it."}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="kg-card-note">
                Red alerts are never sent on a single model pass alone — either
                a cross-check or a human must clear them first.
              </p>
            </Card>
          </div>
        </div>
      </RevealSection>

      <RevealSection className="section kg-section">
        <div className="container">
          <div className="kg-section-head">
            <div>
              <p className="kg-eyebrow">Alert history</p>
              <h2>{filtered.length} alerts</h2>
            </div>
            <p>
              Open any alert for the full detail, delivery channels and audit
              timeline.
            </p>
          </div>

          <div className="kg-filters">
            <Segmented
              label="Scope"
              value={scope}
              onChange={(v) => setScope(v as "all" | "my-farm")}
              options={[
                { value: "all", label: "National Network" },
                {
                  value: "my-farm",
                  label: user ? `My Farm (${user.district})` : "My Farm",
                },
              ]}
              size="small"
            />
            <Segmented
              label="Severity"
              value={severity}
              onChange={setSeverity}
              options={[
                { value: "all", label: "All" },
                { value: "red", label: "Red" },
                { value: "caution", label: "Caution" },
                { value: "safe", label: "Safe" },
              ]}
              size="small"
            />
            <Segmented
              label="Verification"
              value={verification}
              onChange={setVerification}
              options={[
                { value: "all", label: "All" },
                { value: "ai-verified", label: "AI" },
                { value: "human-reviewed", label: "Human" },
                { value: "pending", label: "Pending" },
              ]}
              size="small"
            />
            <label className="kg-search">
              <Search size={16} />
              <input
                aria-label="Search alerts"
                placeholder="Search ID, village or district"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>

          {alerts.loading ? <Loading label="Loading alert history" /> : null}
          {alerts.error ? (
            <ErrorNote message={alerts.error} onRetry={alerts.reload} />
          ) : null}
          {!alerts.loading && filtered.length === 0 ? (
            <EmptyState
              title="No alerts match these filters"
              text="Clear the severity or verification filter to see the full history."
            />
          ) : null}

          <div className="kg-alert-list">
            {filtered.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onOpen={() => setOpenId(alert.id)}
              />
            ))}
          </div>

          <SimulatedNotice note="Alert records are generated by a mock verification service for demo purposes." />
        </div>
      </RevealSection>

      <Drawer
        open={Boolean(openId)}
        onClose={() => setOpenId(null)}
        title={selected ? selected.title : "Alert detail"}
        width="560px"
      >
        {detail.loading ? <Loading label="Loading alert detail" /> : null}
        {selected ? (
          <AlertDetail
            alert={selected}
            extraEvent={openId ? acknowledged[openId] : undefined}
            onAcknowledge={() => acknowledge(selected)}
          />
        ) : null}
      </Drawer>
    </FeatureShell>
  )
}

function AlertRow({
  alert,
  onOpen,
}: {
  alert: AlertRecord
  onOpen: () => void
}) {
  const Icon = VERIFICATION_ICON[alert.verification] || ShieldCheck
  const loc = typeof alert.location === "object" && alert.location !== null ? alert.location : null
  const village = loc?.village || (typeof alert.location === "string" ? alert.location : "Maharashtra")
  const district = loc?.district || ""
  const locLabel = district && village !== district ? `${village}, ${district}` : village
  const wbgtVal = typeof alert.wbgt === "number" ? alert.wbgt.toFixed(1) : "30.5"
  const reach = alert.audienceCount || 0
  const ack = alert.acknowledgedCount || 0

  return (
    <button
      type="button"
      className={`kg-alert-row is-${alert.severity || "caution"}`}
      onClick={onOpen}
    >
      <span
        className={`kg-alert-stripe ${SEVERITY_CLASS[alert.severity] || "is-caution"}`}
        aria-hidden="true"
      />
      <div className="kg-alert-main">
        <div className="kg-alert-titles">
          <span className="kg-alert-id">{alert.id}</span>
          <SeverityBadge
            severity={alert.severity || "caution"}
            label={SEVERITY_LABEL[alert.severity] || "Caution"}
          />
          <span className={`kg-verify-pill is-${alert.verification || "ai-verified"}`}>
            <Icon size={13} /> {VERIFICATION_LABEL[alert.verification] || "AI Verified"}
          </span>
        </div>
        <h3>{alert.title}</h3>
        <p>{alert.message}</p>
        <div className="kg-alert-meta">
          <span>
            <MapPin size={13} /> {locLabel}
          </span>
          <span>
            <Activity size={13} /> WBGT {wbgtVal}°C · PSI{" "}
            {alert.psi || 50}
          </span>
          <span>
            <Languages size={13} /> {alert.language || "EN"} ·{" "}
            {CHANNEL_LABEL[alert.channel] || "WhatsApp Voice Note"}
          </span>
          <span>
            <Users size={13} />{" "}
            {ack.toLocaleString("en-IN")}/
            {reach.toLocaleString("en-IN")} acted
          </span>
        </div>
      </div>
      <div className="kg-alert-side">
        <span className="kg-confidence">{alert.confidence || 88}%</span>
        <small>confidence</small>
        <span className="kg-alert-time">{relativeTime(alert.createdAt)}</span>
      </div>
    </button>
  )
}

function AlertDetail({
  alert,
  extraEvent,
  onAcknowledge,
}: {
  alert: AlertRecord
  extraEvent?: AuditEvent
  onAcknowledge: () => void
}) {
  const withAck = extraEvent ? appendAcknowledgement(alert, extraEvent) : alert
  const acknowledged = (withAck.timeline || []).some((event) => event.id === "ack")
  const VerificationIcon = VERIFICATION_ICON[alert.verification] || ShieldCheck
  const loc = typeof alert.location === "object" && alert.location !== null ? alert.location : null
  const locStr = loc ? `${loc.village || ""}, ${loc.district || ""}${loc.pincode ? ` (${loc.pincode})` : ""}` : (typeof alert.location === "string" ? alert.location : "India")
  const wbgtVal = typeof alert.wbgt === "number" ? `${alert.wbgt.toFixed(1)}°C` : "30.5°C"
  const tempVal = typeof alert.temperature === "number" ? `${alert.temperature.toFixed(1)}°C` : "34.0°C"
  const reach = alert.audienceCount || 0
  const ack = alert.acknowledgedCount || 0

  return (
    <div className="kg-drawer-content">
      <header className="kg-drawer-head">
        <p className="kg-eyebrow">{alert.id}</p>
        <h2>{alert.title}</h2>
        <p className="kg-drawer-local">{alert.titleLocal || ""}</p>
        <div className="kg-drawer-badges">
          <SeverityBadge
            severity={alert.severity || "caution"}
            label={`${SEVERITY_LABEL[alert.severity] || "Caution"} severity`}
          />
          <span className={`kg-verify-pill is-${alert.verification || "ai-verified"}`}>
            <VerificationIcon size={13} />{" "}
            {VERIFICATION_LABEL[alert.verification] || "AI Verified"}
          </span>
        </div>
      </header>

      <section className="kg-drawer-section">
        <p className="kg-drawer-message">{alert.message}</p>
        {alert.messageLocal ? <p className="kg-drawer-message is-local">{alert.messageLocal}</p> : null}
      </section>

      <section className="kg-drawer-section">
        <h4>Measured conditions</h4>
        <KeyValue
          items={[
            {
              label: "Location",
              value: locStr,
            },
            { label: "WBGT", value: wbgtVal },
            { label: "Heat stress index", value: `${alert.psi || 50}/100` },
            {
              label: "Air temperature",
              value: tempVal,
            },
            { label: "Humidity", value: `${alert.humidity || 50}%` },
            { label: "Raised at", value: formatStamp(alert.createdAt) },
          ]}
        />
      </section>

      <section className="kg-drawer-section">
        <h4>Recommendation</h4>
        <p className="kg-drawer-reco">{alert.recommendation}</p>
      </section>

      <section className="kg-drawer-section">
        <h4>Delivery</h4>
        <KeyValue
          items={[
            { label: "Primary channel", value: CHANNEL_LABEL[alert.channel] || "WhatsApp Voice Note" },
            {
              label: "Language",
              value: `${alert.language || "EN"} · rendered in the persona's language`,
            },
            {
              label: "Audience",
              value: `${reach.toLocaleString("en-IN")} farmers`,
            },
            {
              label: "Acknowledged",
              value: `${ack.toLocaleString("en-IN")} (${Math.round((ack / Math.max(1, reach)) * 100)}%)`,
            },
          ]}
        />
        <div className="kg-delivery-chips">
          {(["whatsapp", "web"] as AlertChannel[]).map(
            (channel) => (
              <span
                key={channel}
                className={alert.channel === channel ? "is-primary" : ""}
              >
                {CHANNEL_LABEL[channel]}
              </span>
            ),
          )}
        </div>
      </section>

      <section className="kg-drawer-section">
        <h4>Confidence</h4>
        <ProgressBar
          value={alert.confidence}
          tone={alert.verification === "pending" ? "caution" : alert.severity}
          label={`${alert.confidence}% model confidence`}
        />
        <p className="kg-card-note">
          Confidence blends model agreement with input freshness. Pending alerts
          are shown with a deliberately lower score until a human confirms them.
        </p>
      </section>

      <section className="kg-drawer-section">
        <h4>Verification timeline</h4>
        <ol className="kg-timeline">
          {withAck.timeline.map((event) => (
            <li key={`${event.id}-${event.at}`} className={`is-${event.actor}`}>
              <span className="kg-timeline-dot" aria-hidden="true" />
              <div>
                <strong>{event.label}</strong>
                <p>{event.detail}</p>
                <em>
                  {formatStamp(event.at)} · {event.actor}
                </em>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="kg-drawer-section">
        <h4>Status</h4>
        <p className="kg-ack-state">
          {acknowledged ? (
            <>
              <CheckCircle2 size={16} /> Acknowledged by the subscriber — logged
              in the audit trail.
            </>
          ) : (
            <>
              <ShieldCheck size={16} /> Not yet acknowledged. Delivery and open
              rates are being tracked.
            </>
          )}
        </p>
        {!acknowledged ? (
          <button type="button" className="kg-button" onClick={onAcknowledge}>
            <CheckCircle2 size={16} /> Acknowledge this alert
          </button>
        ) : null}
      </section>
    </div>
  )
}
