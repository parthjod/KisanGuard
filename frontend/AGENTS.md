# figma-make-app

React + Vite + Tailwind CSS project running inside favicon.

## Development Server

A Vite development server is **already running** on `$PORT` (default 8443). You don't need to start it manually.

- Preview URL: The user can access the running app through the preview panel
- Hot reload: Changes to source files are reflected immediately

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - Application root: wires `AppStateProvider` and `BrowserRouter` around `AppRoutes`
- `src/app/AppRoutes.tsx` - Route table; each feature screen is `lazy()`-loaded so the landing page keeps its original bundle shape
- `src/pages/HomePage.tsx` - Landing page. The Figma markup and classes are unchanged; only the feature cards and the hero form became router links
- `src/screens/*` - The six feature screens, one per feature (Heat Risk, Crop Health, Yield Risk, Smart Irrigation, Verified Alerts, Personalized Alerts)
- `src/components/SiteChrome.tsx` - Shared navbar, footer, feature sub-navigation, and the `FeatureShell` layout
- `src/components/ui.tsx` - Shared presentational pieces (`Card`, `Metric`, `SeverityBadge`, `Disclosure`, `Drawer`, …)
- `src/components/LocationPicker.tsx` - Village / district / pincode selector shared by the field-level screens
- `src/components/RiskMap.tsx` - Interactive risk map; Mapbox GL when `VITE_MAPBOX_TOKEN` is set, SVG fallback otherwise
- `src/components/chartFormatters.ts` - Shared Recharts tooltip formatters
- `src/services/*` - Domain types, deterministic mock data, and the REST-ready service layer behind `apiClient`
- `src/state/AppState.tsx` - Shared selection context (location, crop, stage, persona, alert preferences), persisted to localStorage
- `src/hooks/useService.ts` - Async data hook with in-flight guards and manual reload
- `src/index.css` - Global CSS entrypoint and Tailwind CSS v4 import
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `package.json` - Project dependencies and the Vite build, development, preview, and formatting scripts
- `vite.config.ts` - Vite configuration with React, Tailwind CSS v4, and favicon plugins plus the `@` alias for `src`
- `.mise.toml` - Toolchain versions for Node.js and pnpm

## Feature Screens

The five feature cards on the landing page are the entry points to `/features/*`. Yield Risk is a sub-screen of Crop Health and is reachable from there.

| Route | Screen | Feature |
| --- | --- | --- |
| `/features/heat-risk` | Heat Risk & WBGT dashboard | 01 · Hyperlocal heat risk |
| `/features/crop-health` | Crop health & CDHI | 02 · Crop health + CDHI |
| `/features/yield-risk` | 14-day yield risk forecast | 03 · Yield risk |
| `/features/smart-irrigation` | Irrigation recommendation | 04 · Smart irrigation |
| `/features/verified-alerts` | Alerts & verification center | 05 · Verified alerts |
| `/features/personalized-alerts` | Alert preferences & routing | 06 · Personalized alerts |

All feature-screen CSS lives under the `kg-` namespace at the end of `src/index.css` and reuses the design tokens from `:root`. Do not restyle the landing page to accommodate a feature screen.

## Service Layer

`src/services/apiClient.ts` runs in mock mode by default and serves the deterministic generators. Setting `VITE_KISANGUARD_API_MODE=rest` plus `VITE_KISANGUARD_API_URL` routes the same calls to the KisanGuard REST API without touching a screen. Every computed screen shows a `SimulatedNotice` because these are demo values, not field observations.

| Variable | Purpose |
| --- | --- |
| `VITE_KISANGUARD_API_MODE` | `mock` (default) or `rest` |
| `VITE_KISANGUARD_API_URL` | REST base URL, defaults to `/api/v1` |
| `VITE_KISANGUARD_API_TOKEN` | Bearer token for the REST API |
| `VITE_MAPBOX_TOKEN` | Enables the Mapbox GL base map; the SVG fallback is used when unset |
| `VITE_AWS_REGION` | Region for the Amplify and QuickSight hand-off configs |
| `VITE_AWS_USER_POOL_ID` / `VITE_AWS_IDENTITY_POOL_ID` | Amplify Cognito hand-off |
| `VITE_QUICKSIGHT_DASHBOARD_ID` | Embedded QuickSight analytics dashboard |

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`. This scaffold does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in `src/index.css`. Keep CSS `@import` statements first, then add any `@font-face` rules and font-family defaults there.

## Code quality

- **Do not run `npm run format`.** oxfmt 0.2.0 strips `;` separators from inline object type literals, which produces unparseable TypeScript in `src/` and in `node_modules/**/*.d.ts`. The script is disabled and exits with an explanation. Use your editor's formatter instead.
- Run `npm run typecheck` after any change to TypeScript. There is no `typecheck` gate in the favicon dev loop, so type errors surface only when you run it.

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
