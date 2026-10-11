/**
 * Small deterministic pseudo-random helpers.
 *
 * Every mock service needs values that stay stable while a farmer keeps the
 * same location / crop selected, but still change when they switch. A seeded
 * generator gives us that without any server round trip, and keeps the demo
 * reproducible for the same inputs.
 */

export function hashSeed(input: string): number {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function createRandom(seed: string): () => number {
  let state = hashSeed(seed) || 1
  return function random() {
    state ^= state << 13
    state >>>= 0
    state ^= state >> 17
    state ^= state << 5
    state >>>= 0
    return state / 4294967296
  }
}

export function between(
  random: () => number,
  min: number,
  max: number,
  decimals = 1,
): number {
  const value = min + random() * (max - min)
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length) % items.length]
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/** ISO timestamp `offsetMinutes` ago, so trends look like "live" data. */
export function minutesAgo(now: Date, offsetMinutes: number): string {
  return new Date(now.getTime() - offsetMinutes * 60_000).toISOString()
}

export function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86_400_000)
}

export function formatClock(iso: string | number | null | undefined): string {
  if (iso === null || iso === undefined || iso === "") return "00:00"

  const str = String(iso).trim()

  // 1. Direct time format: "14:00", "09:30", "14:00:00", "9:00"
  const timeMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (timeMatch) {
    const h = timeMatch[1].padStart(2, "0")
    const m = timeMatch[2]
    return `${h}:${m}`
  }

  // 2. ISO timestamp or date string (e.g. "2026-10-11T14:00:00Z" or "2026-10-11 14:00:00")
  try {
    let dateStr = str
    if (dateStr.includes(" ") && !dateStr.includes("T")) {
      dateStr = dateStr.replace(" ", "T")
    }
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      const h = String(date.getHours()).padStart(2, "0")
      const m = String(date.getMinutes()).padStart(2, "0")
      return `${h}:${m}`
    }
  } catch {}

  // 3. Regex fallback to extract any HH:mm inside string
  const embeddedMatch = str.match(/(?:T|\s|^)(\d{1,2}):(\d{2})/)
  if (embeddedMatch) {
    return `${embeddedMatch[1].padStart(2, "0")}:${embeddedMatch[2]}`
  }

  return "00:00"
}

export function formatDay(base: Date, days: number): string {
  try {
    const target = addDays(base, days)
    if (!isNaN(target.getTime())) {
      return target.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      })
    }
  } catch {}
  return `Day ${days + 1}`
}

export function formatStamp(iso: string): string {
  if (!iso) return "Today"
  try {
    const date = new Date(iso)
    if (!isNaN(date.getTime())) {
      const day = date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
      const time = formatClock(iso)
      return `${day}, ${time}`
    }
  } catch {}
  return "Today"
}

export function relativeTime(iso: string, now = new Date()): string {
  if (!iso) return "just now"
  try {
    const date = new Date(iso)
    if (isNaN(date.getTime())) return "recently"
    const diffMinutes = Math.round(
      (now.getTime() - date.getTime()) / 60_000,
    )
    if (diffMinutes < 1) return "just now"
    if (diffMinutes < 60) return `${diffMinutes} min ago`
    const hours = Math.round(diffMinutes / 60)
    if (hours < 24) return `${hours} hr ago`
    return `${Math.round(hours / 24)} day(s) ago`
  } catch {
    return "recently"
  }
}

