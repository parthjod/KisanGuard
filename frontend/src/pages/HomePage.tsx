import { useState, useEffect, useRef, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { SiteFooter, SiteNavbar } from "../components/SiteChrome"
import { RevealSection, RevealCard } from "../components/Reveal"
import { LOCATIONS } from "../services/mockData"
import { useAppState } from "../state/AppState"
import { useLanguage, TranslationKey } from "../state/LanguageContext"
import { useAuth, DEMO_FARMERS } from "../state/AuthState"

/**
 * Landing page.
 *
 * The markup, classes and imagery below are unchanged from the original Figma
 * export. The only functional additions are:
 *  - each feature card is now a router link to its dedicated screen (the `.feature-card`
 *    class is reused, so the design is identical), and
 *  - the hero "Check Risk" form routes into the Heat Risk screen.
 */

const heroImage =
  "https://images.unsplash.com/photo-1528693404014-b13ebe6e723e?auto=format&fit=crop&w=2200&q=88"
const farmerImage =
  "https://images.unsplash.com/photo-1767880408267-e9f64de1fe7a?auto=format&fit=crop&w=1600&q=86"
const cropRowsImage = "/heat-risk-field.png"
const irrigationImage = "/smart-irrigation-field.png"

type IconName = "arrow" | "leaf" | "heat" | "water" | "bell" | "shield" | "pin" | "satellite" | "phone" | "voice" | "web" | "check" | "chevron" | "menu" | "close"

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m14 7 5 5-5 5" />
      </>
    ),
    leaf: (
      <>
        <path d="M19 3C11 3 5 7 5 13c0 3 2 5 5 5 6 0 9-7 9-15Z" />
        <path d="M4 21c2-5 6-9 12-12" />
      </>
    ),
    heat: (
      <>
        <path d="M12 3v10" />
        <path d="M8.5 10.5V6a3.5 3.5 0 0 1 7 0v4.5a5 5 0 1 1-7 0Z" />
        <path d="M12 17h.01" />
      </>
    ),
    water: <path d="M12 2S6 9 6 14a6 6 0 0 0 12 0c0-5-6-12-6-12Z" />,
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    satellite: (
      <>
        <path d="m13 7 4-4 4 4-4 4Z" />
        <path d="m3 17 4-4 4 4-4 4Z" />
        <path d="m8 16 8-8" />
        <path d="M5 3a16 16 0 0 1 16 16" />
      </>
    ),
    phone: (
      <>
        <rect x="6" y="2" width="12" height="20" rx="2" />
        <path d="M10 6h4M11 18h2" />
      </>
    ),
    voice: (
      <>
        <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </>
    ),
    web: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m7 9 5 5 5-5" />,
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
  }
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

function ArrowLink({
  children,
  href,
}: {
  children: React.ReactNode
  href: string
}) {
  return (
    <Link className="arrow-link" to={href}>
      {children}
      <Icon name="arrow" size={18} />
    </Link>
  )
}

const featureViewBoxes = [
  "65 25 250 250",
  "486 25 250 250",
  "907 25 250 250",
  "264 313 250 250",
  "714 313 250 250",
]

const featuresList: {
  icon: IconName
  to: string
  titleKey: TranslationKey
  nativeKey: TranslationKey
  descKey: TranslationKey
}[] = [
    {
      icon: "heat",
      to: "/features/heat-risk",
      titleKey: "home.featHeatRiskTitle",
      nativeKey: "home.featHeatRiskNative",
      descKey: "home.featHeatRiskDesc"
    },
    {
      icon: "leaf",
      to: "/features/crop-health",
      titleKey: "home.featCropHealthTitle",
      nativeKey: "home.featCropHealthNative",
      descKey: "home.featCropHealthDesc"
    },
    {
      icon: "water",
      to: "/features/smart-irrigation",
      titleKey: "home.featSmartIrrigationTitle",
      nativeKey: "home.featSmartIrrigationNative",
      descKey: "home.featSmartIrrigationDesc"
    },
    {
      icon: "bell",
      to: "/features/verified-alerts",
      titleKey: "home.featVerifiedAlertsTitle",
      nativeKey: "home.featVerifiedAlertsNative",
      descKey: "home.featVerifiedAlertsDesc"
    },
    {
      icon: "shield",
      to: "/features/personalized-alerts",
      titleKey: "home.featPersonalizedAlertsTitle",
      nativeKey: "home.featPersonalizedAlertsNative",
      descKey: "home.featPersonalizedAlertsDesc"
    },
  ]

