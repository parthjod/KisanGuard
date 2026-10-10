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

export function formatClock(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

export function formatDay(base: Date, days: number): string {
  return addDays(base, days).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  })
}

export function formatStamp(iso: string): string {
  const date = new Date(iso)
  return `${date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}, ${date.toLocaleTimeString(
    "en-IN",
    { hour: "2-digit", minute: "2-digit", hour12: false },
  )}`
}

export function relativeTime(iso: string, now = new Date()): string {
  const diffMinutes = Math.round(
    (now.getTime() - new Date(iso).getTime()) / 60_000,
  )
  if (diffMinutes < 1) return "just now"
  if (diffMinutes < 60) return `${diffMinutes} min ago`
  const hours = Math.round(diffMinutes / 60)
  if (hours < 24) return `${hours} hr ago`
  return `${Math.round(hours / 24)} day(s) ago`
}
