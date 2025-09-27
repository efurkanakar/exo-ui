import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useDiscoveryDataset } from "../hooks/useVisualization";
import { getDiscoveryChartUrl } from "../api/client";
import type {
  DiscoveryChartType,
  DiscoveryDataset,
  DiscoveryHistogramDataset,
  DiscoveryMethodDataset,
  DiscoveryYearDataset,
} from "../api/types";

const chartOptions: Array<{ value: DiscoveryChartType; label: string; description: string }> = [
  { value: "hist", label: "Histogram", description: "Host star effective temperature distribution." },
  { value: "year", label: "By Year", description: "Annual discovery counts." },
  { value: "method", label: "By Method", description: "Discoveries grouped by detection method." },
];

export default function VisualizationPage() {
  const [chart, setChart] = useState<DiscoveryChartType>("hist");
  const [bins, setBins] = useState<number>(30);
  const [sigma, setSigma] = useState<number>(3);
  const [binsDraft, setBinsDraft] = useState<string>(() => String(30));
  const [sigmaDraft, setSigmaDraft] = useState<string>(() => String(3));
  const [previewVersion, setPreviewVersion] = useState(0);
  const isFirstRender = useRef(true);

  const params = useMemo(() => ({
    chart,
    bins: chart === "hist" ? bins : undefined,
    sigma: chart === "hist" ? sigma : undefined,
  }), [chart, bins, sigma]);

  const datasetQuery = useDiscoveryDataset(params);
  const dataset = datasetQuery.data;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setPreviewVersion((prev) => prev + 1);
  }, [chart, bins, sigma]);

  const previewUrl = useMemo(() => {
    const base = getDiscoveryChartUrl(params);
    const separator = base.includes("?") ? "&" : "?";
    return `${base}${separator}v=${previewVersion}`;
  }, [params, previewVersion]);

  useEffect(() => {
    setBinsDraft(String(bins));
  }, [bins]);

  useEffect(() => {
    setSigmaDraft(String(sigma));
  }, [sigma]);

  const stats = useMemo(() => (dataset ? buildStats(dataset) : []), [dataset]);

  const handlePreviewRefresh = () => {
    setPreviewVersion((prev) => prev + 1);
  };

  const normalizeBinsDraft = useMemo(() => {
    if (!binsDraft.trim()) return null;
    const parsed = Number(binsDraft);
    if (!Number.isFinite(parsed)) return null;
    const rounded = Math.round(parsed);
    if (!Number.isFinite(rounded)) return null;
    return Math.min(200, Math.max(5, rounded));
  }, [binsDraft]);

  const normalizeSigmaDraft = useMemo(() => {
    if (!sigmaDraft.trim()) return null;
    const parsed = Number(sigmaDraft);
    if (!Number.isFinite(parsed)) return null;
    const clamped = Math.min(10, Math.max(0, parsed));
    return Number(clamped.toFixed(1));
  }, [sigmaDraft]);

  const histogramInvalid = chart === "hist" && (normalizeBinsDraft === null || normalizeSigmaDraft === null);
  const histogramDirty = chart === "hist" && !histogramInvalid && (
    normalizeBinsDraft !== bins || normalizeSigmaDraft !== sigma
  );

  const handleApplyHistogram = () => {
    if (histogramInvalid) return;
    if (normalizeBinsDraft === null || normalizeSigmaDraft === null) return;
    setBins(normalizeBinsDraft);
    setSigma(normalizeSigmaDraft);
  };

  return (
    <section style={pageWrap}>
      <header style={pageIntro}>
        <div>
          <h1 style={pageTitle}>Visualization Explorer</h1>
          <p style={pageSubtitle}>
            Interact with discovery datasets and preview ready-to-embed charts generated directly by the API.
          </p>
        </div>
      </header>

      <div className="visualization-grid">
        <div style={visualLeftColumn}>
          <div className="card interactive-card" style={{ ...surfaceCard, padding: 24 }}>
            <CardHeader
              title="PNG preview"
              trailing={
                <button type="button" onClick={handlePreviewRefresh} style={ghostButton}>
                  Refresh preview
                </button>
              }
            />
            <div style={previewFrame}>
              {datasetQuery.isLoading ? (
                <SkeletonBlock rows={8} />
              ) : (
                <img
                  src={previewUrl}
                  alt={`Visualization chart for ${chart}`}
                  key={previewVersion}
                  style={{ width: "100%", borderRadius: 18, border: "1px solid var(--surface-card-border)" }}
                />
              )}
            </div>
          </div>

          <div className="card interactive-card" style={{ ...surfaceCard, padding: 24 }}>
            <CardHeader
              title="Dataset insights"
              subtitle="Summaries update automatically with the current chart options."
            />
            {datasetQuery.isLoading && <SkeletonBlock rows={6} />}
            {datasetQuery.isError && (
              <ErrorNote text={(datasetQuery.error as Error)?.message ?? "Failed to load dataset."} />
            )}
            {!datasetQuery.isLoading && !datasetQuery.isError && dataset && (
              <div style={{ display: "grid", gap: 18 }}>
                <div style={statsGrid}>
                  {stats.map((stat) => (
                    <div key={stat.label} style={statCard}>
                      <span style={statLabel}>{stat.label}</span>
                      <span style={statValue}>{stat.value}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gap: 12 }}>
                  <h3 style={sectionTitle}>Breakdown</h3>
                  <DatasetBreakdown dataset={dataset} />
                </div>
              </div>
            )}
            {!datasetQuery.isLoading && !datasetQuery.isError && !dataset && (
              <EmptyNote text="Dataset is empty for the selected combination." />
            )}
          </div>
        </div>

        <div style={visualRightColumn}>
          <div className="card interactive-card" style={{ ...surfaceCard, padding: 24 }}>
            <CardHeader
              title="Discovery datasets"
              subtitle="Select a representation and refine the parameters to inspect underlying values."
              trailing={
                <button type="button" onClick={() => datasetQuery.refetch()} style={ghostButton}>
                  Refresh data
                </button>
              }
            />

            <div style={chartToggleRow}>
              {chartOptions.map((option) => {
                const active = option.value === chart;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setChart(option.value)}
                    style={chartToggleButton(active)}
                  >
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </button>
                );
              })}
            </div>

            {chart === "hist" && (
              <div style={paramCluster}>
                <label style={fieldLabel}>
                  Bins (5-200)
                  <input
                    type="number"
                    min={5}
                    max={200}
                    value={binsDraft}
                    onChange={(e) => setBinsDraft(e.target.value)}
                    style={inputControl}
                  />
                </label>
                <label style={fieldLabel}>
                  Sigma clip (0-10)
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={sigmaDraft}
                    onChange={(e) => setSigmaDraft(e.target.value)}
                    style={inputControl}
                  />
                </label>
                <div style={paramButtonCell}>
                  <button
                    type="button"
                    onClick={handleApplyHistogram}
                    style={{
                      ...primaryButton,
                      opacity: histogramInvalid || !histogramDirty ? 0.5 : 1,
                      cursor: histogramInvalid || !histogramDirty ? "not-allowed" : "pointer",
                    }}
                    disabled={histogramInvalid || !histogramDirty}
                  >
                    Apply
                  </button>
                  {histogramInvalid && (
                    <span style={paramHelperText}>Enter bins 5-200 and sigma 0-10.</span>
                  )}
                </div>
              </div>
            )}

            <div style={datasetStatusRow}>
              {datasetQuery.isFetching && (
                <span style={datasetStatusChip("loading")}>Loading dataset…</span>
              )}
              {!datasetQuery.isFetching && datasetQuery.isError && (
                <span style={datasetStatusChip("error")}>Dataset failed to load.</span>
              )}
              {!datasetQuery.isFetching && !datasetQuery.isError && dataset && (
                <span style={datasetStatusChip("ready")}>Dataset ready.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DatasetBreakdown({ dataset }: { dataset: DiscoveryDataset }) {
  if (dataset.chart === "hist") {
    return <HistogramBreakdown data={dataset} />;
  }
  if (dataset.chart === "year") {
    return <YearBreakdown data={dataset} />;
  }
  return <MethodBreakdown data={dataset} />;
}

function HistogramBreakdown({ data }: { data: DiscoveryHistogramDataset }) {
  if (!data.counts.length) {
    return <EmptyNote text="Histogram is empty after filters." />;
  }
  const rows = data.counts.map((count, idx) => ({
    range: `${formatNumber(data.bin_edges[idx])} – ${formatNumber(data.bin_edges[idx + 1])}`,
    count,
  }));
  return (
    <div style={tableScroll}>
      <table style={miniTable}>
        <thead>
          <tr>
            <th>Range (K)</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              <td>{row.range}</td>
              <td>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function YearBreakdown({ data }: { data: DiscoveryYearDataset }) {
  if (!data.series.length) {
    return <EmptyNote text="No discovery years available." />;
  }
  return (
    <div style={tableScroll}>
      <table style={miniTable}>
        <thead>
          <tr>
            <th>Year</th>
            <th>Discoveries</th>
          </tr>
        </thead>
        <tbody>
          {data.series.map((row) => (
            <tr key={row.disc_year}>
              <td>{row.disc_year}</td>
              <td>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MethodBreakdown({ data }: { data: DiscoveryMethodDataset }) {
  if (!data.series.length) {
    return <EmptyNote text="No discovery methods available." />;
  }
  return (
    <div style={tableScroll}>
      <table style={miniTable}>
        <thead>
          <tr>
            <th>Method</th>
            <th>Discoveries</th>
          </tr>
        </thead>
        <tbody>
          {data.series.map((row, idx) => (
            <tr key={`${row.disc_method ?? "unknown"}-${idx}`}>
              <td>{row.disc_method ?? "Unknown"}</td>
              <td>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildStats(dataset: DiscoveryDataset) {
  switch (dataset.chart) {
    case "hist": {
      const total = dataset.counts.reduce((sum, value) => sum + value, 0);
      return [
        { label: "Histogram bins", value: dataset.bins.toString() },
        { label: "Samples", value: total.toLocaleString() },
        { label: "Mean Teff", value: dataset.mean ? `${formatNumber(dataset.mean)} K` : "—" },
        { label: "Std dev", value: dataset.std ? `${formatNumber(dataset.std)} K` : "—" },
      ];
    }
    case "year": {
      const total = dataset.series.reduce((sum, row) => sum + row.count, 0);
      const first = dataset.series.at(0)?.disc_year;
      const last = dataset.series.at(-1)?.disc_year;
      return [
        { label: "Years tracked", value: dataset.series.length.toString() },
        { label: "Total discoveries", value: total.toLocaleString() },
        { label: "First year", value: first ? String(first) : "—" },
        { label: "Latest year", value: last ? String(last) : "—" },
      ];
    }
    case "method": {
      const total = dataset.series.reduce((sum, row) => sum + row.count, 0);
      const top = dataset.series[0];
      return [
        { label: "Methods", value: dataset.series.length.toString() },
        { label: "Total discoveries", value: total.toLocaleString() },
        { label: "Top method", value: top?.disc_method ?? "Unknown" },
        { label: "Top method count", value: top ? top.count.toLocaleString() : "—" },
      ];
    }
    default:
      return [];
  }
}

function SkeletonBlock({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} style={skeletonBar(100 - idx * 8)} />
      ))}
    </div>
  );
}

function skeletonBar(width: number): CSSProperties {
  return {
    width: `${Math.max(30, width)}%`,
    height: 14,
    background: "var(--skeleton-bar-bg)",
    borderRadius: 8,
  };
}

function CardHeader({ title, subtitle, trailing }: { title: string; subtitle?: string; trailing?: ReactNode }) {
  return (
    <div style={cardHeader}>
      <div>
        <h3 style={{ margin: "0 0 4px" }}>{title}</h3>
      {subtitle && <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{subtitle}</div>}
      </div>
      {trailing}
    </div>
  );
}

function ErrorNote({ text }: { text: string }) {
  return (
    <div style={errorNote} role="alert">
      {text}
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <div style={emptyNote}>{text}</div>;
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(1) : "—";
}

const pageWrap: CSSProperties = {
  display: "grid",
  gap: 24,
  maxWidth: 1680,
  margin: "0 auto",
  width: "100%",
};

const pageIntro: CSSProperties = {
  background: "var(--surface-card-bg)",
  borderRadius: 28,
  border: "1px solid var(--surface-card-border)",
  boxShadow: "var(--surface-card-shadow)",
  padding: "28px clamp(18px, 5vw, 40px)",
};

const pageTitle: CSSProperties = {
  margin: 0,
  fontSize: 30,
  fontWeight: 700,
  color: "var(--color-heading)",
  letterSpacing: -0.3,
};

const pageSubtitle: CSSProperties = {
  margin: "10px 0 0",
  color: "var(--color-text-secondary)",
  fontSize: 14,
  lineHeight: "22px",
  maxWidth: 640,
};

const visualLeftColumn: CSSProperties = {
  display: "grid",
  gap: 24,
  alignContent: "start",
  minWidth: 0,
};

const visualRightColumn: CSSProperties = {
  display: "grid",
  gap: 24,
  alignContent: "start",
  minWidth: 0,
};

const surfaceCard: CSSProperties = {
  background: "var(--surface-card-bg)",
  borderRadius: 24,
  border: "1px solid var(--surface-card-border)",
  boxShadow: "var(--surface-card-shadow)",
};

const cardHeader: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 12,
  alignItems: "start",
};

const chartToggleRow: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "1fr",
  marginBottom: 16,
};

const chartToggleButton = (active: boolean): CSSProperties => ({
  display: "grid",
  gap: 4,
  padding: "12px 16px",
  borderRadius: 16,
  border: `1px solid ${active ? "var(--accent-primary)" : "var(--surface-card-border)"}`,
  background: active
    ? "linear-gradient(135deg, var(--accent-primary), var(--accent-primary-strong))"
    : "var(--surface-card-bg)",
  color: active ? "var(--accent-on-primary)" : "var(--color-heading)",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: active ? "0 18px 32px -24px rgba(37, 99, 235, 0.6)" : "none",
  width: "100%",
});

const paramCluster: CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  alignItems: "end",
  marginBottom: 16,
};

const fieldLabel: CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 12,
  color: "var(--color-text-secondary)",
  fontWeight: 600,
  letterSpacing: 0.3,
};

const inputControl: CSSProperties = {
  width: "100%",
  borderRadius: 10,
  border: "1px solid var(--input-border)",
  padding: "10px 12px",
  fontSize: 13,
  lineHeight: "20px",
  color: "var(--input-text)",
  background: "var(--input-bg)",
  boxShadow: "var(--input-shadow)",
};

const paramButtonCell: CSSProperties = {
  display: "grid",
  gap: 8,
  alignContent: "end",
};

const statsGrid: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
};

const statCard: CSSProperties = {
  border: "1px solid var(--surface-card-border)",
  borderRadius: 18,
  padding: "14px 16px",
  background: "var(--surface-dim-bg)",
  display: "grid",
  gap: 4,
};

const statLabel: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  color: "var(--color-text-muted)",
};

const statValue: CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: "var(--color-heading)",
  wordBreak: "break-word",
};

const sectionTitle: CSSProperties = {
  margin: 0,
  fontSize: 16,
  fontWeight: 600,
  color: "var(--color-heading)",
};

const datasetStatusRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 12,
};

const datasetStatusChip = (variant: "loading" | "ready" | "error"): CSSProperties => {
  const palette = {
    loading: { bg: "rgba(37, 99, 235, 0.14)", fg: "var(--accent-primary-strong)" },
    ready: { bg: "rgba(16, 185, 129, 0.18)", fg: "var(--color-success)" },
    error: { bg: "rgba(220, 38, 38, 0.16)", fg: "var(--color-danger)" },
  } as const;
  const { bg, fg } = palette[variant];
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.3,
    background: bg,
    color: fg,
  };
};

const previewFrame: CSSProperties = {
  background: "var(--surface-dim-bg)",
  borderRadius: 20,
  border: "1px solid var(--surface-card-border)",
  padding: 16,
  display: "grid",
  placeItems: "center",
  minHeight: 260,
};

const ghostButton: CSSProperties = {
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid var(--button-ghost-border)",
  background: "var(--button-ghost-bg)",
  color: "var(--button-ghost-text)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const primaryButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 16px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, var(--accent-primary), var(--accent-primary-strong))",
  color: "var(--accent-on-primary)",
  fontSize: 13,
  fontWeight: 600,
  boxShadow: "0 12px 24px -14px rgba(37, 99, 235, 0.65)",
  transition: "opacity 0.2s ease, transform 0.2s ease",
  width: "100%",
  minHeight: 42,
};

const paramHelperText: CSSProperties = {
  fontSize: 12,
  color: "var(--color-text-muted)",
};

const tableScroll: CSSProperties = {
  maxHeight: 260,
  overflowY: "auto",
  border: "1px solid var(--surface-card-border)",
  borderRadius: 16,
};

const miniTable: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const errorNote: CSSProperties = {
  border: "1px solid var(--note-error-border)",
  background: "var(--note-error-bg)",
  color: "var(--note-error-text)",
  padding: 12,
  borderRadius: 12,
  fontSize: 13,
};

const emptyNote: CSSProperties = {
  padding: 18,
  borderRadius: 12,
  textAlign: "center",
  color: "var(--note-empty-text)",
  background: "var(--note-empty-bg)",
};
