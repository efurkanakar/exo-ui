# Exoplanet Console UI

Modern front-end for the Exoplanet catalogue service. The application gives operators, analysts, and scientists a single control surface to monitor planet discoveries, explore data slices, and administer catalogue records exposed by the FastAPI backend.

## Capabilities at a Glance

- **Dashboard:** KPI tiles, discovery method breakdowns, method-level statistics, precision controls, and recent change logs sourced from `/planets` and `/planets/change-logs`.
- **Planets:** Filterable/searchable table with pagination, soft-delete visibility toggles, and inline admin actions that honour API key permissions.
- **Visualization Explorer:** Client-driven chart previews (histogram, by-year, by-method) powered by `/vis/discovery` endpoints, with staged parameter editing and downloadable PNG renders.
- **Diagnostics:** Probe `/system/*` health/readiness endpoints with live status chips and drill-down logs.
- **Admin Console:** Manage soft/hard deletes and table wipes, capture admin API key securely in local storage, and view soft-deleted catalogue entries.

## Technology Stack

- [React 19](https://react.dev/) with functional components and hooks
- [Vite 7](https://vitejs.dev/) dev/build tooling
- [TypeScript 5.8](https://www.typescriptlang.org/) in strict mode
- [pnpm](https://pnpm.io/) for dependency management
- [@tanstack/react-query](https://tanstack.com/query/latest) for data fetching & caching
- CSS variables + inline styles for theming (light/dark) and componentisation

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Running instance of the Exoplanet FastAPI backend (or an accessible deployment URL)

### Install

```bash
pnpm install
```

### Environment Configuration

Create an `.env` (or `.env.local`) at the project root:

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | ✅ | Base URL of the FastAPI backend (e.g. `https://exoplanet-api.example.com`). |
| `VITE_ADMIN_API_KEY` | ⛔ Optional | Admin key used for soft/hard delete operations and change-log access. If omitted, admin-only calls are disabled. |

>  `VITE_` prefixed variables are statically embedded in the bundle. Only include admin keys here if acceptable for the deployment surface; otherwise configure them at runtime through a proxy layer.

### Local Development

```bash
pnpm dev
```

- Opens Vite dev server on `http://localhost:5173` (default).
- Hot Module Replacement (HMR) is active for all pages.

### Type Checking & Linting

```bash
pnpm tsc --noEmit -p config/tsconfig.app.json   # Strict TypeScript validation
pnpm lint                                       # ESLint (type-aware) ruleset
```

### Production Build

```bash
pnpm build

# Optional: preview production build locally
pnpm preview
```

Build artefacts output to `dist/` and can be served by any static host or reverse proxy configured to forward API calls to the backend.

## Application Structure

```
src/
  api/           // HTTP client wrappers & TypeScript DTOs aligned with FastAPI schemas
  hooks/         // React Query hooks encapsulating fetch/mutation logic
  pages/         // Routed views (Dashboard, Planets, Visualization, Diagnostics, Admin)
  components/    // Shared UI primitives (cards, loaders, tables)
  index.css      // Theme tokens, layout primitives, sidebar styles
  App.tsx        // Shell layout (sidebar navigation, theme toggler)
config/
  *.json/.ts     // Centralised TypeScript, ESLint, Vite configuration and cache artefacts
```

Routing is provided by React Router (`src/App.tsx`), with left navigation grouped into “Monitoring” and “Operations” sections. Theme preference (light/dark) is persisted via `localStorage` (`exo-ui-theme`).

## Backend Integration Notes

- All fetchers are defined in `src/api/client.ts`. Query/mutation hooks in `src/hooks` centralise cache keys and invalidation.
- Change-log enriched activity feeds require `/planets/change-logs` (admin protected). Without a valid admin key the UI falls back to derived data from `/planets`.
- Visualization previews call `/vis/discovery` and `/vis/discovery.png`; the latter is intentionally cache-busted per refresh.
- Admin actions (`restore`, `delete`, `wipe`) send `x-api-key` headers populated from the stored admin key field.

## Testing & Quality Gates

- Use `pnpm tsc --noEmit -p config/tsconfig.app.json` and `pnpm lint` in CI to enforce type safety and linting.
- Snapshot or behavioural testing can be layered with tools such as Playwright or Vitest (not included by default).

## Deployment Checklist

- Set `VITE_API_BASE_URL` (and optionally `VITE_ADMIN_API_KEY`) in the hosting platform’s environment variables prior to build.
- Configure the reverse proxy to forward `/planets`, `/vis`, `/system`, and `/planets/admin/*` calls to the FastAPI backend, preserving headers (especially `x-api-key`).
- Serve `dist/` via static hosting (Netlify, Vercel, Render static site, etc.) or integrate into a container image alongside the backend.

---

Maintained with 🪐 by the Exoplanet Ops team. Contributions, bug reports, and enhancement requests are welcome.
