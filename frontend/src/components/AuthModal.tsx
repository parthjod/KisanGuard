import { useState } from "react"
import {
  Check,
  ChevronRight,
  LogOut,
  MapPin,
  Phone,
  ShieldCheck,
  Sprout,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { FarmerUser, useAuth } from "../state/AuthState"
import { useAppState } from "../state/AppState"
import { LOCATIONS } from "../services/mockData"
import { resolvePincode } from "../services/geoService"

export default function AuthModal() {
  const { user, login, logout, registerFarmer, allFarmers, isAuthModalOpen, closeAuthModal } = useAuth()
  const { setLocation, setLocationId } = useAppState()
  const [tab, setTab] = useState<"switch" | "register">("switch")

  // Registration form fields
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [pincode, setPincode] = useState("")
  const [state, setState] = useState("Maharashtra")
  const [district, setDistrict] = useState("Nashik")
  const [village, setVillage] = useState("")
  const [crop, setCrop] = useState("wheat")
  const [acres, setAcres] = useState("4.0")
  const [irrigation, setIrrigation] = useState("Drip")
  const [soilType, setSoilType] = useState("medium-black")
  const [lang, setLang] = useState("hi")
  const [resolvingPin, setResolvingPin] = useState(false)
  const [resolvedNote, setResolvedNote] = useState<string | null>(null)

  if (!isAuthModalOpen) return null

  async function handlePinChange(val: string) {
    setPincode(val)
    const digits = val.replace(/\D/g, "")
    if (digits.length === 6) {
      setResolvingPin(true)
      try {
        const res = await resolvePincode(digits)
        if (res) {
          setState(res.state)
          setDistrict(res.district)
          if (res.postOffices?.[0]) {
            setVillage(res.postOffices[0].name)
          }
          const sLower = res.state.toLowerCase()
          if (sLower.includes("punjab") || sLower.includes("haryana") || sLower.includes("uttar")) {
            setSoilType("alluvial")
          } else if (sLower.includes("rajasthan")) {
            setSoilType("sandy")
          } else if (sLower.includes("telangana") || sLower.includes("andhra") || sLower.includes("tamil") || sLower.includes("karnataka")) {
            setSoilType("red")
          } else {
            setSoilType("medium-black")
          }
          setResolvedNote(`✓ Auto-detected: ${res.district}, ${res.state}`)
        }
      } catch {
        // ignore
      } finally {
        setResolvingPin(false)
      }
    } else {
      setResolvedNote(null)
    }
  }

  function handleSelectDemo(farmer: FarmerUser) {
    login(farmer)
    // Synchronize app location
    if (farmer.lat && farmer.lng) {
      setLocation({
        id: `farmer-${farmer.userId}`,
        village: farmer.village || farmer.district,
        district: farmer.district,
        state: farmer.state,
        pincode: farmer.pincode || "—",
        lat: farmer.lat,
        lng: farmer.lng,
        acres: farmer.acres || 4.0,
        soilType: (farmer.soilType as any) || (farmer.state === "Punjab" ? "alluvial" : "medium-black"),
      })
    } else {
      const match = LOCATIONS.find(
        (l) => l.district.toLowerCase() === farmer.district.toLowerCase(),
      )
      if (match) setLocationId(match.id)
    }
    closeAuthModal()
  }

  function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return

    const cleanPhone = phone.startsWith("+91") ? phone : `+91 ${phone.trim()}`
    const newUser: FarmerUser = {
      userId: `usr_custom_${Date.now()}`,
      name: name.trim(),
      phone: cleanPhone,
      role: "FARMER",
      state: state.trim(),
      district: district.trim(),
      village: village.trim() || district.trim(),
      pincode: pincode.trim(),
      acres: parseFloat(acres) || 4.0,
      soilType: soilType,
      irrigationMethod: irrigation,
      preferredLanguage: lang,
      crops: [crop],
      token: `farmer_token_${Date.now()}`,
    }

    registerFarmer(newUser)

    // Set custom location
    setLocation({
      id: `custom-${newUser.userId}`,
      village: newUser.village || newUser.district,
      district: newUser.district,
      state: newUser.state,
      pincode: newUser.pincode || "—",
      lat: state === "Punjab" ? 30.7 : state === "Rajasthan" ? 26.3 : state === "Telangana" ? 17.9 : 19.9,
      lng: state === "Punjab" ? 76.2 : state === "Rajasthan" ? 73.0 : state === "Telangana" ? 79.5 : 73.8,
      acres: newUser.acres || 4.0,
      soilType: soilType as any,
    })

    closeAuthModal()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={closeAuthModal}
    >
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-stone-200 text-stone-800 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2e7d32] text-white shadow-sm font-semibold">
              <User size={20} />
            </div>
            <div>
              <h3 id="auth-modal-title" className="text-base font-bold text-stone-900 leading-tight">
                Farmer Identity &amp; Farm Access
              </h3>
              <p className="text-xs text-stone-500">
                AWS Cognito &middot; DPDP Act 2023 Compliant &middot; Hyperlocal Risk Profile
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current status bar */}
        {user ? (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs text-emerald-900">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>
                Active Farm: <strong>{user.name}</strong> ({user.village || user.district}, {user.district}) · PIN {user.pincode || "—"}
              </span>
            </div>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-red-600 font-medium cursor-pointer"
            >
              <LogOut size={13} /> Log out
            </button>
          </div>
        ) : (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2 text-xs text-amber-900 shrink-0">
            <ShieldCheck size={14} className="text-amber-700 shrink-0" />
            <span>Select any farmer profile below to test live risk intelligence, or register your own farm.</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-stone-200 px-6 pt-3 bg-stone-50 shrink-0 gap-4">
          <button
            type="button"
            onClick={() => setTab("switch")}
            className={`pb-2.5 text-xs font-bold uppercase tracking-wide border-b-2 transition flex items-center gap-1.5 ${
              tab === "switch"
                ? "border-[#2e7d32] text-[#2e7d32]"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <Users size={14} />
            Test With 5 Farmer Profiles ({allFarmers.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("register")}
            className={`pb-2.5 text-xs font-bold uppercase tracking-wide border-b-2 transition flex items-center gap-1.5 ${
              tab === "register"
                ? "border-[#2e7d32] text-[#2e7d32]"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <UserPlus size={14} />
            Register New Farmer
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {tab === "switch" ? (
            <div className="space-y-3">
              <p className="text-xs text-stone-600">
                Click any farmer to instantly load their genuine landholding, soil profile, and telemetry:
              </p>
              <div className="grid gap-2.5">
                {allFarmers.map((f) => {
                  const isActive = user?.userId === f.userId
                  return (
                    <div
                      key={f.userId}
                      onClick={() => handleSelectDemo(f)}
                      className={`group p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-3 ${
                        isActive
                          ? "border-[#2e7d32] bg-emerald-50/60 shadow-xs"
                          : "border-stone-200 hover:border-emerald-400 hover:bg-stone-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold uppercase shrink-0 ${
                            isActive
                              ? "bg-[#2e7d32] text-white"
                              : "bg-stone-100 text-stone-700 group-hover:bg-emerald-100 group-hover:text-emerald-800"
                          }`}
                        >
                          {f.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-stone-900 group-hover:text-emerald-950">
                              {f.name}
                            </span>
                            {isActive && (
                              <span className="px-1.5 py-0.5 rounded-sm bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                            <MapPin size={11} className="text-stone-400" />
                            <span>
                              {f.village || f.district}, {f.district} ({f.state}) · PIN {f.pincode || "—"}
                            </span>
                          </div>
                          <div className="text-xs text-stone-600 flex items-center gap-1.5 mt-1 font-medium">
                            <Sprout size={11} className="text-emerald-600" />
                            <span>
                              Crops: {f.crops.join(", ")} · {f.acres ? `${f.acres} acres` : "Landholding"} {f.irrigationMethod ? `· ${f.irrigationMethod}` : ""}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 transition flex items-center gap-1 ${
                          isActive
                            ? "bg-[#2e7d32] text-white"
                            : "bg-stone-100 text-stone-700 group-hover:bg-[#2e7d32] group-hover:text-white"
                        }`}
                      >
                        {isActive ? <Check size={13} /> : null}
                        {isActive ? "Active" : "Select"}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Farmer Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Balwinder Singh"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#2e7d32]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Mobile Number (WhatsApp &amp; Alerts) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#2e7d32]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    PIN Code (6 Digits)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => handlePinChange(e.target.value)}
                    placeholder="e.g. 147001"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#2e7d32]"
                  />
                  {resolvingPin && <span className="text-[10px] text-stone-500">Resolving postal zone...</span>}
                  {resolvedNote && <span className="text-[10px] text-emerald-700 font-medium">{resolvedNote}</span>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    District *
                  </label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g. Patiala"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#2e7d32]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Punjab"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#2e7d32]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Village / Block
                  </label>
                  <input
                    type="text"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    placeholder="e.g. Samana Block"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#2e7d32]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Primary Crop
                  </label>
                  <select
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#2e7d32]"
                  >
                    <option value="wheat">Wheat</option>
                    <option value="rice">Rice (Paddy)</option>
                    <option value="cotton">Cotton</option>
                    <option value="soybean">Soybean</option>
                    <option value="millet">Pearl Millet (Bajra)</option>
                    <option value="maize">Maize</option>
                    <option value="sorghum">Sorghum (Jowar)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Landholding (Acres)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={acres}
                    onChange={(e) => setAcres(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#2e7d32]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Irrigation Delivery Method
                  </label>
                  <select
                    value={irrigation}
                    onChange={(e) => setIrrigation(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#2e7d32]"
                  >
                    <option value="Drip">Drip Irrigation (90% eff)</option>
                    <option value="Sprinkler">Sprinkler (75% eff)</option>
                    <option value="Flood / furrow">Flood / furrow (60% eff)</option>
                    <option value="Farm pond / check dam">Farm pond / check dam</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Soil Classification
                  </label>
                  <select
                    value={soilType}
                    onChange={(e) => setSoilType(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#2e7d32]"
                  >
                    <option value="alluvial">Indo-Gangetic Alluvial Loam</option>
                    <option value="medium-black">Deep Black Vertisol (Heavy Clay)</option>
                    <option value="sandy">Arid / Sandy Loam (High Drainage)</option>
                    <option value="red">Red Sandy Loam (Moderate Retention)</option>
                    <option value="clay">Clayey Loam</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Advisory Language &amp; Polly Voice
                  </label>
                  <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-[#2e7d32]"
                  >
                    <option value="hi">हिन्दी (Aditi - Neural)</option>
                    <option value="pa">ਪੰਜਾਬੀ (Gurpreet - Neural)</option>
                    <option value="mr">मराठी (Aarohi - Neural)</option>
                    <option value="te">తెలుగు (Chitra - Neural)</option>
                    <option value="bn">বাংলা (Bengali Neural)</option>
                    <option value="en">English (Kajal - Neural)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-[#2e7d32] hover:bg-[#256628] text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserPlus size={15} />
                  Register Farmer &amp; Launch Hyperlocal Dashboard
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
