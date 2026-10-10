import { NavLink, useLocation } from "react-router-dom"
import { useLanguage, TranslationKey } from "../state/LanguageContext"
import { SiteNavbar, SiteFooter } from "../components/SiteChrome"

const storyTabs = [
    { titleKey: "about.story", href: "/about", section: "story" },
    { titleKey: "about.challenge", href: "/about/challenge", section: "challenge" },
    { titleKey: "about.howItWorks", href: "/about/how-it-works", section: "howItWorks" },
    { titleKey: "about.approach", href: "/about/approach", section: "approach" },
    { titleKey: "about.vision", href: "/about/vision", section: "vision" },
]

const sectionImages: Record<string, string> = {
    story: "/about-story.jpg",
    challenge: "/about-challenge.jpg",
    howItWorks: "/about-how-it-works.jpg",
    approach: "/about-approach.jpg",
    vision: "/about-vision.png"
}

export default function AboutScreen() {
    const { t } = useLanguage()
    const location = useLocation()

    // Find current active tab based on pathname
    // Since NavLink does active matching automatically, we can just use location for rendering the content component
    const activeTab = storyTabs.find(tab => tab.href === location.pathname) || storyTabs[0]

    return (
        <div className="site-shell kg-site">
            <SiteNavbar />

            {/* About Subnav */}
            <nav className="kg-subnav" aria-label="About pages" style={{ zIndex: 10 }}>
                <div className="container" style={{ display: 'flex', gap: '2rem', overflowX: 'auto', paddingBottom: '0' }}>
                    {storyTabs.map((link) => (
                        <NavLink
                            key={link.href}
                            to={link.href}
                            className={({ isActive }) => `kg-subnav-link${isActive || (link.href === '/about' && location.pathname === '/about') ? " is-active" : ""}`}
                            end={link.href === "/about"}
                        >
                            {t(link.titleKey as TranslationKey)}
                        </NavLink>
                    ))}
                </div>
            </nav>

            <main className="about-content page-section container">
                <div className="about-header text-center" style={{ marginBottom: "3rem", marginTop: "3rem" }}>
                    <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "center" }}>
                        <img
                            src={sectionImages[activeTab.section]}
                            alt={t(activeTab.titleKey as TranslationKey)}
                            style={{ width: "100%", maxHeight: "500px", objectFit: "cover", borderRadius: "16px" }}
                        />
                    </div>
                    <h1 className="kg-title-large" style={{ fontWeight: "bold" }}>{t(activeTab.titleKey as TranslationKey)}</h1>
                </div>

                <div className="about-body kg-card p-6" style={{ maxWidth: '800px', margin: '0 auto', fontSize: '1.1rem', lineHeight: '1.7', padding: '2rem' }}>
                    {/* Render the content based on activeTab.section */}
                    {activeTab.section === "story" && (
                        <div className="about-section paragraph-group" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <p>{t(`about.storyContent.p1` as TranslationKey)}</p>
                            <p>{t(`about.storyContent.p2` as TranslationKey)}</p>

                            <div className="about-quote" style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: '500', fontStyle: 'italic', margin: '2rem 1rem', color: 'color-mix(in srgb, var(--kg-text-body) 80%, var(--kg-brand-primary))' }}>
                                <p>"{t(`about.storyContent.quote` as TranslationKey)}"</p>
                            </div>

                            <p>{t(`about.storyContent.p3` as TranslationKey)}</p>
                            <p>{t(`about.storyContent.p4` as TranslationKey)}</p>
                        </div>
                    )}

                    {activeTab.section === "challenge" && (
                        <div className="about-section paragraph-group" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <h4 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--kg-text-heading)' }}>{t(`about.challengeContent.subtitle` as TranslationKey)}</h4>
                            <p>{t(`about.challengeContent.p1` as TranslationKey)}</p>
                            <p>{t(`about.challengeContent.p2` as TranslationKey)}</p>

                            <div className="about-quote" style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: '500', fontStyle: 'italic', margin: '2rem 1rem', color: 'color-mix(in srgb, var(--kg-text-body) 80%, var(--kg-brand-primary))' }}>
                                <p>"{t(`about.challengeContent.quote` as TranslationKey)}"</p>
                            </div>

                            <p>{t(`about.challengeContent.p3` as TranslationKey)}</p>
                            <p>{t(`about.challengeContent.p4` as TranslationKey)}</p>
                        </div>
                    )}

                    {activeTab.section === "howItWorks" && (
                        <div className="about-section paragraph-group" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <h4 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--kg-text-heading)' }}>{t(`about.howItWorksContent.subtitle` as TranslationKey)}</h4>
                            <p>{t(`about.howItWorksContent.p1` as TranslationKey)}</p>
                            <p>{t(`about.howItWorksContent.p2` as TranslationKey)}</p>

                            <div className="about-quote" style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: '500', fontStyle: 'italic', margin: '2rem 1rem', color: 'color-mix(in srgb, var(--kg-text-body) 80%, var(--kg-brand-primary))' }}>
                                <p>"{t(`about.howItWorksContent.quote` as TranslationKey)}"</p>
                            </div>

                            <p>{t(`about.howItWorksContent.p3` as TranslationKey)}</p>
                            <p>{t(`about.howItWorksContent.p4` as TranslationKey)}</p>
                        </div>
                    )}

                    {activeTab.section === "approach" && (
                        <div className="about-section paragraph-group" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <h4 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--kg-text-heading)' }}>{t(`about.approachContent.subtitle` as TranslationKey)}</h4>
                            <p>{t(`about.approachContent.p1` as TranslationKey)}</p>
                            <p>{t(`about.approachContent.p2` as TranslationKey)}</p>

                            <div className="about-quote" style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: '500', fontStyle: 'italic', margin: '2rem 1rem', color: 'color-mix(in srgb, var(--kg-text-body) 80%, var(--kg-brand-primary))' }}>
                                <p>"{t(`about.approachContent.quote` as TranslationKey)}"</p>
                            </div>

                            <p>{t(`about.approachContent.p3` as TranslationKey)}</p>
                        </div>
                    )}

                    {activeTab.section === "vision" && (
                        <div className="about-section paragraph-group" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <h4 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--kg-text-heading)' }}>{t(`about.visionContent.subtitle` as TranslationKey)}</h4>
                            <p>{t(`about.visionContent.p1` as TranslationKey)}</p>
                            <p>{t(`about.visionContent.p2` as TranslationKey)}</p>

                            <div className="about-quote" style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: '500', fontStyle: 'italic', margin: '2rem 1rem', color: 'color-mix(in srgb, var(--kg-text-body) 80%, var(--kg-brand-primary))' }}>
                                <p>"{t(`about.visionContent.quote` as TranslationKey)}"</p>
                            </div>

                            <p>{t(`about.visionContent.p3` as TranslationKey)}</p>
                            <p>{t(`about.visionContent.p4` as TranslationKey)}</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
