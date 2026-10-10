import { useEffect, useRef, useState } from "react"
import { SEVERITY_LABEL, type Severity } from "../services/types"

/**
 * Shared presentational pieces for the feature screens.
 *
 * These deliberately reuse the design tokens already defined in index.css
 * (--green, --soft-green, --pale-green, --amber, --red, --earth, Manrope /
 * Inter) rather than introducing a second visual language.
 */

export { SEVERITY_LABEL }

export const SEVERITY_CLASS: Record<Severity, string> = {
  safe: "kg-safe",
  caution: "kg-caution",
  red: "kg-red",
}

export const SEVERITY_COLOR: Record<Severity, string> = {
  safe: "#639841",
  caution: "#d68732",
  red: "#b44a34",
}

export function SeverityBadge({
  severity,
  label,
}: {
  severity: Severity
  label?: string
}) {
  return (
    <span className={`kg-badge ${SEVERITY_CLASS[severity]}`}>
      {label ?? SEVERITY_LABEL[severity]}
    </span>
  )
}

export function SeverityPill({ severity }: { severity: Severity }) {
  return (
    <span
      className={`kg-severity-pill ${SEVERITY_CLASS[severity]}`}
      aria-hidden="true"
    >
      <i />
      {SEVERITY_LABEL[severity]}
    </span>
  )
}

export function SimulatedNotice({ note }: { note?: string }) {
  return null
}

export function Card({
  children,
  className = "",
  as: Tag = "section",
}: {
  children: React.ReactNode
  className?: string
  as?: "section" | "div" | "article" | "aside"
}) {
  return <Tag className={`kg-card ${className}`}>{children}</Tag>
}

export function CardHeader({
  eyebrow,
  title,
  detail,
  actions,
}: {
  eyebrow?: string
  title: string
  detail?: string
  actions?: React.ReactNode
}) {
  return (
    <header className="kg-card-head">
      <div>
        {eyebrow ? <p className="kg-eyebrow">{eyebrow}</p> : null}
        <h3>{title}</h3>
        {detail ? <p className="kg-card-detail">{detail}</p> : null}
      </div>
      {actions ? <div className="kg-card-actions">{actions}</div> : null}
    </header>
  )
}

export function Metric({
  label,
  value,
  unit,
  hint,
  tone,
}: {
  label: string
  value: string | number
  unit?: string
  hint?: string
  tone?: "default" | "caution" | "red" | "green"
}) {
  return (
    <div
      className={`kg-metric${tone && tone !== "default" ? ` is-${tone}` : ""}`}
    >
      <span className="kg-metric-label">{label}</span>
      <strong className="kg-metric-value">
        {value}
        {unit ? <em>{unit}</em> : null}
      </strong>
      {hint ? <span className="kg-metric-hint">{hint}</span> : null}
    </div>
  )
}

type Tone = Severity | "green" | "default"

function toneClass(tone: Tone): string {
  if (tone === "green") return "is-green"
  if (tone === "default") return ""
  return SEVERITY_CLASS[tone]
}

export function ProgressBar({
  value,
  tone = "default",
  label,
}: {
  value: number
  tone?: Tone
  label?: string
}) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="kg-progress">
      <div className="kg-progress-track">
        <span
          className={`kg-progress-fill ${toneClass(tone)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {label ? <span className="kg-progress-label">{label}</span> : null}
    </div>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "default",
}: {
  options: { value: T; label: string; hint?: string }[]
  value: T
  onChange: (value: T) => void
  label?: string
  size?: "default" | "small"
}) {
  return (
    <div className="kg-segmented-wrap">
      {label ? <span className="kg-field-label">{label}</span> : null}
      <div
        className={`kg-segmented${size === "small" ? " is-small" : ""}`}
        role="radiogroup"
        aria-label={label}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className={value === option.value ? "is-active" : ""}
            onClick={() => onChange(option.value)}
            title={option.hint}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  detail,
  meta,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  detail?: string
  meta?: string
}) {
  return (
    <label className={`kg-toggle${checked ? " is-on" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="kg-toggle-track" aria-hidden="true">
        <i />
      </span>
      <span className="kg-toggle-text">
        <strong>{label}</strong>
        {detail ? <small>{detail}</small> : null}
      </span>
      {meta ? <em className="kg-toggle-meta">{meta}</em> : null}
    </label>
  )
}

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
}) {
  return (
    <div className="kg-range">
      <div className="kg-range-head">
        <span className="kg-field-label">{label}</span>
        <strong>
          {value}
          {unit}
        </strong>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
      />
    </div>
  )
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  hint?: string
}) {
  return (
    <label className="kg-field">
      <span className="kg-field-label">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <small>{hint}</small> : null}
    </label>
  )
}

export function Loading({
  label = "Loading field intelligence",
}: {
  label?: string
}) {
  return (
    <div className="kg-loading" role="status">
      <span className="kg-spinner" aria-hidden="true" />
      {label}…
    </div>
  )
}

export function ErrorNote({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="kg-error" role="alert">
      <strong>Could not load this view.</strong>
      <span>{message}</span>
      {onRetry ? (
        <button type="button" className="kg-button is-light" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  )
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="kg-empty">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  )
}

/** Accessible disclosure block used for "why is my risk high" explanations. */
export function Disclosure({
  title,
  meta,
  defaultOpen = false,
  children,
}: {
  title: string
  meta?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useRef(
    `kg-disclosure-${Math.random().toString(36).slice(2, 8)}`,
  ).current
  return (
    <div className={`kg-disclosure${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="kg-disclosure-trigger"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <span>
          <strong>{title}</strong>
          {meta ? <small>{meta}</small> : null}
        </span>
        <i aria-hidden="true" />
      </button>
      <div className="kg-disclosure-body" id={id} hidden={!open}>
        {children}
      </div>
    </div>
  )
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  width = "520px",
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: string
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    panelRef.current?.focus()
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="kg-drawer-root">
      <div className="kg-drawer-scrim" onClick={onClose} role="presentation" />
      <div
        className="kg-drawer-panel"
        style={{ width: `min(${width}, 100%)` }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panelRef}
      >
        <button
          type="button"
          className="kg-drawer-close"
          onClick={onClose}
          aria-label="Close"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  )
}

export function KeyValue({
  items,
}: {
  items: { label: string; value: React.ReactNode }[]
}) {
  return (
    <dl className="kg-kv">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function BarRow({
  label,
  value,
  max,
  tone = "default",
  trailing,
}: {
  label: string
  value: number
  max: number
  tone?: Tone
  trailing?: string
}) {
  const pct = max === 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="kg-bar-row">
      <div className="kg-bar-head">
        <span>{label}</span>
        <strong>{trailing ?? value}</strong>
      </div>
      <div className="kg-bar-track">
        <span
          className={`kg-bar-fill ${toneClass(tone)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function InfoChip({
  icon,
  children,
}: {
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <span className="kg-info-chip">
      {icon}
      {children}
    </span>
  )
}
