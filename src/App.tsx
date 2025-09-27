import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const NAV_LINKS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/planets", label: "Planets" },
  { to: "/visualization", label: "Visualization" },
  { to: "/diagnostics", label: "Diagnostics" },
  { to: "/admin/deleted", label: "Admin" },
];

const THEME_STORAGE_KEY = "exo-ui-theme" as const;

const themes = {
  light: "light",
  dark: "dark",
} as const;

type Theme = (typeof themes)[keyof typeof themes];

/** App shell: left navigation tabs + routed content area. */
export default function App() {
  const location = useLocation();

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return themes.light;
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (stored === themes.dark || stored === themes.light) {
      return stored;
    }
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    return media?.matches ? themes.dark : themes.light;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [location.pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (err) {
      console.warn("Failed to persist theme preference", err);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === themes.dark ? themes.light : themes.dark));
  };

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <strong className="app-brand">🪐 Exo UI</strong>
        <nav className="app-tabs">
          {NAV_LINKS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                isActive ? "app-tab app-tab--active" : "app-tab"
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="app-sidebar-footer">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === themes.dark ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === themes.dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span aria-hidden="true">{theme === themes.dark ? "☀️" : "🌙"}</span>
          </button>
        </div>
      </aside>

      <main className="app-content">
        <div className="app-content-inner">
          <Outlet key={location.pathname} />
        </div>
      </main>
    </div>
  );
}
