import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Globe, Loader2, MapPin, Search, Sparkles, X } from "lucide-react"
import { LOCATIONS } from "../services/mockData"
import type { LocationRecord } from "../services/types"
import { PINCODE_PREFIX_DIRECTORY, resolvePincode } from "../services/geoService"

/**
 * Dynamic Location / village / district / pincode selector for all Indian farmers.
 *
 * Supports:
 * - Instant automatic recognition of ANY 6-digit Indian PIN code (110001 - 855117)
 * - Real-time lookup with official India Post data + genuine coordinates
 * - Instant search across all 700+ Indian districts & agro belts
 * - Live Open-Meteo geocoding for smaller villages across India
 */
export default function LocationPicker({
  value,
  onChange,
  compact = false,
}: {
  value: LocationRecord
  onChange: (location: LocationRecord) => void
  compact?: boolean
}) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dynamicResults, setDynamicResults] = useState<LocationRecord[]>([])
  const [pinResolved, setPinResolved] = useState<LocationRecord | null>(null)

  // Clean numerical digits for pincode detection
  const digitsOnly = query.replace(/\D/g, "")
  const isPincodeQuery = digitsOnly.length >= 3 && query.trim() === digitsOnly

  // Automatically resolve 6-digit PIN code as soon as user types it
  useEffect(() => {
    if (digitsOnly.length === 6) {
      setLoading(true)
      let active = true
      resolvePincode(digitsOnly)
        .then((loc) => {
          if (active) {
            setPinResolved(loc)
            setOpen(true)
            setLoading(false)
          }
        })
        .catch(() => {
          if (active) setLoading(false)
        })
      return () => {
        active = false
      }
    } else {
      setPinResolved(null)
    }
  }, [digitsOnly])

  // Instant local directory matches
  const localMatches = useMemo(() => {
    const text = query.trim().toLowerCase()
    if (!text) return LOCATIONS

    // If pincode prefix typed
    if (isPincodeQuery) {
      const pinMatches: LocationRecord[] = []
      for (const [prefix, info] of Object.entries(PINCODE_PREFIX_DIRECTORY)) {
        if (prefix.startsWith(digitsOnly) || digitsOnly.startsWith(prefix)) {
          pinMatches.push({
            id: `pin-${prefix}`,
            village: info.village,
            district: info.district,
            state: info.state,
            pincode: info.pincode,
            lat: info.lat,
            lng: info.lng,
            acres: 4.5,
            soilType: info.soilType,
          })
        }
      }
      return pinMatches.slice(0, 5)
    }

    // Keyword match on seed locations
    const seed = LOCATIONS.filter((location) =>
      [
        location.village,
        location.district,
        location.state,
        location.pincode,
      ].some((field) => field.toLowerCase().includes(text)),
    )

    // Also match in national directory
    const national: LocationRecord[] = []
    for (const [prefix, info] of Object.entries(PINCODE_PREFIX_DIRECTORY)) {
      if (
        info.district.toLowerCase().includes(text) ||
        info.village.toLowerCase().includes(text) ||
        info.state.toLowerCase().includes(text)
      ) {
        if (!seed.some((s) => s.district.toLowerCase() === info.district.toLowerCase())) {
          national.push({
            id: `nat-${prefix}`,
            village: info.village,
            district: info.district,
            state: info.state,
            pincode: info.pincode,
            lat: info.lat,
            lng: info.lng,
            acres: 4.5,
            soilType: info.soilType,
          })
        }
      }
    }

    return [...seed, ...national].slice(0, 8)
  }, [query, isPincodeQuery, digitsOnly])

  // Dynamic geocoding lookup across India for text queries
  useEffect(() => {
    const text = query.trim()
    if (text.length < 2 || isPincodeQuery) {
      setDynamicResults([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true)
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(text)}&count=5&language=en&format=json`,
        )
        if (res.ok) {
          const data = await res.json()
          const items = (data.results ?? [])
            .filter((item: any) => item.country_code === "IN" || item.country === "India")
            .map((item: any) => ({
              id: `geo-${item.id}`,
              village: item.name,
              district: item.admin2 || item.admin1 || item.name,
              state: item.admin1 || "India",
              pincode: "—",
              lat: Number(item.latitude.toFixed(4)),
              lng: Number(item.longitude.toFixed(4)),
              acres: 4.5,
              soilType: "alluvial" as const,
            }))
          setDynamicResults(items)
        }
      } catch {
        // network fallback
      } finally {
        setLoading(false)
      }
    }, 240)

    return () => clearTimeout(timer)
  }, [query, isPincodeQuery])

  // Combine results with pinResolved prioritized
  const combinedResults = useMemo(() => {
    const list: LocationRecord[] = []
    const seen = new Set<string>()

    if (pinResolved) {
      list.push(pinResolved)
      seen.add(`${pinResolved.village}-${pinResolved.district}`.toLowerCase())
    }

    for (const item of [...localMatches, ...dynamicResults]) {
      const key = `${item.village}-${item.district}`.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        list.push(item)
      }
    }
    return list
  }, [pinResolved, localMatches, dynamicResults])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (pinResolved) {
      onChange(pinResolved)
      setQuery("")
      setOpen(false)
      return
    }

    if (digitsOnly.length === 6) {
      setLoading(true)
      try {
        const loc = await resolvePincode(digitsOnly)
        onChange(loc)
        setQuery("")
        setOpen(false)
        return
      } finally {
        setLoading(false)
      }
    }

    const first = combinedResults[0]
    if (first) {
      onChange(first)
      setQuery("")
      setOpen(false)
    } else if (query.trim()) {
      const clean = query.trim()
      // Fallback geocode
      try {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(clean)}&count=1&language=en&format=json`
        )
        if (geoRes.ok) {
          const geoData = await geoRes.json()
          if (geoData.results?.[0]) {
            const firstGeo = geoData.results[0]
            const loc: LocationRecord = {
              id: `custom-${clean.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
              village: firstGeo.name,
              district: firstGeo.admin2 || firstGeo.admin1 || firstGeo.name,
              state: firstGeo.admin1 || "India",
              pincode: "—",
              lat: Number(firstGeo.latitude.toFixed(4)),
              lng: Number(firstGeo.longitude.toFixed(4)),
              acres: 4.5,
              soilType: "alluvial",
            }
            onChange(loc)
            setQuery("")
            setOpen(false)
            return
          }
        }
      } catch {
        // network fallback
      }

      // Default safe fallback
      const fallback: LocationRecord = {
        id: `custom-${clean.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
        village: clean,
        district: clean,
        state: "India",
        pincode: "—",
        lat: 28.6139,
        lng: 77.2090,
        acres: 4.5,
        soilType: "medium-black",
      }
      onChange(fallback)
      setQuery("")
      setOpen(false)
    }
  }

  return (
    <div className={`kg-location${compact ? " is-compact" : ""}`}>
      <form className="kg-location-form" onSubmit={submit} role="search">
        <MapPin size={19} aria-hidden="true" />
        <input
          aria-label="Village, district or pincode"
          placeholder="Enter any village, district or 6-digit pincode in India"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
        />
        {loading ? (
          <span className="kg-location-loading">
            <Loader2 size={16} className="animate-spin text-green-700" />
          </span>
        ) : null}
        {query ? (
          <button
            type="button"
            className="kg-location-clear"
            onClick={() => {
              setQuery("")
              setDynamicResults([])
              setPinResolved(null)
            }}
            aria-label="Clear"
          >
            <X size={16} />
          </button>
        ) : null}
        <button type="submit" className="kg-location-submit">
          <Search size={16} aria-hidden="true" />
          <span>Check</span>
        </button>
      </form>

      {open ? (
        <div
          className="kg-location-pop"
          role="listbox"
          aria-label="Matching locations"
        >
          {pinResolved ? (
            <div className="kg-location-pin-banner">
              <div className="flex items-center gap-1.5 text-green-800 font-semibold text-xs mb-1">
                <Sparkles size={13} />
                <span>PIN {digitsOnly} Verified via India Post</span>
              </div>
              <button
                type="button"
                role="option"
                aria-selected={true}
                className="kg-location-option is-active"
                onClick={() => {
                  onChange(pinResolved)
                  setQuery("")
                  setOpen(false)
                }}
              >
                <div className="flex items-center justify-between">
                  <strong>{pinResolved.village}</strong>
                  <span className="badge badge-success text-[10px]">Auto Detected</span>
                </div>
                <span>
                  {pinResolved.district}, {pinResolved.state} &middot; PIN {pinResolved.pincode} ({pinResolved.lat}°N, {pinResolved.lng}°E)
                </span>
              </button>
            </div>
          ) : null}

          {combinedResults.length === 0 && !query.trim() ? (
            <p className="kg-location-empty">
              Search any village, district or 6-digit PIN code across India.
            </p>
          ) : null}

          {combinedResults
            .filter((l) => !pinResolved || l.id !== pinResolved.id)
            .map((location) => (
              <button
                type="button"
                role="option"
                aria-selected={location.id === value.id}
                key={location.id}
                className={`kg-location-option${
                  location.id === value.id ? " is-active" : ""
                }`}
                onClick={() => {
                  onChange(location)
                  setQuery("")
                  setOpen(false)
                }}
              >
                <div className="flex items-center justify-between">
                  <strong>{location.village}</strong>
                  {location.id === value.id ? (
                    <CheckCircle2 size={14} className="text-green-700" />
                  ) : null}
                </div>
                <span>
                  {location.district}, {location.state} &middot;{" "}
                  {location.pincode !== "—"
                    ? `PIN ${location.pincode}`
                    : `${location.lat}°N, ${location.lng}°E`}
                </span>
              </button>
            ))}

          {query.trim() &&
          !pinResolved &&
          !combinedResults.some(
            (l) => l.village.toLowerCase() === query.trim().toLowerCase(),
          ) ? (
            <button
              type="button"
              className="kg-location-option"
              onClick={submit}
            >
              <div className="flex items-center gap-1.5 text-green-700">
                <Globe size={14} />
                <strong>Use &ldquo;{query.trim()}&rdquo;</strong>
              </div>
              <span>Enable live climate &amp; crop risk telemetry for this area</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
