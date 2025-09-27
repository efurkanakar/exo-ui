import { useMemo } from "react";
import type { CSSProperties } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import {
  useSystemRoot,
  useSystemHealth,
  useSystemReadiness,
} from "../hooks/useSystem";

interface DiagnosticMeta {
  key: string;
  title: string;
  description: string;
}

type QueryStatus = "pending" | "error" | "success";

const statusThemes: Record<QueryStatus, { label: string; badge: string; badgeBg: string; border: string }> = {
  pending: {
    label: "Checking",
    badge: "var(--accent-primary-strong)",
    badgeBg: "rgba(37, 99, 235, 0.12)",
    border: "rgba(37, 99, 235, 0.35)",
  },
  success: {
    label: "Healthy",
    badge: "var(--color-success)",
    badgeBg: "rgba(34, 197, 94, 0.14)",
    border: "rgba(34, 197, 94, 0.35)",
  },
  error: {
    label: "Issue",
    badge: "var(--color-danger)",
    badgeBg: "rgba(248, 113, 113, 0.18)",
    border: "rgba(248, 113, 113, 0.45)",
  },
};

export default function DiagnosticsPage() {
  const root = useSystemRoot();
  const health = useSystemHealth();
  const readiness = useSystemReadiness();

  const diagnostics = useMemo<Array<DiagnosticMeta & { query: UseQueryResult<unknown, Error> }>>(
    () => [
      {
        key: "root",
        title: "/system/root",
        description: "Service metadata and welcome banner.",
        query: root,
      },
      {
        key: "health",
        title: "/system/health",
        description: "Liveness probe to confirm core dependencies respond.",
        query: health,
      },
      {
        key: "readiness",
        title: "/system/readiness",
        description: "Readiness signal verifying database connections.",
        query: readiness,
      },
    ],
    [root, health, readiness]
  );

  return (
    <section style={pageWrap}>
      <header style={pageIntro}>
        <div>
          <h1 style={pageTitle}>Diagnostics</h1>
          <p style={pageSubtitle}>
            Monitor API liveness, readiness, and metadata quickly. Each probe can be refreshed on demand
            for instant feedback.
          </p>
        </div>
      </header>

      <div style={cardGrid}>
        {diagnostics.map(({ key, title, description, query }) => {
          const status = query.status as QueryStatus;
          const theme = statusThemes[status];
          const timestamp = query.dataUpdatedAt || query.errorUpdatedAt;
          const formattedTimestamp = timestamp
            ? new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
            : "—";
          const body = getBodyContent(status, query.data, query.error);

          return (
            <article key={key} style={{ ...statusCard, borderColor: theme.border }}>
              <div style={cardHeaderRow}>
                <div>
                  <h2 style={cardTitle}>{title}</h2>
                  <p style={cardSubtitle}>{description}</p>
                </div>
                <span style={{ ...statusBadge, background: theme.badgeBg, color: theme.badge }}>{theme.label}</span>
              </div>

              <div style={cardBody}>{body}</div>

              <div style={cardFooter}>
                <span style={footerMeta}>Updated: {formattedTimestamp}</span>
                <button type="button" onClick={() => query.refetch()} style={refreshButton}>
                  Refresh
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function getBodyContent(status: QueryStatus, data: unknown, error: unknown) {
  if (status === "pending") {
    return <SkeletonRows />;
  }

  if (status === "error") {
    return (
      <pre style={{ ...logBlock, color: "var(--note-error-text)" }}>
        {typeof error === "string" ? error : (error as Error)?.message ?? JSON.stringify(error, null, 2)}
      </pre>
    );
  }

  return <pre style={logBlock}>{JSON.stringify(data, null, 2)}</pre>;
}

function SkeletonRows() {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={idx} style={skeletonBar(100 - idx * 10)} />
      ))}
    </div>
  );
}

function skeletonBar(width: number): CSSProperties {
  return {
    width: `${width}%`,
    height: 14,
    background: "var(--skeleton-bar-bg)",
    borderRadius: 8,
  };
}

const pageWrap: CSSProperties = {
  display: "grid",
  gap: 24,
  maxWidth: 1400,
  margin: "0 auto",
  width: "100%",
};

const pageIntro: CSSProperties = {
  background: "var(--surface-card-bg)",
  borderRadius: 24,
  border: "1px solid var(--surface-card-border)",
  boxShadow: "var(--surface-card-shadow)",
  padding: "26px clamp(18px, 5vw, 38px)",
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

const cardGrid: CSSProperties = {
  display: "grid",
  gap: 20,
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
};

const statusCard: CSSProperties = {
  background: "var(--surface-card-bg)",
  borderRadius: 22,
  border: "1px solid rgba(37, 99, 235, 0.16)",
  boxShadow: "0 18px 40px -30px rgba(15, 23, 42, 0.35)",
  padding: 22,
  display: "grid",
  gap: 16,
};

const cardHeaderRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
};

const cardTitle: CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 600,
  color: "var(--color-heading)",
};

const cardSubtitle: CSSProperties = {
  margin: "6px 0 0",
  color: "var(--color-text-muted)",
  fontSize: 13,
  lineHeight: "20px",
};

const statusBadge: CSSProperties = {
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0.5,
  textTransform: "uppercase",
};

const cardBody: CSSProperties = {
  background: "var(--surface-dim-bg)",
  borderRadius: 16,
  border: "1px solid var(--surface-card-border)",
  padding: 16,
  minHeight: 140,
  overflow: "hidden",
};

const logBlock: CSSProperties = {
  margin: 0,
  fontSize: 12,
  lineHeight: "18px",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  maxHeight: 220,
  overflowY: "auto",
};

const cardFooter: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const footerMeta: CSSProperties = {
  fontSize: 12,
  color: "var(--color-text-muted)",
  letterSpacing: 0.3,
};

const refreshButton: CSSProperties = {
  border: "1px solid var(--accent-primary)",
  background: "linear-gradient(135deg, var(--accent-primary), var(--accent-primary-strong))",
  color: "var(--accent-on-primary)",
  borderRadius: 999,
  padding: "8px 16px",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0.4,
  textTransform: "uppercase",
  cursor: "pointer",
};
