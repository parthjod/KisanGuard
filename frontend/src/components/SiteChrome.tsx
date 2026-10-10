import { Link, NavLink, useLocation } from "react-router-dom"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { useLanguage, LanguageCode } from "../state/LanguageContext"
import { TranslationKey } from "../state/LanguageContext"
import { useAuth } from "../state/AuthState"
import { UserCheck } from "lucide-react"

/**
 * Shared chrome for the feature screens. It reuses the exact navbar markup,
 * classes and breakpoints from the landing page so the design is unchanged —
 * only the "active" state and the extra feature links are additive.
 */

const storyItems: { titleKey: TranslationKey; href: string }[] = [
  { titleKey: "about.story", href: "/about" },
  { titleKey: "about.challenge", href: "/about/challenge" },
  { titleKey: "about.howItWorks", href: "/about/how-it-works" },
  { titleKey: "about.approach", href: "/about/approach" },
  { titleKey: "about.vision", href: "/about/vision" },
]

export const featureLinks: { to: string; labelKey: TranslationKey; feature: string }[] = [
  { to: "/features/heat-risk", labelKey: "home.featHeatRiskTitle", feature: "Heat Risk" },
  { to: "/features/crop-health", labelKey: "home.featCropHealthTitle", feature: "Crop Health" },
  { to: "/features/smart-irrigation", labelKey: "home.featSmartIrrigationTitle", feature: "Smart Irrigation" },
  { to: "/features/verified-alerts", labelKey: "home.featVerifiedAlertsTitle", feature: "Verified Alerts" },
  { to: "/features/personalized-alerts", labelKey: "home.featPersonalizedAlertsTitle", feature: "Personalized Alerts" },
]

export const FEATURE_ROUTES = featureLinks.map((link) => ({
  ...link,
  path: link.to,
}))

export function BrandMark() {
  return (
    <span className="brand-mark">
      <img
        className="h-full w-full rounded-full object-cover"
        src="/kisanguard-symbol.png"
        alt=""
      />
    </span>
  )
}

