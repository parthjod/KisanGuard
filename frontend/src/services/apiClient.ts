/**
 * REST-ready service layer.
 *
 * Every service in `src/services` resolves data through `apiClient`. Today the
 * client is in `mock` mode and serves the deterministic generators; flipping
 * `VITE_KISANGUARD_API_MODE=rest` (or building with a real base URL) routes the
 * same calls to the KisanGuard REST API. The screens only ever call the
 * exported service functions, so the swap is contained here.
 */

const apiMode =
  import.meta.env.VITE_KISANGUARD_API_MODE as "mock" | "rest" | undefined ??
  "mock"
const apiBaseUrl =
  import.meta.env.VITE_KISANGUARD_API_URL as string | undefined ?? "/api/v1"
const apiToken = import.meta.env.VITE_KISANGUARD_API_TOKEN as string | undefined ?? "test_farmer_token"

export const isMockMode = apiMode === "mock"

export class ApiError extends Error {
  status: number
  endpoint: string

  constructor(message: string, status: number, endpoint: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.endpoint = endpoint
  }
}

export interface ApiMeta {
  simulated: boolean
  source: "mock" | "rest"
}

export interface ApiResult<T> {
  data: T
  meta: ApiMeta
}

type MockResolver<T,> = (
  pattern: string,
  endpoint: string,
  params: Record<string, string>,
  body: unknown,
) => T | Promise<T>

const mockResolvers: {
  pattern: string
  segments: string[]
  resolver: MockResolver<unknown>
}[] = []

/** Services register their mock implementation, then call `apiClient.request`. */
export function registerMock<T>(
  endpoint: string,
  resolver: MockResolver<T>,
): void {
  mockResolvers.push({
    pattern: endpoint,
    segments: endpoint.split("/").filter(Boolean),
    resolver: resolver as MockResolver<unknown>,
  })
}

/**
 * Mocks are matched by segment count and literal segments, so a pattern like
 * `/alerts/:id` resolves `/alerts/ALT-2400` without pulling in a router.
 */
function findMock(
  endpoint: string,
): { pattern: string; resolver: MockResolver<unknown> } | undefined {
  const parts = endpoint.split("/").filter(Boolean)
  const match = mockResolvers
    .filter((entry) => entry.segments.length === parts.length)
    .find((entry) =>
      entry.segments.every(
        (segment, index) => segment.startsWith(":") || segment === parts[index],
      ),
    )
  return match
    ? { pattern: match.pattern, resolver: match.resolver }
    : undefined
}

function getActiveAuthToken(): string {
  try {
    return (
      window.localStorage.getItem("kisanguard_auth_token") ||
      apiToken ||
      "test_farmer_token"
    )
  } catch {
    return apiToken || "test_farmer_token"
  }
}

export const apiClient = {
  mode: apiMode,
  baseUrl: apiBaseUrl,

  async request<T,>(
    endpoint: string,
    params: Record<string, string | undefined> = {},
    body?: unknown,
  ): Promise<ApiResult<T>> {
    if (apiMode === "mock") {
      const match = findMock(endpoint)
      if (!match) {
        throw new ApiError(
          `No mock registered for "${endpoint}"`,
          501,
          endpoint,
        )
      }
      const clean = Object.fromEntries(
        Object.entries(params).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      )
      const data = (await match.resolver(
        match.pattern,
        endpoint,
        clean,
        body,
      )) as T
      return { data, meta: { simulated: true, source: "mock" } }
    }

    const url = new URL(`${apiBaseUrl}${endpoint}`, window.location.origin)
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, value)
    }

    try {
      const token = getActiveAuthToken()
      const response = await fetch(url.toString(), {
        method: body === undefined ? "GET" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })

      if (response.ok) {
        return {
          data: (await response.json()) as T,
          meta: { simulated: false, source: "rest" },
        }
      }
    } catch {
      // Network or CORS error — fallback to mock below
    }

    // Graceful fallback to mock if REST endpoint returned non-200 or is not deployed
    const match = findMock(endpoint)
    if (match) {
      const clean = Object.fromEntries(
        Object.entries(params).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      )
      const data = (await match.resolver(
        match.pattern,
        endpoint,
        clean,
        body,
      )) as T
      return { data, meta: { simulated: true, source: "mock" } }
    }

    throw new ApiError(
      `Endpoint unavailable: ${endpoint}`,
      502,
      endpoint,
    )
  },
}

/**
 * Amplify / QuickSight hand-off points.
 *
 * These are intentionally thin: they describe the integration contract the
 * backend team fills in, without forcing an Amplify dependency into the design
 * preview build.
 */
export const amplifyConfig = {
  region: import.meta.env.VITE_AWS_REGION ?? "ap-south-1",
  userPoolId: import.meta.env.VITE_AWS_USER_POOL_ID ?? "",
  identityPoolId: import.meta.env.VITE_AWS_IDENTITY_POOL_ID ?? "",
  configured: Boolean(import.meta.env.VITE_AWS_USER_POOL_ID),
  signInWith: "email" as const,
}

export const quickSightConfig = {
  /** Embedded QuickSight dashboard id for the professional analytics view. */
  dashboardId: import.meta.env.VITE_QUICKSIGHT_DASHBOARD_ID ?? "",
  region: import.meta.env.VITE_AWS_REGION ?? "ap-south-1",
  configured: Boolean(import.meta.env.VITE_QUICKSIGHT_DASHBOARD_ID),
}

export const analyticsEvents = {
  track(event: string, payload: Record<string, unknown> = {}) {
    if (typeof window === "undefined") return
    const queue = ((window as unknown as {
      __kgAnalytics?: unknown[]
    }).__kgAnalytics ??= [])
    queue.push({ event, payload, at: new Date().toISOString() })
  },
}
