import type { ReactNode } from "react";

/** Friendly labels for planet fields, including subscript formatting without relying on Unicode glyphs. */
export const PLANET_FIELD_LABELS: Record<string, ReactNode> = {
  name: "Name",
  disc_method: "Discovery Method",
  disc_year: "Discovery Year",
  orbperd: (
    <span>
      Orbital Period (P<sub>orb</sub>)
    </span>
  ),
  rade: (
    <span>
      Radius (R<sub>earth</sub>)
    </span>
  ),
  masse: (
    <span>
      Mass (M<sub>earth</sub>)
    </span>
  ),
  st_teff: (
    <span>
      Star Effective Temperature (T<sub>eff</sub>)
    </span>
  ),
  st_rad: (
    <span>
      Star Radius (R<sub>star</sub>)
    </span>
  ),
  st_mass: (
    <span>
      Star Mass (M<sub>star</sub>)
    </span>
  ),
  is_deleted: "Deleted",
};

/**
 * Decode FastAPI validation errors into readable React nodes using the planet field label map.
 */
export function extractPlanetApiErrors(error: unknown): ReactNode[] | null {
  if (!error) return null;
  const message = typeof error === "string" ? error : error instanceof Error ? error.message : null;
  if (!message) return null;
  const jsonStart = message.indexOf("{");
  if (jsonStart === -1) return null;
  try {
    const payload = JSON.parse(message.slice(jsonStart));
    if (!payload || typeof payload !== "object" || !Array.isArray((payload as { detail?: unknown }).detail)) {
      return null;
    }
    const entries = (payload as { detail: unknown[] }).detail;
    const details: ReactNode[] = [];

    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      const rawSegments = Array.isArray((entry as { loc?: unknown }).loc)
        ? (entry as { loc?: unknown[] }).loc!.filter((segment) => segment !== "body")
        : undefined;
      const fieldKey = rawSegments?.length ? String(rawSegments[rawSegments.length - 1]) : undefined;
      const fieldLabel: ReactNode | undefined = fieldKey
        ? PLANET_FIELD_LABELS[fieldKey] ?? prettifyField(fieldKey)
        : undefined;
      const msg = typeof (entry as { msg?: unknown }).msg === "string" ? (entry as { msg: string }).msg : undefined;

      if (fieldLabel && msg) {
        details.push(
          <span>
            <strong>{fieldLabel}</strong>: {msg}
          </span>
        );
        continue;
      }

      if (msg) {
        details.push(msg);
        continue;
      }

      if (fieldLabel) {
        details.push(<span>{fieldLabel}</span>);
      }
    }

    return details.length ? details : null;
  } catch {
    return null;
  }
}

function prettifyField(key: string): string {
  if (!key) return key;
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
