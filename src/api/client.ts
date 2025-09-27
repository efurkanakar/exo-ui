import { http, withQuery, urlFor } from "./http";
import type {
  RootOut, HealthOut, ReadinessOut,
  Planet, PlanetCreate, PlanetUpdate, PlanetListResponse,
  PlanetCount, MethodCount, PlanetStats, PlanetTimelinePoint,
  DeletedPlanetOut, PlanetMethodStats,
  PlanetChangeLogEntry, PlanetWithChanges,
  DiscoveryDataset,
  DiscoveryChartType,
} from "./types";

/* ====================== SYSTEM ====================== */

export const getRoot = () => http<RootOut>("/system/root");
export const getHealth = () => http<HealthOut>("/system/health");
export const getReadiness = () => http<ReadinessOut>("/system/readiness");

/* ====================== PLANETS ===================== */

/** Create new planet. Backend returns 201 + PlanetOut. */
export const createPlanet = (payload: PlanetCreate) =>
  http<PlanetWithChanges>("/planets/", { method: "POST", body: JSON.stringify(payload) });

/** List planets with filters/sort/pagination. Param names match backend exactly. */
export function listPlanets(params: {
  limit?: number; offset?: number;
  name?: string; disc_method?: string;
  min_year?: number; max_year?: number;
  min_orbperd?: number; max_orbperd?: number;
  min_rade?: number; max_rade?: number;
  min_masse?: number; max_masse?: number;
  min_st_teff?: number; max_st_teff?: number;
  min_st_rad?: number; max_st_rad?: number;
  min_st_mass?: number; max_st_mass?: number;
  include_deleted?: boolean;
  sort_by?: "id"|"name"|"disc_year"|"disc_method"|"orbperd"|"rade"|"masse"|"st_teff"|"st_rad"|"st_mass"|"created_at";
  sort_order?: "asc"|"desc";
} = {}) {
  return http<PlanetListResponse>(withQuery("/planets/", params));
}

/** Get planet by id (404 if soft-deleted or not found) */
export const getPlanetById = (id: number) => http<Planet>(`/planets/${id}`);

/** Get planet by name (case-insensitive) */
export const getPlanetByName = (planetName: string) =>
  http<Planet>(`/planets/by-name/${encodeURIComponent(planetName)}`);

/** Partially update fields of a planet */
export const patchPlanet = (id: number, payload: PlanetUpdate, apiKey?: string) =>
  http<PlanetWithChanges>(`/planets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: apiKey ? { "x-api-key": apiKey } : undefined,
  });

/** Soft delete (admin-protected: must send x-api-key) */
export const softDeletePlanet = (id: number, apiKey: string) =>
  http<void>(`/planets/${id}`, { method: "DELETE", headers: { "x-api-key": apiKey } });

/** Restore soft-deleted (admin-protected) */
export const restorePlanet = (id: number, apiKey: string) =>
  http<{ ok: boolean; message: string }>(`/planets/${id}/restore`, {
    method: "POST",
    headers: { "x-api-key": apiKey },
  });

/** Count of non-deleted planets */
export const getPlanetCount = () => http<PlanetCount>("/planets/count");

/** Counts per discovery method (note: field is disc_method) */
export const getMethodCounts = () => http<MethodCount[]>("/planets/method-counts");

/** Aggregate stats (min/max/avg) for all non-deleted */
export const getPlanetStats = () => http<PlanetStats>("/planets/stats");

/** Discoveries per year; returns items with disc_year + count */
export const getTimeline = (params: { start_year?: number; end_year?: number; include_deleted?: boolean } = {}) =>
  http<PlanetTimelinePoint[]>(withQuery("/planets/timeline", params));

/** Statistics scoped to a specific discovery method (includes median) */
export const getMethodStats = (discMethod: string) =>
  http<PlanetMethodStats>(`/planets/method/${encodeURIComponent(discMethod)}/stats`);

/** Distinct discovery methods (for select filters) */
export const getDiscoveryMethods = (params: { include_deleted?: boolean; search?: string } = {}) =>
  http<string[]>(withQuery("/planets/methods", params));

/* ====================== ADMIN ======================= */

/** List soft-deleted planets (requires x-api-key) */
export const listDeletedPlanets = (params: { limit?: number; offset?: number; apiKey: string }) =>
  http<DeletedPlanetOut[]>(withQuery("/planets/admin/deleted", {
    limit: params.limit, offset: params.offset
  }), { headers: { "x-api-key": params.apiKey } });

/** Hard delete (dangerous). Kept for admin tooling if needed. */
export const hardDeletePlanet = (id: number, confirm: boolean, apiKey: string) =>
  http<void>(withQuery(`/planets/admin/hard-delete/${id}`, { confirm }), {
    method: "DELETE",
    headers: { "x-api-key": apiKey },
  });

/** Truncate table (dangerous). */
export const wipePlanets = (confirm: boolean, apiKey: string) =>
  http<void>(withQuery("/planets/admin/delete-all", { confirm }), {
    method: "DELETE",
    headers: { "x-api-key": apiKey },
  });

export const getPlanetChangeLogs = (
  params: { limit?: number; offset?: number } = {},
  apiKey?: string,
) =>
  http<PlanetChangeLogEntry[]>(withQuery("/planets/change-logs", params), {
    headers: apiKey ? { "x-api-key": apiKey } : undefined,
  });

/* ==================== VISUALIZATION ==================== */

export const getDiscoveryDataset = (params: {
  chart: DiscoveryChartType;
  bins?: number;
  sigma?: number;
}) => http<DiscoveryDataset>(withQuery("/vis/discovery", params));

export const getDiscoveryChartUrl = (params: {
  chart: DiscoveryChartType;
  bins?: number;
  sigma?: number;
}) => urlFor(withQuery("/vis/discovery.png", params));
