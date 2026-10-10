import { lazy, Suspense } from "react"
import { Route, Routes } from "react-router-dom"
import HomePage from "../pages/HomePage"
import { Loading } from "../components/ui"
import { SiteFooter, SiteNavbar } from "../components/SiteChrome"

/**
 * Feature screens are code-split so the landing page keeps its original bundle
 * shape and each screen loads only what it needs.
 */

const HeatRiskScreen = lazy(() => import("../screens/HeatRiskScreen"))
const CropHealthScreen = lazy(() => import("../screens/CropHealthScreen"))
const YieldRiskScreen = lazy(() => import("../screens/YieldRiskScreen"))
const SmartIrrigationScreen = lazy(
  () => import("../screens/SmartIrrigationScreen"),
)
const VerifiedAlertsScreen = lazy(
  () => import("../screens/VerifiedAlertsScreen"),
)
const PersonalizedAlertsScreen = lazy(
  () => import("../screens/PersonalizedAlertsScreen"),
)
const AboutScreen = lazy(() => import("../screens/AboutScreen"))

function ScreenFallback() {
  return (
    <div className="site-shell">
      <SiteNavbar />
      <main className="kg-route-loading">
        <Loading label="Opening feature screen" />
      </main>
    </div>
  )
}

export function AppRoutes() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/features/heat-risk" element={<HeatRiskScreen />} />
        <Route path="/features/crop-health" element={<CropHealthScreen />} />
        <Route path="/features/yield-risk" element={<YieldRiskScreen />} />
        <Route
          path="/features/smart-irrigation"
          element={<SmartIrrigationScreen />}
        />
        <Route
          path="/features/verified-alerts"
          element={<VerifiedAlertsScreen />}
        />
        <Route
          path="/features/personalized-alerts"
          element={<PersonalizedAlertsScreen />}
        />
        {/* Yield risk is a sub-screen of Crop Health in the product model */}
        <Route
          path="/features/crop-health/yield-risk"
          element={<YieldRiskScreen />}
        />
        {/* About Screen */}
        <Route path="/about/*" element={<AboutScreen />} />

        <Route path="*" element={<HomePage />} />
      </Routes>
    </Suspense>
  )
}