export function SiteNavbar({
  variant = "page",
}: {
  variant?: "page" | "home"
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const aboutNavRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const onHome = location.pathname === "/"
  const { t, language, setLanguage } = useLanguage()
  const { user, openAuthModal } = useAuth()

  useEffect(() => {
    function closeAbout(event: MouseEvent) {
      if (
        aboutNavRef.current &&
        !aboutNavRef.current.contains(event.target as Node)
      )
        setAboutOpen(false)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setAboutOpen(false)
    }
    document.addEventListener("mousedown", closeAbout)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("mousedown", closeAbout)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [])

  useEffect(() => {
    setMenuOpen(false)
    setAboutOpen(false)
  }, [location.pathname])

  return (
    <header className="navbar">
      <Link className="brand" to="/" aria-label="KisanGuard home">
        <BrandMark />
        <span>KisanGuard</span>
      </Link>
      <nav
        className={`nav-links ${menuOpen ? "open" : ""}`}
        aria-label="Main navigation"
      >
        <Link to="/" onClick={() => setMenuOpen(false)}>
          {t("navbar.home")}
        </Link>
        <div
          className={`about-nav ${aboutOpen ? "is-open" : ""}`}
          ref={aboutNavRef}
        >
          <button
            className="about-toggle"
            type="button"
            aria-expanded={aboutOpen}
            aria-controls="about-story-menu"
            onClick={() => setAboutOpen((open) => !open)}
          >
            {t("navbar.aboutUs")}
            <span className="about-chevron">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m7 9 5 5 5-5" />
              </svg>
            </span>
          </button>
          {aboutOpen ? (
            <div className="about-dropdown" id="about-story-menu">
              <div className="story-menu">
                <div className="story-links">
                  {storyItems.map((item) => (
                    <Link
                      to={item.href}
                      key={item.href}
                      className={
                        location.pathname === item.href ? "active" : ""
                      }
                      onClick={() => {
                        setAboutOpen(false)
                        setMenuOpen(false)
                      }}
                    >
                      <span>{t(item.titleKey)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <Link
          to={onHome ? "#features" : "/#features"}
          onClick={(e) => {
            setMenuOpen(false)
            if (onHome) {
              e.preventDefault()
              document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })
              window.history.pushState(null, "", "#features")
            }
          }}
        >
          {t("navbar.features")}
        </Link>
        <Link
          to={onHome ? "#field-intelligence" : "/#field-intelligence"}
          onClick={(e) => {
            setMenuOpen(false)
            if (onHome) {
              e.preventDefault()
              document.getElementById("field-intelligence")?.scrollIntoView({ behavior: "smooth" })
              window.history.pushState(null, "", "#field-intelligence")
            }
          }}
        >
          {t("navbar.forFarmers")}
        </Link>
        <Link
          to={onHome ? "#access-section" : "/#access-section"}
          onClick={(e) => {
            setMenuOpen(false)
            if (onHome) {
              e.preventDefault()
              document.getElementById("access-section")?.scrollIntoView({ behavior: "smooth" })
              window.history.pushState(null, "", "#access-section")
            }
          }}
        >
          {t("navbar.resources")}
        </Link>

        <div className="mobile-nav-actions">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false)
              openAuthModal()
            }}
            className="text-xs font-semibold text-emerald-800 py-1 cursor-pointer"
          >
            {user ? `Farmer: ${user.name} (${user.district})` : t("navbar.login")}
          </button>
          <Link
            className="button button-primary"
            to="/features/heat-risk"
            onClick={() => setMenuOpen(false)}
          >
            {t("navbar.checkMyRisk")}{" "}
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m14 7 5 5-5 5" />
            </svg>
          </Link>
        </div>
      </nav>

      {/* Desktop Actions */}
      <div className="navbar-actions">
        <div className="contact-language">
          <select
            aria-label="Choose language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as LanguageCode)}
          >
            <option value="en">EN</option>
            <option value="hi">हिन्दी</option>
            <option value="mr">मराठी</option>
            <option value="pa">ਪੰਜਾਬੀ</option>
            <option value="te">తెలుగు</option>
            <option value="bn">বাংলা</option>
          </select>
        </div>

        <button
          type="button"
          onClick={openAuthModal}
          className="farmer-profile-pill"
          title="Farmer Account &amp; Authentication"
        >
          {user ? (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
              <UserCheck size={15} className="text-emerald-700" />
              <span>{user.name}</span>
              <small className="opacity-75 font-normal">({user.district})</small>
            </>
          ) : (
            <>
              <UserCheck size={15} className="text-emerald-700" />
              <span>Log In / Register</span>
            </>
          )}
        </button>
      </div>
      <button
        className="menu-button"
        type="button"
        aria-label="Toggle menu"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? (
          <svg
            width="25"
            height="25"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        ) : (
          <svg
            width="25"
            height="25"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>
      {variant === "page" ? null : null}
    </header>
  )
}

export function FeatureSubnav({ active }: { active: string }) {
  const { t } = useLanguage()
  return (
    <nav className="kg-subnav" aria-label="Feature screens">
      <div className="container">
        {featureLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={`kg-subnav-link${active === link.feature ? " is-active" : ""
              }`}
            aria-current={active === link.feature ? "page" : undefined}
          >
            {t(link.labelKey)}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export function SiteFooter() {
  const { t } = useLanguage()
  const { user, openAuthModal } = useAuth()
  const [waPhone, setWaPhone] = useState("")
  const [subscribed, setSubscribed] = useState(() => {
    try {
      return Boolean(localStorage.getItem("kisanguard:subscribed:whatsapp"))
    } catch {
      return false
    }
  })
  const [waError, setWaError] = useState("")

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault()
    const cleaned = waPhone.replace(/\D/g, "")
    if (cleaned.length === 10) {
      try {
        localStorage.setItem("kisanguard:subscribed:whatsapp", cleaned)
      } catch {
        // ignore storage errors
      }
      setSubscribed(true)
      setWaError("")
      const waText = encodeURIComponent(
        `🌾 *KisanGuard Agromet Alert Subscription*\nNamaste KisanGuard! Please send me daily agromet advisories and voice notes for my farm.\n\nMobile: +91 ${cleaned}`
      )
      window.open(`https://wa.me/?text=${waText}`, "_blank", "noopener,noreferrer")
    } else {
      setWaError("Please enter a valid 10-digit Indian mobile number")
    }
  }

  return (
    <footer>
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link className="brand" to="/">
            <BrandMark />
            <span>KisanGuard</span>
          </Link>
          <p className="footer-tagline">
            {t("footer.taglineLine1")}
            <br />
            {t("footer.taglineLine2")}
          </p>
          <div className="mt-3 text-xs text-[#7c8077] flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-600 animate-pulse"></span>
            <span>DPDP Act 2023 Compliant &middot; IMD &amp; Sentinel-2 Telemetry</span>
          </div>
        </div>

        <div>
          <h3>About KisanGuard</h3>
          <Link to="/about">Our Mission &amp; Story</Link>
          <Link to="/about/challenge">The Climate Challenge</Link>
          <Link to="/about/how-it-works">How KisanGuard Works</Link>
          <Link to="/about/approach">Telemetry &amp; Field Approach</Link>
          <Link to="/about/vision">Vision &amp; Impact</Link>
        </div>

        <div className="footer-connect">
          <h3>WhatsApp &amp; Voice Advisories</h3>
          <p>Receive live agromet advisories and regional voice alerts directly on WhatsApp.</p>
          
          {user ? (
            <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs mb-3">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                Active: {user.name} ({user.district})
              </div>
              <p className="text-[11px] text-stone-600 mt-1">
                Dispatch Target: <strong>{user.phone}</strong> &middot; WhatsApp Agromet Advisory Active
              </p>
              <button
                type="button"
                onClick={openAuthModal}
                className="mt-2 text-[11px] text-[#2e7d32] hover:underline font-bold inline-block cursor-pointer"
              >
                Switch or update farm profile &rarr;
              </button>
            </div>
          ) : subscribed ? (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs mb-3 text-emerald-950">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                ✓ Connected to WhatsApp Agromet Alerts
              </div>
              <p className="text-[11px] text-stone-600 mt-1">
                Daily agromet voice notes and climate risk alerts are delivered directly to your WhatsApp.
              </p>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem("kisanguard:subscribed:whatsapp")
                  } catch {
                    // ignore
                  }
                  setSubscribed(false)
                  setWaPhone("")
                }}
                className="mt-2 text-[11px] text-[#2e7d32] hover:underline font-semibold block cursor-pointer"
              >
                Change mobile number &rarr;
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="footer-sms-form mb-3">
              <div className="footer-sms-input-row">
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="Enter 10-digit mobile number"
                  value={waPhone}
                  onChange={(e) => {
                    setWaPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                    if (waError) setWaError("")
                  }}
                  className="footer-sms-input"
                  aria-label="10-digit mobile number"
                />
                <button
                  type="submit"
                  className="footer-sms-btn"
                >
                  🟢 Join WhatsApp
                </button>
              </div>
              {waError && (
                <p className="footer-sms-err">
                  {waError}
                </p>
              )}
            </form>
          )}

          <Link className="footer-action" to="/features/heat-risk">
            {t("footer.checkYourRisk")}{" "}
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m14 7 5 5-5 5" />
            </svg>
          </Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>{t("footer.copyright") + " "}</span>
        <span>{t("footer.builtFor")}</span>
      </div>
      <div className="footer-landscape">
        <img
          src="/footer-landscape.png"
          alt="Green Indian farmland, trees and distant hills in natural sunlight"
        />
      </div>
    </footer>
  )
}

export function FeatureShell({
  active,
  children,
  footer = true,
}: {
  active: string
  children: ReactNode
  footer?: boolean
}) {
  return (
    <div className="site-shell kg-site">
      <SiteNavbar />
      <FeatureSubnav active={active} />
      <main>{children}</main>
      {footer ? <SiteFooter /> : null}
    </div>
  )
}