export default function HomePage() {
  const [searched, setSearched] = useState<string | null>(null)
  const [locationStr, setLocationStr] = useState("")
  const navigate = useNavigate()
  const { setLocationId, setLocation } = useAppState()
  const { user, openAuthModal, login } = useAuth()
  const { t } = useLanguage()

  const heroRef = useRef<HTMLElement>(null)
  const [frameIndex, setFrameIndex] = useState(1)
  const featuresRef = useRef<HTMLDivElement>(null)
  const [featuresInView, setFeaturesInView] = useState(false)

  useEffect(() => {
    // Preload all frames for smooth playback
    for (let i = 1; i <= 80; i++) {
      const img = new Image()
      img.src = `/photos/ezgif-frame-${i.toString().padStart(3, "0")}.jpg`
    }

    // Play as sequence (~150ms per frame)
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev % 80) + 1)
    }, 150)

    // Observe features section for animation
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setFeaturesInView(true)
        }
      },
      { threshold: 0.1 }
    )
    if (featuresRef.current) {
      observer.observe(featuresRef.current)
    }

    return () => {
      clearInterval(interval)
      observer.disconnect()
    }
  }, [])

  function checkRisk(event: FormEvent) {
    event.preventDefault()
    const text = locationStr.trim()
    if (!text) return
    setSearched(text)
    // Resolve the free-text entry against the seeded fields or set as dynamic area
    const digits = text.replace(/\D/g, "")
    const match = LOCATIONS.find(
      (item) =>
        item.district.toLowerCase() === text.toLowerCase() ||
        item.village.toLowerCase() === text.toLowerCase() ||
        item.pincode === digits,
    )
    if (match) {
      setLocationId(match.id)
    } else {
      setLocationId(text.toLowerCase().replace(/[^a-z0-9]/g, "-") as any)
    }
    navigate("/features/heat-risk")
  }

  return (
    <div className="site-shell">
      <SiteNavbar variant="home" />

      <main>
        <section className="hero" id="home" ref={heroRef}>
          <img
            className="hero-image"
            src={`/photos/ezgif-frame-${frameIndex.toString().padStart(3, "0")}.jpg`}
            alt="Indian farmer in a lush green field"
          />
          <div className="hero-shade" />
          <div className="container hero-content">
            <div className="hero-copy">
              <p className="eyebrow">
                {t("home.eyebrow")}
              </p>
              <h1>{t("home.heroTitle")}</h1>
              <p className="hero-description">
                {t("home.heroDesc")}
              </p>
              <div className="hero-farmer-auth-box">
                {user ? (
                  <div className="hero-logged-in-card">
                    <div className="hero-farmer-info">
                      <span className="hero-live-dot" />
                      <div>
                        <strong>Active Farm: {user.name}</strong>
                        <span>{user.village || user.district}, {user.district} ({user.state}) &middot; PIN {user.pincode || "—"}</span>
                      </div>
                    </div>
                    <div className="hero-cta-buttons">
                      <button
                        type="button"
                        onClick={() => navigate("/features/heat-risk")}
                        className="hero-btn-primary"
                      >
                        Open Farm Risk Dashboard &rarr;
                      </button>
                      <button
                        type="button"
                        onClick={openAuthModal}
                        className="hero-btn-outline"
                      >
                        Switch Farmer / Register
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="hero-auth-prompt-card">
                    <div className="hero-auth-header">
                      <span className="hero-tag">HYPERLOCAL CLIMATE &amp; CROP RISK</span>
                      <h3>Log in or Register to access detailed farm intelligence</h3>
                      <p>View live Sentinel-2 canopy health, WBGT heat stress windows, and precision irrigation for your exact coordinates.</p>
                    </div>
                    <div className="hero-cta-buttons">
                      <button
                        type="button"
                        onClick={openAuthModal}
                        className="hero-btn-primary"
                      >
                        Log In / Select Farmer Profile &rarr;
                      </button>
                      <button
                        type="button"
                        onClick={openAuthModal}
                        className="hero-btn-outline"
                      >
                        + Register New Farm
                      </button>
                    </div>
                  </div>
                )}

                <div className="hero-quick-farmers">
                  <span className="hero-quick-title">Or test instantly with 5 verified Indian farmers:</span>
                  <div className="hero-quick-chips">
                    {DEMO_FARMERS.map((f) => (
                      <button
                        key={f.userId}
                        type="button"
                        onClick={() => {
                          login(f)
                          if (f.lat && f.lng) {
                            setLocation({
                              id: `farmer-${f.userId}`,
                              village: f.village || f.district,
                              district: f.district,
                              state: f.state,
                              pincode: f.pincode || "—",
                              lat: f.lat,
                              lng: f.lng,
                              acres: f.acres || 4.5,
                              soilType: f.state === "Punjab" ? "alluvial" : "medium-black",
                            })
                          }
                          navigate("/features/heat-risk")
                        }}
                        className={`hero-quick-chip ${user?.userId === f.userId ? "is-active" : ""}`}
                      >
                        <strong>{f.name}</strong>
                        <span>{f.district} ({f.crops[0]})</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="hero-curve" />
        </section>

        <section className="feature-strip" id="features" ref={featuresRef}>
          <div className="container">
            <h2 className="features-title">{t("home.featuresTitle")}</h2>
            <div className="feature-grid">
              {featuresList.map((feature, index) => (
                <Link
                  className={`feature-card ${featuresInView ? "in-view" : ""}`}
                  style={{ animationDelay: `${index * 120}ms` }}
                  to={feature.to}
                  key={feature.titleKey}
                  aria-label={`${t(feature.titleKey)} — open screen`}
                >
                  <span className="feature-icon">
                    <svg
                      aria-label={`${t(feature.titleKey)} symbol`}
                      role="img"
                      width="36"
                      height="36"
                      viewBox={featureViewBoxes[index]}
                    >
                      <image
                        href="/feature-symbols.png"
                        width="1214"
                        height="588"
                      />
                    </svg>
                  </span>
                  <div>
                    <h3>{t(feature.titleKey)}</h3>
                    <p>
                      <span>{t(feature.nativeKey)}</span>
                      <br />
                      <span>{t(feature.descKey)}</span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <RevealSection className="section field-intelligence" id="field-intelligence">
          <div className="container split">
            <div className="field-visual">
              <img
                src="/field-intelligence-photo.png"
                alt="Indian farmer preparing a field with oxen in natural evening light"
              />
            </div>
            <div className="section-copy">
              <h2>
                {t("home.fieldIntelTitle")}
              </h2>
              <p className="eyebrow green">{t("home.fieldIntelEyebrow")}</p>
              <p>{t("home.fieldIntelDesc")}</p>
              <div className="data-list">
                <div>
                  <span>WBGT</span>
                  <strong>34.2°C</strong>
                </div>
                <div>
                  <span>LST</span>
                  <strong>38.5°C</strong>
                </div>
                <div>
                  <span>NDVI</span>
                  <strong>0.61</strong>
                </div>
                <div>
                  <span>{t("common.humidity")}</span>
                  <strong>72%</strong>
                </div>
              </div>
              <div className="advice">
                <span>{t("home.fieldIntelAdviceTitle")}</span>
                <p>{t("home.fieldIntelAdviceDesc")}</p>
              </div>
            </div>
          </div>
        </RevealSection>

        <RevealSection className="section showcase">
          <div className="container showcase-grid">
            <RevealCard as="article" className="showcase-card showcase-irrigation">
              <img
                src={cropRowsImage}
                alt="Heat-stressed agricultural field under intense sunlight"
              />
              <div className="image-card-copy">
                <p className="eyebrow">{t("home.showcaseHeatEyebrow")}</p>
                <h3>{t("home.showcaseHeatTitle")}</h3>
              </div>
            </RevealCard>
            <RevealCard as="article" className="showcase-card showcase-irrigation" delay={150}>
              <img
                src={irrigationImage}
                alt="Sprinkler irrigating rows of green crops in warm evening light"
              />
              <div className="image-card-copy">
                <p className="eyebrow">{t("home.showcaseIrrigEyebrow")}</p>
                <h3>{t("home.showcaseIrrigTitle")}</h3>
              </div>
            </RevealCard>
          </div>
        </RevealSection>

        <RevealSection className="farmer-section" id="for-farmers">
          <div className="container farmer-grid">
            <div className="farmer-photo">
              <img
                src={farmerImage}
                alt="Indian farmer working with oxen in a green field"
              />
            </div>
            <div className="farmer-copy" id="farmers">
              <p className="eyebrow green">{t("home.farmersEyebrow")}</p>
              <h2>{t("home.farmersTitle")}</h2>
              <p className="large-copy">
                {t("home.farmersDesc")}
              </p>
              <div className="question-list">
                <span>
                  <Icon name="check" size={17} /> {t("home.farmersQ1")}
                </span>
                <span>
                  <Icon name="check" size={17} /> {t("home.farmersQ2")}
                </span>
                <span>
                  <Icon name="check" size={17} /> {t("home.farmersQ3")}
                </span>
              </div>
              <div className="language-chips">
                {["English", "मराठी", "हिन्दी", "ਪੰਜਾਬੀ", "తెలుగు", "বাংলা"].map(
                  (languageBadge) => (
                    <span key={languageBadge}>{languageBadge}</span>
                  ),
                )}
              </div>
            </div>
          </div>
        </RevealSection>

        <RevealSection id="access-section" className="section access-section">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow green">{t("home.accessEyebrow")}</p>
                <h2>{t("home.accessTitle")}</h2>
              </div>
              <p>{t("home.accessDesc")}</p>
            </div>
            <div className="access-grid">
              {[
                {
                  icon: "phone" as IconName,
                  n: "01",
                  title: "WhatsApp Voice Note",
                  text: t("home.accessSmsDesc"),
                },
                {
                  icon: "voice" as IconName,
                  n: "02",
                  title: "Amazon Polly Audio",
                  text: t("home.accessVoiceDesc"),
                },
                {
                  icon: "web" as IconName,
                  n: "03",
                  title: "Web Intelligence",
                  text: t("home.accessWebDesc"),
                },
              ].map((item, index) => (
                <RevealCard as="article" key={item.title} delay={index * 150}>
                  <span className="access-number">{item.n}</span>
                  <span className="access-icon">
                    <Icon name={item.icon} size={38} />
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </RevealCard>
              ))}
            </div>
          </div>
        </RevealSection>

        <RevealSection className="section whats-next" id="for-partners">
          <div className="container">
            <div className="whats-next-heading">
              <h2>
                {t("home.nextTitle")}
              </h2>
              <p>
                {t("home.nextDesc")}
              </p>
            </div>
            <div className="roadmap-grid">
              <RevealCard as="article" className="roadmap-card">
                <div className="roadmap-image">
                  <img
                    src="https://images.unsplash.com/photo-1707811180403-c22b7ef06476?auto=format&fit=crop&w=1200&q=86"
                    alt="Agricultural field representatives speaking with farmers in a field"
                  />
                </div>
                <div className="roadmap-content">
                  <span>{t("home.nextGovStatus")}</span>
                  <h3>{t("home.nextGovTitle")}</h3>
                  <p>
                    {t("home.nextGovDesc")}
                  </p>
                </div>
              </RevealCard>
              <RevealCard as="article" className="roadmap-card" delay={150}>
                <div className="roadmap-image">
                  <img
                    src="https://images.unsplash.com/photo-1646318362784-e959d033064f?auto=format&fit=crop&w=1200&q=86"
                    alt="Wide view of cultivated agricultural fields and rural communities"
                  />
                </div>
                <div className="roadmap-content">
                  <span>{t("home.nextScaleStatus")}</span>
                  <h3>{t("home.nextScaleTitle")}</h3>
                  <p>
                    {t("home.nextScaleDesc")}
                  </p>
                </div>
              </RevealCard>
              <RevealCard as="article" className="roadmap-card" delay={300}>
                <div className="roadmap-image">
                  <img
                    src="https://images.unsplash.com/photo-1769420246413-cf1531018fb4?auto=format&fit=crop&w=1200&q=86"
                    alt="Farming communities working across expansive green agricultural fields"
                  />
                </div>
                <div className="roadmap-content">
                  <span>{t("home.nextInvestStatus")}</span>
                  <h3>{t("home.nextInvestTitle")}</h3>
                  <p>
                    {t("home.nextInvestDesc")}
                  </p>
                </div>
              </RevealCard>
            </div>
          </div>
        </RevealSection>

        <RevealSection className="section evidence-section" id="resources">
          <div className="container">
            <div className="section-heading">
              <h2>{t("home.evidenceTitle")}</h2>
              <p></p>
            </div>
            <div className="evidence-list">
              {[
                t("home.evidence1"),
                t("home.evidence2"),
                t("home.evidence3"),
                t("home.evidence4")
              ].map(
                (item, index) => (
                  <RevealCard as="div" key={item} delay={index * 150}>
                    <span>0{index + 1}</span>
                    <strong>{item}</strong>
                  </RevealCard>
                ),
              )}
            </div>
          </div>
        </RevealSection>
      </main>

      <SiteFooter />
    </div >
  )
}
