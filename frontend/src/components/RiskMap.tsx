import { useEffect, useMemo, useRef, useState } from "react"
import { LOCATIONS } from "../services/mockData"
import { SEVERITY_LABEL, type Severity } from "../services/types"

/**
 * Interactive hyperlocal risk map (Feature 01).
 *
 * Mapbox GL JS is used when a token is configured (`VITE_MAPBOX_TOKEN`), which
 * gives real pan/zoom, vector tiles and clickable point layers. Without a token
 * the component falls back to a self-contained SVG map drawn with the same data
 * and the same interaction contract (hover tooltip, click to select, pan/zoom,
 * severity legend), so the screen is fully functional in the design preview.
 */

export interface MapPoint {
  id: string
  name: string
  lat: number
  lng: number
  weight: number
  severity: Severity
  wbgt: number
  psi: number
  population: number
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

const COLOR: Record<Severity, string> = {
  safe: "#639841",
  caution: "#d68732",
  red: "#b44a34",
}

interface Picked {
  point: MapPoint
  x: number
  y: number
}

export default function RiskMap({
  points,
  center,
  selectedWbgt,
  metric,
  onMetricChange,
  className = "",
}: {
  points: MapPoint[]
  center: { lat: number; lng: number; village: string; district: string }
  selectedWbgt: number | null
  metric: "wbgt" | "psi"
  onMetricChange: (metric: "wbgt" | "psi") => void
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import("mapbox-gl").Map | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [hovered, setHovered] = useState<Picked | null>(null)
  const [selected, setSelected] = useState<MapPoint | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{
    x: number
    y: number
    panX: number
    panY: number
  } | null>(null)

  const metricLabel = metric === "wbgt" ? "WBGT" : "Heat stress index"

  // Mapbox path -----------------------------------------------------------
  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || mapRef.current) return
    let cancelled = false
    let map: import("mapbox-gl").Map | undefined
      ; (async () => {
        const mapboxgl = (await import("mapbox-gl")).default
        await import("mapbox-gl/dist/mapbox-gl.css")
        if (cancelled || !containerRef.current) return
        mapboxgl.accessToken = MAPBOX_TOKEN
        map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/satellite-streets-v12",
          center: [center.lng, center.lat],
          zoom: 10.5,
          attributionControl: false,
        })
        mapRef.current = map
        map.on("load", () => setMapReady(true))
      })()

    return () => {
      cancelled = true
      map?.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [center.lat, center.lng])

  // Render the data as a Mapbox circle layer (and hover/click handlers).
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const geojson = {
      type: "FeatureCollection" as const,
      features: points.map((point) => ({
        type: "Feature" as const,
        properties: {
          id: point.id,
          name: point.name,
          severity: point.severity,
          severityLabel: SEVERITY_LABEL[point.severity],
          radius: point.weight,
          value:
            metric === "wbgt"
              ? `${point.wbgt.toFixed(1)}°C`
              : `${point.psi}/100`,
          population: point.population,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [point.lng, point.lat],
        },
      })),
    }

    const layerId = "kg-risk-cells"
    const sourceId = "kg-risk-source"
    const paint: import("mapbox-gl").CircleLayerSpecification["paint"] = {
      // Severity drives the fill so the legend, table and map always agree.
      "circle-color": [
        "match",
        ["get", "severity"],
        "red",
        COLOR.red,
        "caution",
        COLOR.caution,
        COLOR.safe,
      ],
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["get", "radius"],
        0,
        14,
        1,
        34,
      ],
      "circle-opacity": 0.5,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.5,
    }

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, { type: "geojson", data: geojson })
      map.addLayer({ id: layerId, type: "circle", source: sourceId, paint })
    } else {
      ; (map.getSource(sourceId) as import("mapbox-gl").GeoJSONSource).setData(
        geojson,
      )
    }

    /** queryRenderedFeatures returns feature-ish objects; read props defensively. */
    const readProperties = (
      feature: unknown,
    ): Record<string, string | number> =>
      ((feature as { properties?: Record<string, string | number> })
        .properties ?? {}) as Record<string, string | number>

    const onMove = (event: import("mapbox-gl").MapMouseEvent) => {
      const features = map.queryRenderedFeatures(event.point, {
        layers: [layerId],
      })
      if (!features.length) {
        setHovered(null)
        return
      }
      const properties = readProperties(features[0])
      const point = points.find((item) => item.id === properties.id)
      if (!point) return
      setHovered({ point, x: event.point.x, y: event.point.y })
      map.getCanvas().style.cursor = "pointer"
    }

    const onClick = (event: import("mapbox-gl").MapMouseEvent) => {
      const features = map.queryRenderedFeatures(event.point, {
        layers: [layerId],
      })
      if (!features.length) return
      const properties = readProperties(features[0])
      setSelected(points.find((item) => item.id === properties.id) ?? null)
    }

    const onLeave = () => setHovered(null)

    map.on("mousemove", onMove)
    map.on("click", onClick)
    map.on("mouseout", onLeave)
    return () => {
      map.off("mousemove", onMove)
      map.off("click", onClick)
      map.off("mouseout", onLeave)
    }
  }, [points, metric, mapReady])

  /** Projects data points into the SVG fallback viewport. */
  const projection = useMemo(() => {
    if (points.length === 0) return null
    const lats = points.map((point) => point.lat)
    const lngs = points.map((point) => point.lng)
    const minLat = Math.min(...lats, center.lat)
    const maxLat = Math.max(...lats, center.lat)
    const minLng = Math.min(...lngs, center.lng)
    const maxLng = Math.max(...lngs, center.lng)
    const padLat = Math.max((maxLat - minLat) * 0.35, 0.02)
    const padLng = Math.max((maxLng - minLng) * 0.35, 0.02)

    return (point: MapPoint) => {
      const spanLat = maxLat - minLat + padLat * 2
      const spanLng = maxLng - minLng + padLng * 2
      const x = 50 + ((point.lng - minLng - padLng) / spanLng) * 100
      const y = 50 - ((point.lat - minLat - padLat) / spanLat) * 100
      return { x, y }
    }
  }, [points, center.lat, center.lng])

  const centerPoint = projection
    ? projection({
      ...center,
      id: "center",
      name: "",
      weight: 1,
      severity: "safe",
      wbgt: 0,
      psi: 0,
      population: 0,
    })
    : null

  function onWheel(event: React.WheelEvent) {
    event.preventDefault()
    setZoom((value) =>
      Math.min(2.6, Math.max(0.8, value + (event.deltaY > 0 ? -0.12 : 0.12))),
    )
  }

  const canvasRef = useRef<HTMLDivElement>(null)

  function onPointerDown(event: React.PointerEvent) {
    ; (event.target as Element).setPointerCapture?.(event.pointerId)
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      panX: pan.x,
      panY: pan.y,
    }
  }

  function onPointerMove(event: React.PointerEvent) {
    const drag = dragRef.current
    if (drag) {
      setPan({
        x: drag.panX + (event.clientX - drag.x) / 3,
        y: drag.panY + (event.clientY - drag.y) / 3,
      })
      return
    }
    // Hover: pick the nearest rendered cell to the cursor.
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect || !projection) return
    const px = event.clientX - rect.left
    const py = event.clientY - rect.top
    let best: MapPoint | null = null
    let bestDistance = Number.POSITIVE_INFINITY
    for (const point of points) {
      const position = projection(point)
      const tx = (position.x / 100) * rect.width
      const ty = (position.y / 100) * rect.height
      const distance = Math.hypot(tx - px, ty - py)
      if (distance < bestDistance && distance < 40) {
        bestDistance = distance
        best = point
      }
    }
    setHovered(best ? { point: best, x: px, y: py } : null)
  }

  function onPointerUp() {
    dragRef.current = null
  }

  function onClick(event: React.MouseEvent) {
    if (dragRef.current) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect || !projection) return
    const px = event.clientX - rect.left
    const py = event.clientY - rect.top
    let best: MapPoint | null = null
    let bestDistance = Number.POSITIVE_INFINITY
    for (const point of points) {
      const position = projection(point)
      const distance = Math.hypot(
        (position.x / 100) * rect.width - px,
        (position.y / 100) * rect.height - py,
      )
      if (distance < bestDistance && distance < 40) {
        bestDistance = distance
        best = point
      }
    }
    setSelected(best)
  }

  const useMapbox = Boolean(MAPBOX_TOKEN) && mapReady

  return (
    <div className={`kg-map ${className}`}>
      {MAPBOX_TOKEN ? (
        <div className="kg-map-mapbox" ref={containerRef} />
      ) : null}



      {!useMapbox ? (
        <div
          className="kg-map-canvas"
          ref={canvasRef}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => {
            onPointerUp()
            setHovered(null)
          }}
          onClick={onClick}
        >
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-label={`Heat risk map for ${center.village}`}
          >
            <defs>
              <pattern
                id="kg-map-grid"
                width="4"
                height="4"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M4 0H0V4"
                  fill="none"
                  stroke="#dce4d6"
                  strokeWidth="0.15"
                />
              </pattern>
              <radialGradient id="kg-map-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={COLOR.red} stopOpacity="0.34" />
                <stop offset="100%" stopColor={COLOR.red} stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="100" height="100" fill="#eef2ea" />
            <rect width="100" height="100" fill="url(#kg-map-grid)" />
            <path
              d="M0 74 Q22 62 46 71 T100 60 L100 100 L0 100Z"
              fill="#dfe9d6"
            />
            <path
              d="M0 30 Q26 22 52 32 T100 24"
              fill="none"
              stroke="#cddcc3"
              strokeWidth="0.6"
            />
            <g
              transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}
              style={{ transformOrigin: "50px 50px" }}
            >
              {centerPoint ? (
                <circle
                  cx={centerPoint.x}
                  cy={centerPoint.y}
                  r={selectedWbgt ? 11 : 0}
                  fill="url(#kg-map-glow)"
                  opacity={selectedWbgt ? 1 : 0}
                />
              ) : null}
              {points.map((point) => {
                const position = projection?.(point)
                if (!position) return null
                const isSelected = selected?.id === point.id
                const isField =
                  selectedWbgt !== null &&
                  Math.abs(point.wbgt - selectedWbgt) < 0.35
                return (
                  <g key={point.id} className="kg-map-cell">
                    <circle
                      cx={position.x}
                      cy={position.y}
                      r={2.4 + point.weight * 3.6}
                      fill={COLOR[point.severity]}
                      fillOpacity={isSelected || isField ? 0.72 : 0.4}
                      stroke={isSelected || isField ? "#333333" : "#ffffff"}
                      strokeWidth={isSelected || isField ? 0.7 : 0.4}
                    />
                    {point.weight > 0.7 ? (
                      <circle
                        cx={position.x}
                        cy={position.y}
                        r={0.7}
                        fill="#ffffff"
                        fillOpacity={0.9}
                      />
                    ) : null}
                  </g>
                )
              })}
              {centerPoint ? (
                <g>
                  <circle
                    cx={centerPoint.x}
                    cy={centerPoint.y}
                    r={1.5}
                    fill="#333333"
                  />
                  <circle
                    cx={centerPoint.x}
                    cy={centerPoint.y}
                    r={0.6}
                    fill="#ffffff"
                  />
                </g>
              ) : null}
            </g>
          </svg>

          {hovered ? (
            <div
              className="kg-map-tooltip is-floating"
              style={{ left: hovered.x + 14, top: hovered.y + 14 }}
            >
              <strong>{hovered.point.name}</strong>
              <span>
                {metricLabel}:{" "}
                {metric === "wbgt"
                  ? `${hovered.point.wbgt.toFixed(1)}°C`
                  : `${hovered.point.psi}/100`}
              </span>
              <span>{SEVERITY_LABEL[hovered.point.severity]} risk</span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="kg-map-canvas is-mapbox">
          {hovered ? (
            <div
              className="kg-map-tooltip is-floating"
              style={{ left: hovered.x + 14, top: hovered.y + 14 }}
            >
              <strong>{hovered.point.name}</strong>
              <span>
                {metricLabel}:{" "}
                {metric === "wbgt"
                  ? `${hovered.point.wbgt.toFixed(1)}°C`
                  : `${hovered.point.psi}/100`}
              </span>
              <span>{SEVERITY_LABEL[hovered.point.severity]} risk</span>
            </div>
          ) : null}
        </div>
      )}

      <div className="kg-map-legend">
        <span className="kg-map-legend-title">{metricLabel}</span>
        {(["safe", "caution", "red"] as Severity[]).map((severity) => (
          <span key={severity}>
            <i style={{ background: COLOR[severity] }} />
            {SEVERITY_LABEL[severity]}
          </span>
        ))}
      </div>

      <footer className="kg-map-footer">
        <span>
          {center.village}, {center.district}
          {LOCATIONS.length} seed locations · {points.length} grid cells
        </span>
        <span>
          {MAPBOX_TOKEN
            ? "Mapbox GL satellite base"
            : "SVG fallback base · add VITE_MAPBOX_TOKEN for Mapbox GL"}
        </span>
      </footer>

      {selected ? (
        <div className="kg-map-detail">
          <button
            type="button"
            onClick={() => setSelected(null)}
            aria-label="Close cell detail"
          >
            ×
          </button>
          <strong>{selected.name}</strong>
          <span>
            WBGT {selected.wbgt.toFixed(1)}°C · PSI {selected.psi}/100
          </span>
          <span>
            {SEVERITY_LABEL[selected.severity]} heat risk · ~
            {selected.population.toLocaleString("en-IN")} farmers
          </span>
        </div>
      ) : null}
    </div>
  )
}
