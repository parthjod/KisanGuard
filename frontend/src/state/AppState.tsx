import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { DEFAULT_PREFERENCES } from "../services/preferenceService"
import { LOCATIONS, PERSONAS } from "../services/mockData"
import type {
  AlertChannel,
  AlertPreferences,
  CropId,
  CropStage,
  LocationId,
  LocationRecord,
  Persona,
} from "../services/types"
import { useAuth } from "./AuthState"

/**
 * One selection context shared by every feature screen, so a farmer picks a
 * location once and the heat, crop, yield, irrigation and alert screens all
 * describe the same field. Persisted to localStorage to survive a refresh.
 */

interface AppState {
  locationId: LocationId
  setLocationId: (id: LocationId) => void
  location: LocationRecord
  setLocation?: (loc: LocationRecord) => void
  crop: CropId
  setCrop: (crop: CropId) => void
  stage: CropStage
  setStage: (stage: CropStage) => void
  persona: Persona
  setPersonaId: (id: string) => void
  preferences: AlertPreferences
  setPreferences: (
    updater: (previous: AlertPreferences) => AlertPreferences,
  ) => void
  toggleChannel: (channel: AlertChannel) => void
}

const AppContext = createContext<AppState | null>(null)

const STORAGE_KEY = "kisanguard:selection:v2"

interface PersistedState {
  locationId: LocationId
  location?: LocationRecord
  crop: CropId
  stage: CropStage
  personaId: string
  preferences: AlertPreferences
}

function readPersisted(): Partial<PersistedState> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Partial<PersistedState>) : {}
  } catch {
    return {}
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const persisted = useMemo(readPersisted, [])

  // Initial location derived from persisted state or logged-in user
  const initialLocation = useMemo<LocationRecord>(() => {
    if (persisted.location && persisted.location.lat) {
      return persisted.location
    }
    if (user) {
      const match = LOCATIONS.find(
        (l) => l.district.toLowerCase() === user.district.toLowerCase()
      )
      if (match) return match
      return {
        id: user.district.toLowerCase(),
        village: user.village || user.district,
        district: user.district,
        state: user.state,
        pincode: user.pincode || "—",
        lat: user.lat ?? (user.state === "Punjab" ? 30.7056 : user.state === "Rajasthan" ? 26.3533 : 19.9975),
        lng: user.lng ?? (user.state === "Punjab" ? 76.2206 : user.state === "Rajasthan" ? 73.0425 : 73.7898),
        acres: 4.5,
        soilType: user.state === "Punjab" ? "alluvial" : "medium-black",
      }
    }
    return LOCATIONS[0]
  }, [persisted.location, user])

  const [customLocation, setCustomLocation] = useState<LocationRecord | null>(
    persisted.location ?? initialLocation
  )

  const [locationId, setLocationIdState] = useState<LocationId>(
    (persisted.locationId || initialLocation.id) as LocationId
  )
  const [crop, setCropState] = useState<CropId>(
    persisted.crop ?? (Array.isArray(user?.crops) ? (user?.crops[0] as CropId) : DEFAULT_PREFERENCES.crops[0])
  )
  const [stage, setStageState] = useState<CropStage>(
    persisted.stage ?? "flowering"
  )
  const [personaId, setPersonaIdState] = useState<string>(
    persisted.personaId ?? (user?.userId.replace("usr_farmer_", "") ?? DEFAULT_PREFERENCES.personaId)
  )
  const [preferences, setPreferencesState] = useState<AlertPreferences>(
    persisted.preferences ?? {
      ...DEFAULT_PREFERENCES,
      language: user?.state === "Punjab" ? "PA" : (user?.state === "Maharashtra" ? "MR" : "HI"),
      crops: Array.isArray(user?.crops) && user.crops.length > 0 ? (user.crops as CropId[]) : DEFAULT_PREFERENCES.crops,
    }
  )

  // Sync state when active farmer account changes
  useEffect(() => {
    if (user) {
      const userLoc = LOCATIONS.find(
        (l) => l.district.toLowerCase() === user.district.toLowerCase()
      ) ?? {
        id: user.district.toLowerCase(),
        village: user.village || user.district,
        district: user.district,
        state: user.state,
        pincode: user.pincode || "—",
        lat: user.lat ?? (user.state === "Punjab" ? 30.7056 : user.state === "Rajasthan" ? 26.3533 : 19.9975),
        lng: user.lng ?? (user.state === "Punjab" ? 76.2206 : user.state === "Rajasthan" ? 73.0425 : 73.7898),
        acres: 4.5,
        soilType: user.state === "Punjab" ? "alluvial" : "medium-black",
      }

      setCustomLocation(userLoc)
      setLocationIdState(userLoc.id as LocationId)
      if (Array.isArray(user.crops) && user.crops[0]) {
        setCropState(user.crops[0] as CropId)
      }
      const personaKey = user.userId.replace("usr_farmer_", "")
      setPersonaIdState(personaKey)
      setPreferencesState((prev) => ({
        ...prev,
        personaId: personaKey,
        language: user.state === "Punjab" ? "PA" : (user.state === "Maharashtra" ? "MR" : "HI"),
        crops: Array.isArray(user.crops) && user.crops.length > 0 ? (user.crops as CropId[]) : prev.crops,
      }))
    }
  }, [user])

  const setLocation = useCallback((loc: LocationRecord) => {
    setCustomLocation(loc)
    setLocationIdState(loc.id as LocationId)
  }, [])

  const setLocationId = useCallback((id: LocationId) => {
    setLocationIdState(id)
    const match = LOCATIONS.find((item) => item.id === id)
    if (match) {
      setCustomLocation(match)
    }
  }, [])

  const setCrop = useCallback((c: CropId) => {
    setCropState(c)
  }, [])

  const setStage = useCallback((s: CropStage) => {
    setStageState(s)
  }, [])

  const setPersonaId = useCallback((pId: string) => {
    setPersonaIdState(pId)
  }, [])

  const setPreferences = useCallback(
    (updater: (previous: AlertPreferences) => AlertPreferences) => {
      setPreferencesState(updater)
    },
    []
  )

  const toggleChannel = useCallback((channel: AlertChannel) => {
    setPreferencesState((prev) => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: !prev.channels[channel],
      },
    }))
  }, [])

  const location = useMemo<LocationRecord>(() => {
    if (customLocation && customLocation.id === locationId) {
      return customLocation
    }
    if (
      customLocation &&
      (String(locationId).startsWith("pin-") ||
        String(locationId).startsWith("nat-") ||
        String(locationId).startsWith("geo-") ||
        String(locationId).startsWith("custom-"))
    ) {
      return customLocation
    }
    const match = LOCATIONS.find((item) => item.id === locationId)
    if (match) return match
    if (customLocation) return customLocation
    return LOCATIONS[0]
  }, [locationId, customLocation])

  useEffect(() => {
    const payload: PersistedState = {
      locationId,
      location,
      crop,
      stage,
      personaId,
      preferences,
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // storage unavailable
    }
  }, [locationId, location, crop, stage, personaId, preferences])

  const persona = useMemo(
    () => PERSONAS.find((item) => item.id === personaId) ?? PERSONAS[0],
    [personaId]
  )

  const value: AppState = {
    locationId,
    setLocationId,
    location,
    setLocation,
    crop,
    setCrop,
    stage,
    setStage,
    persona,
    setPersonaId,
    preferences,
    setPreferences,
    toggleChannel,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppState(): AppState {
  const context = useContext(AppContext)
  if (!context)
    throw new Error("useAppState must be used inside AppStateProvider")
  return context
}
