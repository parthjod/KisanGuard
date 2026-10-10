import type { TooltipProps } from "recharts"

/**
 * Shared Recharts tooltip formatters.
 *
 * `TooltipProps["formatter"]` is the only exported shape that matches what a
 * `<Tooltip formatter={...} />` prop expects, so every screen builds its
 * formatter through these helpers instead of casting at the call site.
 */

type Formatter = NonNullable<TooltipProps["formatter"]>

function suffixFormatter(suffix: string, label: string): Formatter {
  return (value, name) => [`${value}${suffix}`, label || String(name)]
}

export const percentFormatter = (label = ""): Formatter =>
  suffixFormatter("%", label)
export const degreeFormatter = (label = ""): Formatter =>
  suffixFormatter("°C", label)
export const millimetreFormatter = (label = ""): Formatter =>
  suffixFormatter(" mm", label)

/** WBGT and PSI share one axis on the 24-hour trend, so they share one formatter. */
export const heatTooltipFormatter: Formatter = (value, name) => [
  name === "psi" ? `${value}/100` : `${value}°C`,
  String(name).toUpperCase(),
]
