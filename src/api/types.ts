/** Types aligned with your FastAPI responses. Adjust if backend changes. */

export interface RootOut { message: string }

export interface HealthOut {
  status: "ok" | "fail";
  uptime?: number;
}

export interface ReadinessOut {
  status: "ready" | "not_ready";
  db?: "up" | "down";
  details?: Record<string, unknown>;
}

export interface Planet {
  id: number;
  name: string;
  disc_method?: string | null;
  disc_year?: number | null;
  orbperd?: number | null;  // days
  rade?: number | null;     // Earth radii
  masse?: number | null;    // Earth masses
  st_teff?: number | null;  // K
  st_rad?: number | null;   // Solar radii
  st_mass?: number | null;  // Solar masses
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
  changes?: PlanetChangeEntry[];
  [k: string]: unknown;
}

export interface PlanetChangeEntry {
  field: string;
  before?: unknown;
  after?: unknown;
}

export interface PlanetWithChanges extends Planet {
  changes?: PlanetChangeEntry[];
}

export interface PlanetChangeLogEntry {
  id: number;
  planet_id: number;
  action: "create" | "update" | "delete";
  planet_name?: string;
  changes: PlanetChangeEntry[];
  created_at: string;
}

/** POST /planets/ payload */
export interface PlanetCreate {
  name: string;
  disc_method?: string;
  disc_year?: number;
  orbperd?: number;
  rade?: number;
  masse?: number;
  st_teff?: number;
  st_rad?: number;
  st_mass?: number;
}

/** PATCH /planets/{id} payload */
export type PlanetUpdate = Partial<PlanetCreate>;

export interface PlanetListResponse {
  items: Planet[];
  total: number;
  limit: number;
  offset: number;
}

export interface PlanetCount { count: number }

/** /planets/method-counts returns objects with disc_method + count */
export interface MethodCount { disc_method: string | null; count: number }

export interface StatBlockAvg {
  min?: number | null;
  max?: number | null;
  avg?: number | null;
}
export interface StatBlockAvgMedian extends StatBlockAvg {
  median?: number | null;
}

export interface PlanetStats {
  count?: number;
  orbperd?: StatBlockAvgMedian;
  rade?: StatBlockAvgMedian;
  masse?: StatBlockAvgMedian;
  st_teff?: StatBlockAvgMedian;
  st_rad?: StatBlockAvgMedian;
  st_mass?: StatBlockAvgMedian;
}

export type DiscoveryChartType = "hist" | "year" | "method";

export interface DiscoveryHistogramDataset {
  chart: "hist";
  bins: number;
  counts: number[];
  bin_edges: number[];
  mean: number | null;
  std: number | null;
  lower: number | null;
  upper: number | null;
}

export interface DiscoveryYearDataset {
  chart: "year";
  series: Array<{ disc_year: number; count: number }>;
}

export interface DiscoveryMethodDataset {
  chart: "method";
  series: Array<{ disc_method: string | null; count: number }>;
}

export type DiscoveryDataset =
  | DiscoveryHistogramDataset
  | DiscoveryYearDataset
  | DiscoveryMethodDataset;

export interface PlanetMethodStats {
  disc_method: string;
  count?: number;
  orbperd?: StatBlockAvgMedian;
  rade?: StatBlockAvgMedian;
  masse?: StatBlockAvgMedian;
  st_teff?: StatBlockAvgMedian;
  st_rad?: StatBlockAvgMedian;
  st_mass?: StatBlockAvgMedian;
}

/** Timeline point: backend returns disc_year + count */
export interface PlanetTimelinePoint { disc_year: number; count: number }

/** Admin listing row */
export interface DeletedPlanetOut {
  id: number;
  name: string;
  disc_method?: string | null;
  disc_year?: number | null;
  deleted_at: string;
}
