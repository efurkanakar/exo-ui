import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, CSSProperties } from "react";
import {
  usePlanetCount,
  useMethodCounts,
  useMethodStats,
  useRecentActivity,
  useTimeline,
  type RecentActivityEntry,
  type RecentActivityType,
} from "../hooks/usePlanets";
import type { MethodCount } from "../api/types";

/**
 * Dashboard (polished + precision control)
 * - KPI: total planets
 * - "By Discovery Method" tablosu (arama + sıralama)
 * - Method seçimiyle detay istatistik grid (min/max/avg/median)
 * - Precision seçici (ondalık sayısı) — varsayılan 2
 * - Profesyonel görünüm: header aksiyonları, badge'ler, tutarlı boşluklar,
 *   yükleme iskeletleri, hata ve boş durumları
 */

type SortKey = "count" | "name";

export default function DashboardPage() {
  const { data: count } = usePlanetCount();
  const { data: methods, isLoading: methodsLoading, isError: methodsError, error: methodsErr } = useMethodCounts();
  const timeline = useTimeline({});

  // UX: arama + sıralama
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("count");

  // Detay istatistik için seçilen method
  const defaultMethod = "Transit";
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const hasAlignedDefault = useRef(false);

  // Precision kontrolü (.2f gibi) — varsayılan 2
  const [digits, setDigits] = useState<number>(2);

  const methodStatQuery = useMethodStats(selectedMethod || undefined);
  const recentActivity = useRecentActivity(6);

  const firstObservationYear = useMemo(() => {
    const points = timeline.data ?? [];
    if (!points.length) return undefined;
    let minYear = Number.POSITIVE_INFINITY;
    for (const point of points) {
      if (typeof point?.disc_year === "number") {
        minYear = Math.min(minYear, point.disc_year);
      }
    }
    return Number.isFinite(minYear) ? minYear : undefined;
  }, [timeline.data]);

  useEffect(() => {
    if (!methods) return;
    const methodNames = methods.map((m) => m.disc_method ?? "");

    if (!methodNames.length) {
      hasAlignedDefault.current = false;
      setSelectedMethod("");
      return;
    }

    if (!hasAlignedDefault.current) {
      if (methodNames.includes(defaultMethod)) {
        setSelectedMethod(defaultMethod);
      } else {
        setSelectedMethod(methodNames[0] ?? "");
      }
      hasAlignedDefault.current = true;
      return;
    }

    if (selectedMethod && !methodNames.includes(selectedMethod)) {
      if (methodNames.includes(defaultMethod)) {
        setSelectedMethod(defaultMethod);
      } else {
        setSelectedMethod(methodNames[0] ?? "");
      }
    }
  }, [methods, selectedMethod, defaultMethod]);

  const handleSelectMethod = (value: string) => {
    setSelectedMethod(value);
  };

  // Filtrelenmiş + sıralanmış method listesi
  const filtered: MethodCount[] = useMemo(() => {
    const arr = (methods ?? []).slice();
    // arama
    const term = query.trim().toLowerCase();
    const q = term ? arr.filter((m) => (m.disc_method ?? "unknown").toLowerCase().includes(term)) : arr;
    // sıralama
    q.sort((a, b) => {
      if (sortBy === "name") {
        const an = (a.disc_method ?? "Unknown").toLowerCase();
        const bn = (b.disc_method ?? "Unknown").toLowerCase();
        return an.localeCompare(bn);
      }
      // count desc
      return (b.count ?? 0) - (a.count ?? 0);
    });
    return q;
  }, [methods, query, sortBy]);

  return (
    <section style={pageWrap}>
      <HeroPanel
        totalPlanets={count?.count ?? 0}
        methodCount={methods?.length ?? 0}
        firstObservationYear={firstObservationYear}
        timelineLoading={timeline.isLoading}
        timelineErrored={timeline.isError}
      />

      <div style={contentGrid}>
        <div style={primaryColumn}>
          <div className="card interactive-card" style={{ ...surfaceCard, padding: 24 }}>
            <CardHeader
              title="By Discovery Method"
              subtitle="Counts of non-deleted planets per method"
              trailing={
                <small className="muted">
                  Showing <strong>{filtered.length}</strong> of {methods?.length ?? 0}
                </small>
              }
            />

            <div style={controlBar}>
              <div style={{ position: "relative", flex: 1 }}>
                <SearchIcon />
                <input
                  placeholder="Filter methods…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Filter methods"
                  style={searchInput}
                />
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className="muted">Sort</span>
                <div style={selectWrapper}>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortKey)}
                    style={{ ...selectControl, minWidth: 140 }}
                  >
                    <option value="count">Count (desc)</option>
                    <option value="name">Name (A–Z)</option>
                  </select>
                  <SelectChevron />
                </div>
              </div>
            </div>

            {methodsLoading && <TableSkeleton />}
            {methodsError && <ErrorNote error={methodsErr} />}
            {!methodsLoading && !methodsError && filtered.length === 0 && <EmptyNote text="No methods match your filter." />}

            {!methodsLoading && !methodsError && filtered.length > 0 && (
              <div style={{ marginTop: 12, overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={{ width: "60%", textAlign: "center" }}>Method</th>
                      <th style={{ textAlign: "center" }}>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((m, i) => {
                      const methodName = m.disc_method ?? "";
                      const isActive = methodName === selectedMethod;
                      const zebra = i % 2 === 0 ? "var(--table-zebra-bg)" : "transparent";
                      return (
                        <tr
                          key={`${methodName}-${i}`}
                          style={{
                            cursor: "pointer",
                            background: isActive ? "var(--table-highlight-bg)" : zebra,
                            transition: "background 0.2s ease",
                            boxShadow: isActive ? "inset 0 0 0 1px var(--table-highlight-border)" : undefined,
                          }}
                          onClick={() => handleSelectMethod(methodName)}
                          onKeyDown={(evt) => {
                            if (evt.key === "Enter" || evt.key === " ") {
                              evt.preventDefault();
                              handleSelectMethod(methodName);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-pressed={isActive}
                          title="Show detailed stats"
                        >
                          <td style={methodCell}>
                            <span style={{ ...dot, background: isActive ? "var(--accent-primary)" : dot.background }} />
                            <span>{methodName || "Unknown"}</span>
                          </td>
                          <td style={{ textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{m.count}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div style={detailColumn}>
          <div className="card interactive-card" style={{ ...surfaceCard, padding: 24 }}>
            <CardHeader
              title="Method Statistics"
              subtitle="Compare min / max / average / median metrics for your current selection."
            />

            <div style={statsControlRow}>
              <div style={methodControlRow}>
                <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>Method</span>
                <div style={{ ...selectWrapper, flex: 1 }}>
                  <select
                    value={selectedMethod}
                    onChange={(e) => setSelectedMethod(e.target.value)}
                    style={{ ...selectControl, width: "100%" }}
                  >
                    <option value="">Select a method…</option>
                    {(methods ?? []).map((m, i) => (
                      <option key={`${m.disc_method}-${i}`} value={m.disc_method ?? ""}>
                        {m.disc_method ?? "Unknown"}
                      </option>
                    ))}
                  </select>
                  <SelectChevron />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {selectedMethod && (
                  <button
                    onClick={() => setSelectedMethod("")}
                    title="Clear selection"
                    style={ghostButtonSmall}
                  >
                    Clear
                  </button>
                )}
                <PrecisionPicker value={digits} onChange={setDigits} />
              </div>
            </div>

            {!selectedMethod && <EmptyNote text="Pick a discovery method to view detailed statistics." />}

            {selectedMethod && methodStatQuery.isLoading && <InlineLoader text="Loading stats…" />}

            {selectedMethod && methodStatQuery.isError && (
              <ErrorNote error={methodStatQuery.error as unknown as Error} />
            )}

            {selectedMethod && methodStatQuery.data && (
              <div style={{ marginTop: 12 }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "center" }}>Metric</th>
                        <th style={{ textAlign: "center" }}>Min</th>
                        <th style={{ textAlign: "center" }}>Max</th>
                        <th style={{ textAlign: "center" }}>Avg</th>
                        <th style={{ textAlign: "center" }}>Median</th>
                      </tr>
                    </thead>
                    <tbody>
                      <StatRow label="Orbital Period (d)" s={methodStatQuery.data.orbperd} digits={digits} />
                      <StatRow
                        label={
                          <span>
                            Radius (R<sub>⊕</sub>)
                          </span>
                        }
                        s={methodStatQuery.data.rade}
                        digits={digits}
                      />
                      <StatRow
                        label={
                          <span>
                            Mass (M<sub>⊕</sub>)
                          </span>
                        }
                        s={methodStatQuery.data.masse}
                        digits={digits}
                      />
                      <StatRow
                        label={
                          <span>
                            Star Eff. Temp (T<sub>☉</sub>)
                          </span>
                        }
                        s={methodStatQuery.data.st_teff}
                        digits={digits}
                      />
                      <StatRow
                        label={
                          <span>
                            Star Radius (R<sub>☉</sub>)
                          </span>
                        }
                        s={methodStatQuery.data.st_rad}
                        digits={digits}
                      />
                      <StatRow
                        label={
                          <span>
                            Star Mass (M<sub>☉</sub>)
                          </span>
                        }
                        s={methodStatQuery.data.st_mass}
                        digits={digits}
                      />
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      <RecentActivityCard
        items={recentActivity.data}
        isLoading={recentActivity.isLoading}
        isError={recentActivity.isError}
        error={recentActivity.error}
      />
    </section>
  );
}

/* ===================== Reusable UI ===================== */

function HeroPanel({
  totalPlanets,
  methodCount,
  firstObservationYear,
  timelineLoading,
  timelineErrored,
}: {
  totalPlanets: number;
  methodCount: number;
  firstObservationYear?: number;
  timelineLoading: boolean;
  timelineErrored: boolean;
}) {
  const firstYearValue = timelineLoading
    ? "Loading…"
    : timelineErrored
    ? "—"
    : firstObservationYear !== undefined
    ? String(firstObservationYear)
    : "—";

  return (
    <div style={heroPanelStyle}>
      <div style={heroTopRow}>
        <span style={heroEyebrow}>Exploration overview</span>
        <h1 style={heroTitle}>Exoplanet Dashboard</h1>
        <p style={heroSubtitle}>
          Stay on top of discovery performance and dig into method-level telemetry in a single glance.
        </p>
      </div>

      <div style={heroFooter}>
        <div style={heroMetricsGrid}>
          <HeroMetric label="Planets tracked" value={formatStat(totalPlanets)} />
          <HeroMetric label="Discovery methods" value={formatStat(methodCount)} />
          <HeroMetric label="First Observation Year" value={firstYearValue} />
        </div>
      </div>
    </div>
  );
}

function RecentActivityCard({
  items,
  isLoading,
  isError,
  error,
}: {
  items: RecentActivityEntry[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}) {
  return (
    <div className="card interactive-card" style={{ ...surfaceCard, padding: 24 }}>
      <CardHeader
        title="Recent changes"
        subtitle="Latest catalogue activity (UTC)"
      />
      {isLoading && <InlineLoader text="Loading recent changes…" />}
      {isError && <ErrorNote error={error as Error} />}
      {!isLoading && !isError && (!items || items.length === 0) && (
        <EmptyNote text="No recent activity available." />
      )}
      {!isLoading && !isError && items && items.length > 0 && (
        <ul style={activityList}>
          {items.map((entry) => (
            <li key={`${entry.type}-${entry.id}-${entry.at}`} style={activityItem}>
              <div style={activityHeader}>
                <span style={activityBadge(entry.type)}>
                  {entry.type === "created"
                    ? "Created"
                    : entry.type === "updated"
                    ? "Updated"
                    : "Deleted"}
                </span>
              </div>
              <div style={activityBody}>
                <strong>#{entry.id}</strong>
                <span>{entry.name || "Unknown"}</span>
              </div>
              <div style={activityMeta}>
                <span>{activityTimestampLabel(entry.type)}: {formatUtc(entry.at)}</span>
                {entry.method && <span>Method: {entry.method}</span>}
              </div>
              {entry.changes && entry.changes.length > 0 && (
                <div style={activityChanges}>
                  <span style={activityChangesTitle}>Changes:</span>
                  <ul style={activityChangesList}>
                    {entry.changes.map((change, idx) => (
                      <li key={`${entry.id}-${entry.at}-${change.field}-${idx}`} style={activityChangeItem}>
                        <code>{change.field}</code>: {formatChangeValue(change.before)} → {formatChangeValue(change.after)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatUtc(value: string) {
  try {
    return new Date(value).toISOString().replace("T", " ").replace("Z", " UTC");
  } catch {
    return value;
  }
}

function HeroMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="hero-metric" style={heroMetricCard}>
      <span style={heroMetricLabel}>{label}</span>
      <span style={heroMetricValue}>{value}</span>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      focusable="false"
      aria-hidden="true"
      style={searchIconStyle}
    >
      <path
        d="M11 4a7 7 0 1 1-4.95 11.95L4 17"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

function SelectChevron({ tone = "default" }: { tone?: "default" | "inverse" }) {
  const style = tone === "inverse" ? selectChevronInverseStyle : selectChevronStyle;
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true" style={style}>
      <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CardHeader({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "baseline",
        gap: 8,
        marginBottom: 8,
      }}
    >
      <div>
        <h3 style={{ margin: "0 0 2px 0" }}>{title}</h3>
        {subtitle && (
          <div className="muted" style={{ fontSize: 12 }}>
            {subtitle}
          </div>
        )}
      </div>
      {trailing}
    </div>
  );
}

function PrecisionPicker({
  value,
  onChange,
  variant = "default",
}: {
  value: number;
  onChange: (n: number) => void;
  variant?: "default" | "inverse";
}) {
  const isInverse = variant === "inverse";
  const labelColor = isInverse ? "var(--accent-on-primary)" : "var(--color-text-muted)";
  const wrapperStyle = { ...selectWrapper, marginLeft: 6 };
  const selectStyle = isInverse ? selectControlInverse : selectControl;
  return (
    <label
      className="muted"
      style={{ fontSize: 12, display: "inline-flex", alignItems: "center", color: labelColor, gap: 4 }}
    >
      Decimals:
      <span style={wrapperStyle}>
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ ...selectStyle, width: "100%" }}
          aria-label="Decimal precision"
        >
          {[0, 1, 2, 3, 4].map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <SelectChevron tone={isInverse ? "inverse" : "default"} />
      </span>
    </label>
  );
}

function InlineLoader({ text = "Loading…" }: { text?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        padding: "12px 0",
        display: "flex",
        alignItems: "center",
        gap: 10,
        color: "var(--color-text-muted)",
      }}
    >
      <span style={loaderDot} />
      <span>{text}</span>
    </div>
  );
}

function ErrorNote({ error }: { error: unknown }) {
  return (
    <div
      role="alert"
      style={{
        border: "1px solid var(--note-error-border)",
        background: "var(--note-error-bg)",
        color: "var(--note-error-text)",
        borderRadius: 8,
        padding: 12,
        marginTop: 6,
        whiteSpace: "pre-wrap",
      }}
    >
      {String(error)}
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div
      className="muted"
      style={{
        padding: 16,
        textAlign: "center",
        fontStyle: "italic",
        background: "var(--note-empty-bg)",
        borderRadius: 16,
        border: "1px dashed var(--surface-card-border)",
      }}
    >
      {text}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div style={{ padding: "6px 0" }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th>Method</th>
            <th style={{ textAlign: "right" }}>Count</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i}>
              <td>
                <div style={skeletonBar(160)} />
              </td>
              <td style={{ textAlign: "right" }}>
                <div style={skeletonBar(40)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatRow({
  label,
  s,
  digits,
}: {
  label: ReactNode;
  s?: { min?: number | null; max?: number | null; avg?: number | null; median?: number | null };
  digits: number;
}) {
  return (
    <tr>
      <td style={{ whiteSpace: "nowrap", textAlign: "center" }}>{label}</td>
      <td style={centerCell}>{fmt(s?.min, digits)}</td>
      <td style={centerCell}>{fmt(s?.max, digits)}</td>
      <td style={centerCell}>{fmt(s?.avg, digits)}</td>
      <td style={centerCell}>{fmt(s?.median, digits)}</td>
    </tr>
  );
}

function activityTimestampLabel(type: RecentActivityType) {
  switch (type) {
    case "created":
      return "Created at";
    case "updated":
      return "Updated at";
    case "deleted":
    default:
      return "Deleted at";
  }
}

function formatChangeValue(value: unknown) {
  if (value === null || typeof value === "undefined") return "—";
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(value);
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

/* ===================== Helpers & Styles ===================== */

function formatStat(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  if (!Number.isFinite(value)) return "—";
  return Intl.NumberFormat("en-US").format(Number(value));
}

function fmt(v: number | null | undefined, digits = 2) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return Number(v).toFixed(digits);
}

const pageWrap: React.CSSProperties = {
  display: "grid",
  gap: 24,
};

const contentGrid: React.CSSProperties = {
  display: "grid",
  gap: 24,
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
};

const primaryColumn: React.CSSProperties = {
  display: "grid",
  gap: 24,
};

const detailColumn: React.CSSProperties = {
  display: "grid",
  gap: 24,
};

const surfaceCard: React.CSSProperties = {
  background: "var(--surface-card-bg)",
  borderRadius: 24,
  border: "1px solid var(--surface-card-border)",
  boxShadow: "var(--surface-card-shadow)",
};

const controlBar: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
  marginTop: 12,
};

const statsControlRow: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "flex-end",
  flexWrap: "wrap",
  marginTop: 8,
};

const methodControlRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flex: 1,
};

const searchInput: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px 10px 38px",
  borderRadius: 12,
  border: "1px solid var(--input-border)",
  background: "var(--surface-dim-bg)",
  color: "var(--input-text)",
  fontSize: 14,
  boxShadow: "var(--input-shadow)",
};

const searchIconStyle: React.CSSProperties = {
  position: "absolute",
  left: 12,
  top: "50%",
  width: 16,
  height: 16,
  transform: "translateY(-50%)",
  color: "var(--color-hint)",
};

const selectWrapper: React.CSSProperties = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
};

const selectControl: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid var(--input-border)",
  background: "var(--surface-card-bg)",
  color: "var(--color-text-primary)",
  fontSize: 14,
  lineHeight: "20px",
  padding: "8px 36px 8px 12px",
  appearance: "none",
  boxShadow: "var(--button-ghost-shadow)",
};

const selectControlInverse: React.CSSProperties = {
  ...selectControl,
  border: "1px solid rgba(226, 232, 240, 0.4)",
  background: "rgba(15, 23, 42, 0.6)",
  color: "var(--accent-on-primary)",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.2)",
};

const centerCell: React.CSSProperties = { textAlign: "center" };

const selectChevronStyle: React.CSSProperties = {
  position: "absolute",
  right: 12,
  width: 14,
  height: 14,
  pointerEvents: "none",
  color: "var(--color-text-muted)",
};

const selectChevronInverseStyle: React.CSSProperties = {
  ...selectChevronStyle,
  color: "var(--color-text-secondary)",
};

const ghostButtonSmall: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid var(--button-ghost-border)",
  background: "var(--button-ghost-bg)",
  color: "var(--button-ghost-text)",
  fontSize: 12,
  fontWeight: 500,
  boxShadow: "var(--button-ghost-shadow)",
  cursor: "pointer",
  flexShrink: 0,
};

const methodCell: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  justifyContent: "center",
};

const heroPanelStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #0f172a, #1f2937)",
  borderRadius: 28,
  padding: "32px clamp(18px, 5vw, 44px)",
  color: "var(--accent-on-primary)",
  boxShadow: "0 45px 80px -50px rgba(15, 23, 42, 0.9)",
  display: "grid",
  gap: 28,
  position: "relative",
  overflow: "hidden",
};

const heroTopRow: React.CSSProperties = {
  display: "grid",
  gap: 10,
  maxWidth: 520,
};

const heroEyebrow: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  color: "rgba(148, 163, 184, 0.95)",
};

const heroTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 32,
  fontWeight: 700,
  letterSpacing: -0.5,
};

const heroSubtitle: React.CSSProperties = {
  margin: 0,
  color: "rgba(226, 232, 240, 0.85)",
  fontSize: 15,
};

const heroFooter: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 24,
  alignItems: "center",
  justifyContent: "space-between",
};

const heroMetricsGrid: React.CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  flex: "1 1 320px",
};

const heroMetricCard: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.5)",
  borderRadius: 20,
  padding: "14px 18px",
  border: "1px solid rgba(148, 163, 184, 0.35)",
  display: "grid",
  gap: 6,
};

const heroMetricLabel: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.6,
  color: "rgba(226, 232, 240, 0.7)",
};

const heroMetricValue: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  letterSpacing: -0.5,
};

const activityList: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: 14,
};

const activityItem: React.CSSProperties = {
  display: "grid",
  gap: 6,
  padding: "10px 12px",
  borderRadius: 12,
  background: "var(--surface-muted-bg)",
  border: "1px solid var(--surface-card-border)",
};

const activityHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const badgeBase: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0.4,
  textTransform: "uppercase",
};

const activityBody: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 14,
};

const activityMeta: React.CSSProperties = {
  display: "grid",
  gap: 4,
  fontSize: 12,
  color: "var(--color-text-secondary)",
};

const activityChanges: React.CSSProperties = {
  display: "grid",
  gap: 4,
  fontSize: 12,
  color: "var(--color-text-muted)",
};

const activityChangesTitle: React.CSSProperties = {
  fontWeight: 600,
};

const activityChangesList: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  display: "grid",
  gap: 4,
};

const activityChangeItem: React.CSSProperties = {
  listStyle: "disc",
};

const activityBadgeStyles: Record<RecentActivityType, CSSProperties> = {
  created: {
    ...badgeBase,
    background: "rgba(34, 197, 94, 0.18)",
    color: "var(--color-success)",
  },
  updated: {
    ...badgeBase,
    background: "rgba(59, 130, 246, 0.18)",
    color: "var(--accent-primary)",
  },
  deleted: {
    ...badgeBase,
    background: "rgba(248, 113, 113, 0.2)",
    color: "var(--color-danger)",
  },
};

const activityBadge = (type: RecentActivityType): CSSProperties => activityBadgeStyles[type];

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
};

const loaderDot: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  background: "var(--accent-primary)",
  boxShadow: "0 0 0 4px var(--accent-primary-soft)",
};

const dot: React.CSSProperties = {
  width: 8,
  height: 8,
  background: "var(--color-hint)",
  borderRadius: 999,
  flex: "0 0 auto",
};

function skeletonBar(w: number): React.CSSProperties {
  return { width: w, height: 14, background: "var(--skeleton-bar-bg)", borderRadius: 6 };
}
