import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const NAV_SECTIONS = [
  {
    title: "Monitoring",
    items: [
      { to: "/", label: "Dashboard", end: true },
      { to: "/planets", label: "Planets" },
      { to: "/visualization", label: "Visualization" },
    ],
  },
  {
    title: "Operations",
    items: [
      { to: "/diagnostics", label: "Diagnostics" },
      { to: "/admin", label: "Admin" },
    ],
  },
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
        <div className="app-brand">
          <span className="app-brand__title">Exoplanet Console</span>
          <span className="app-brand__subtitle">Analytics & Ops</span>
        </div>
        <nav className="app-sections">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="app-section">
              <span className="app-section__title">{section.title}</span>
              <div className="app-tabs">
                {section.items.map(({ to, label, end }) => (
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
              </div>
            </div>
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
