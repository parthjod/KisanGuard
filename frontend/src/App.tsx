import { Component, type ErrorInfo, type ReactNode } from "react"
import { BrowserRouter } from "react-router-dom"
import { AppRoutes } from "./app/AppRoutes"
import { AppStateProvider } from "./state/AppState"
import { LanguageProvider } from "./state/LanguageContext"
import { AuthProvider } from "./state/AuthState"
import AuthModal from "./components/AuthModal"

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("KisanGuard Uncaught Error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#06130b",
            color: "#e8ede8",
            fontFamily: "Outfit, system-ui, sans-serif",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              maxWidth: "480px",
              background: "rgba(18, 38, 26, 0.8)",
              border: "1px solid rgba(46, 204, 113, 0.2)",
              borderRadius: "16px",
              padding: "32px",
              backdropFilter: "blur(12px)",
            }}
          >
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                marginBottom: "12px",
                color: "#58d68d",
              }}
            >
              KisanGuard Syncing...
            </h2>
            <p
              style={{
                color: "#a2b4a5",
                marginBottom: "20px",
                fontSize: "0.95rem",
              }}
            >
              An interface refresh is synchronizing telemetry and farmer data.
            </p>
            <button
              onClick={() => {
                try {
                  window.localStorage.removeItem("kisanguard:selection:v2")
                } catch {
                  // ignore
                }
                window.location.href = "/"
              }}
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "10px 20px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reload KisanGuard
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Application root.
 *
 * The router and the shared selection state wrap every screen, so the landing
 * page and the feature screens read the same location, crop, stage and alert
 * preferences. `AppRoutes` code-splits each feature screen.
 */
function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <AppStateProvider>
            <BrowserRouter>
              <AppRoutes />
              <AuthModal />
            </BrowserRouter>
          </AppStateProvider>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  )
}

export default App
