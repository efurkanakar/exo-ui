# Exoplanet Console UI

This is a control panel for the Exoplanet catalog service. It lets operators check discoveries, watch change history, and run admin tasks from one screen.

## What I Use
- React 19 with TypeScript 5.8 (functional components and hooks)
- Vite 7 for local dev and builds
- pnpm 9 to manage packages and scripts
- @tanstack/react-query for fetching data and caching
- CSS variables to switch between light and dark themes

## Repository Layout
```
.
├── config/           # Settings for TypeScript, Vite, ESLint
├── public/           # Static files such as the favicon
├── src/
│   ├── api/          # HTTP clients and shared types for the FastAPI backend
│   ├── hooks/        # React Query hooks that wrap API calls
│   ├── pages/        # Dashboard, Planets, Visualization, Diagnostics, Admin views
│   ├── utils/        # Helper functions and field metadata
│   ├── App.tsx       # App shell and router
│   ├── index.css     # Theme tokens and base styles
│   └── main.tsx      # App entry point
├── index.html        # Vite base HTML file
├── package.json      # Dependencies and npm-style scripts
└── pnpm-lock.yaml    # pnpm lockfile
```

