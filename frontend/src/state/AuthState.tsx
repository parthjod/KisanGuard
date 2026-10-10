import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

export interface FarmerUser {
  userId: string
  name: string
  phone: string
  role: "FARMER" | "WORKER" | "ADMIN"
  state: string
  district: string
  village?: string
  pincode?: string
  lat?: number
  lng?: number
  acres?: number
  soilType?: string
  irrigationMethod?: string
  preferredLanguage?: string
  crops: string[]
  token: string
}

export const DEMO_FARMERS: FarmerUser[] = [
  {
    userId: "usr_farmer_ramesh",
    name: "Ramesh Patil",
    phone: "+91 98230 12345",
    role: "FARMER",
    state: "Maharashtra",
    district: "Nashik",
    village: "Pimpalgaon Baswant",
    pincode: "422209",
    lat: 19.9975,
    lng: 73.7898,
    acres: 4.5,
    soilType: "medium-black",
    irrigationMethod: "Drip",
    preferredLanguage: "mr",
    crops: ["wheat", "grape", "onion"],
    token: "farmer_token_ramesh_nashik_2026",
  },
  {
    userId: "usr_farmer_harpreet",
    name: "Harpreet Singh",
    phone: "+91 98765 43210",
    role: "FARMER",
    state: "Punjab",
    district: "Ludhiana",
    village: "Khanna Ward 2",
    pincode: "141401",
    lat: 30.7056,
    lng: 76.2206,
    acres: 5.5,
    soilType: "alluvial",
    irrigationMethod: "Flood / furrow",
    preferredLanguage: "pa",
    crops: ["wheat", "rice"],
    token: "farmer_token_harpreet_pb_2026",
  },
  {
    userId: "usr_farmer_sunita",
    name: "Sunita Deshmukh",
    phone: "+91 94210 98765",
    role: "FARMER",
    state: "Maharashtra",
    district: "Latur",
    village: "Ausa Road Ward 4",
    pincode: "413512",
    lat: 18.4088,
    lng: 76.5604,
    acres: 3.2,
    soilType: "medium-black",
    irrigationMethod: "Sprinkler",
    preferredLanguage: "mr",
    crops: ["soybean", "tur"],
    token: "farmer_token_sunita_latur_2026",
  },
  {
    userId: "usr_farmer_devendra",
    name: "Devendra Rathore",
    phone: "+91 98290 11223",
    role: "FARMER",
    state: "Rajasthan",
    district: "Jodhpur",
    village: "Mandore Block",
    pincode: "342004",
    lat: 26.3533,
    lng: 73.0425,
    acres: 6.0,
    soilType: "sandy",
    irrigationMethod: "Sprinkler",
    preferredLanguage: "hi",
    crops: ["millet", "mustard"],
    token: "farmer_token_devendra_rj_2026",
  },
  {
    userId: "usr_farmer_suresh",
    name: "Suresh Reddy",
    phone: "+91 94401 83294",
    role: "FARMER",
    state: "Telangana",
    district: "Warangal",
    village: "Geesugonda Block",
    pincode: "506002",
    lat: 17.9689,
    lng: 79.5941,
    acres: 3.8,
    soilType: "red",
    irrigationMethod: "Drip",
    preferredLanguage: "te",
    crops: ["cotton", "maize"],
    token: "farmer_token_suresh_wgl_2026",
  },
]

const AUTH_STORAGE_KEY = "kisanguard:auth:user:v2"
const TOKEN_STORAGE_KEY = "kisanguard_auth_token_v2"
const REGISTERED_STORAGE_KEY = "kisanguard:registered:farmers:v1"

interface AuthContextType {
  user: FarmerUser | null
  registeredFarmers: FarmerUser[]
  allFarmers: FarmerUser[]
  login: (user: FarmerUser) => void
  logout: () => void
  registerFarmer: (newUser: FarmerUser) => void
  isAuthModalOpen: boolean
  openAuthModal: () => void
  closeAuthModal: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [registeredFarmers, setRegisteredFarmers] = useState<FarmerUser[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(REGISTERED_STORAGE_KEY)
      if (stored) return JSON.parse(stored) as FarmerUser[]
    } catch {
      // fallback
    }
    return []
  })

  const [user, setUser] = useState<FarmerUser | null>(() => {
    if (typeof window === "undefined") return null
    try {
      const stored = window.localStorage.getItem(AUTH_STORAGE_KEY)
      if (stored) return JSON.parse(stored) as FarmerUser
    } catch {
      // fallback
    }
    return null
  })

  const [isAuthModalOpen, setAuthModalOpen] = useState(false)

  useEffect(() => {
    if (user) {
      try {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
        window.localStorage.setItem(TOKEN_STORAGE_KEY, user.token)
      } catch {
        // quota
      }
    } else {
      try {
        window.localStorage.removeItem(AUTH_STORAGE_KEY)
        window.localStorage.removeItem(TOKEN_STORAGE_KEY)
      } catch {
        // ignore
      }
    }
  }, [user])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        REGISTERED_STORAGE_KEY,
        JSON.stringify(registeredFarmers),
      )
    } catch {
      // quota
    }
  }, [registeredFarmers])

  const login = useCallback((newUser: FarmerUser) => {
    setUser(newUser)
    setAuthModalOpen(false)
  }, [])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  const registerFarmer = useCallback((newUser: FarmerUser) => {
    setRegisteredFarmers((prev) => {
      const filtered = prev.filter((f) => f.userId !== newUser.userId && f.phone !== newUser.phone)
      return [newUser, ...filtered]
    })
    setUser(newUser)
    setAuthModalOpen(false)
  }, [])

  const openAuthModal = useCallback(() => setAuthModalOpen(true), [])
  const closeAuthModal = useCallback(() => setAuthModalOpen(false), [])

  const allFarmers = [...registeredFarmers, ...DEMO_FARMERS]

  return (
    <AuthContext.Provider
      value={{
        user,
        registeredFarmers,
        allFarmers,
        login,
        logout,
        registerFarmer,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
