import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  listPlanets,
  getPlanetCount,
  getMethodCounts,
  getPlanetStats,
  getTimeline,
  getPlanetById,
  getPlanetByName,
  createPlanet,
  patchPlanet,
  softDeletePlanet,
  restorePlanet,
  listDeletedPlanets,
  getMethodStats,
  getDiscoveryMethods,
  hardDeletePlanet,
  wipePlanets,
  getPlanetChangeLogs,
} from "../api/client";
import type {
  PlanetListResponse, MethodCount, PlanetStats, PlanetTimelinePoint, Planet,
  DeletedPlanetOut, PlanetCreate, PlanetUpdate, PlanetMethodStats, PlanetCount,
  PlanetChangeEntry, PlanetChangeLogEntry,
} from "../api/types";

/** Paginated planet list with filters */
export function usePlanetList(params: Parameters<typeof listPlanets>[0]) {
  return useQuery<PlanetListResponse, Error>({
    queryKey: ["planets", "list", params],
    queryFn: () => listPlanets(params),
    placeholderData: keepPreviousData,
  });
}

export const usePlanetCount = () =>
  useQuery<PlanetCount>({ queryKey: ["planets","count"], queryFn: getPlanetCount });

export const useMethodCounts = () =>
  useQuery<MethodCount[]>({ queryKey: ["planets","method-counts"], queryFn: getMethodCounts });

export const usePlanetStats = () =>
  useQuery<PlanetStats>({ queryKey: ["planets","stats"], queryFn: getPlanetStats });

export function useTimeline(params: Parameters<typeof getTimeline>[0]) {
  return useQuery<PlanetTimelinePoint[]>({
    queryKey: ["planets","timeline", params],
    queryFn: () => getTimeline(params),
  });
}

/** Detail fetchers */
export const usePlanetById = (id?: number) =>
  useQuery<Planet>({ queryKey: ["planets","byId", id], queryFn: () => getPlanetById(id!), enabled: !!id });

export const usePlanetByName = (name?: string) =>
  useQuery<Planet>({ queryKey: ["planets","byName", name], queryFn: () => getPlanetByName(name!), enabled: !!name });

export const useMethodStats = (method?: string) =>
  useQuery<PlanetMethodStats>({ queryKey: ["planets","methodStats", method], queryFn: () => getMethodStats(method!), enabled: !!method });

/** Discovery methods for select inputs */
export const useDiscoveryMethods = (search?: string) =>
  useQuery<string[]>({
    queryKey: ["planets","methods", search ?? ""],
    queryFn: () => getDiscoveryMethods({ search: search || undefined }),
  });

/** Mutations */
export function useCreatePlanet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PlanetCreate) => createPlanet(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planets","list"] });
      qc.invalidateQueries({ queryKey: ["planets","count"] });
      qc.invalidateQueries({ queryKey: ["planets","stats"] });
      qc.invalidateQueries({ queryKey: ["planets","timeline"] });
      qc.invalidateQueries({ queryKey: ["planets","methods"] });
      qc.invalidateQueries({ queryKey: ["planets","method-counts"] });
      qc.invalidateQueries({ queryKey: ["planets","recent-activity"] });
    },
  });
}

export function usePatchPlanet(id: number, apiKey?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PlanetUpdate) => patchPlanet(id, payload, apiKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planets","list"] });
      qc.invalidateQueries({ queryKey: ["planets","byId", id] });
      qc.invalidateQueries({ queryKey: ["planets","stats"] });
      qc.invalidateQueries({ queryKey: ["planets","recent-activity"] });
    },
  });
}

export function useSoftDeletePlanet(id: number, apiKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => softDeletePlanet(id, apiKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planets","list"] });
      qc.invalidateQueries({ queryKey: ["planets","count"] });
      qc.invalidateQueries({ queryKey: ["planets","timeline"] });
      qc.invalidateQueries({ queryKey: ["admin","deleted"] });
      qc.invalidateQueries({ queryKey: ["planets","method-counts"] });
      qc.invalidateQueries({ queryKey: ["planets","recent-activity"] });
    },
  });
}

export function useRestorePlanet(id: number, apiKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => restorePlanet(id, apiKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planets","list"] });
      qc.invalidateQueries({ queryKey: ["admin","deleted"] });
      qc.invalidateQueries({ queryKey: ["planets","count"] });
      qc.invalidateQueries({ queryKey: ["planets","method-counts"] });
      qc.invalidateQueries({ queryKey: ["planets","recent-activity"] });
    },
  });
}

export function useRestorePlanetById(apiKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (planetId: number) => restorePlanet(planetId, apiKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planets","list"] });
      qc.invalidateQueries({ queryKey: ["admin","deleted"] });
      qc.invalidateQueries({ queryKey: ["planets","count"] });
      qc.invalidateQueries({ queryKey: ["planets","method-counts"] });
      qc.invalidateQueries({ queryKey: ["planets","recent-activity"] });
    },
  });
}

export function useHardDeletePlanetMutation(apiKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (planetId: number) => hardDeletePlanet(planetId, true, apiKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planets","list"] });
      qc.invalidateQueries({ queryKey: ["admin","deleted"] });
      qc.invalidateQueries({ queryKey: ["planets","count"] });
      qc.invalidateQueries({ queryKey: ["planets","timeline"] });
      qc.invalidateQueries({ queryKey: ["planets","recent-activity"] });
    },
  });
}

export function useWipePlanetsMutation(apiKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => wipePlanets(true, apiKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planets","list"] });
      qc.invalidateQueries({ queryKey: ["admin","deleted"] });
      qc.invalidateQueries({ queryKey: ["planets","count"] });
      qc.invalidateQueries({ queryKey: ["planets","timeline"] });
      qc.invalidateQueries({ queryKey: ["planets","method-counts"] });
      qc.invalidateQueries({ queryKey: ["planets","recent-activity"] });
    },
  });
}

/** Admin list (read-only) */
export function useAdminDeleted(params: { limit?: number; offset?: number; apiKey: string }) {
  return useQuery<DeletedPlanetOut[], Error>({
    queryKey: ["admin","deleted", params],
    queryFn: () => listDeletedPlanets(params),
    placeholderData: keepPreviousData,
    enabled: !!params.apiKey,
  });
}

export type RecentActivityType = "created" | "deleted" | "updated";

export interface RecentActivityEntry {
  id: number;
  name: string;
  type: RecentActivityType;
  at: string;
  method?: string | null;
  disc_year?: number | null;
  orbperd?: number | null;
  rade?: number | null;
  masse?: number | null;
  st_teff?: number | null;
  st_rad?: number | null;
  st_mass?: number | null;
  changes?: PlanetChangeEntry[];
}

export function useRecentActivity(limit = 6) {
  return useQuery<RecentActivityEntry[], Error>({
    queryKey: ["planets", "recent-activity", limit],
    queryFn: () => fetchRecentActivity(limit),
    staleTime: 60_000,
  });
}

async function fetchRecentActivity(limit: number): Promise<RecentActivityEntry[]> {
  const adminKey = (import.meta.env.VITE_ADMIN_API_KEY ?? "").trim();
  const MAX_API_LIMIT = 200;
  const recentLimit = Math.min(Math.max(limit * 4, limit), MAX_API_LIMIT);

  try {
    const [changeLogs, recentResponse, deletedRows] = await Promise.all([
      getPlanetChangeLogs({ limit: recentLimit }, adminKey || undefined),
      listPlanets({
        limit: recentLimit,
        offset: 0,
        sort_by: "created_at",
        sort_order: "desc",
      }),
      adminKey
        ? listDeletedPlanets({ limit: recentLimit, offset: 0, apiKey: adminKey })
        : Promise.resolve<DeletedPlanetOut[]>([]),
    ]);

    const planetLookup = new Map<number, Partial<Planet>>();
    (recentResponse.items ?? []).forEach((planet) => {
      planetLookup.set(planet.id, planet);
    });
    deletedRows.forEach((row) => {
      planetLookup.set(row.id, {
        id: row.id,
        name: row.name,
        disc_method: row.disc_method,
        disc_year: row.disc_year,
        deleted_at: row.deleted_at,
      });
    });

    const entries = changeLogs
      .map((log) => convertChangeLogToActivity(log, planetLookup))
      .filter((entry): entry is RecentActivityEntry => entry !== null)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, limit);

    if (entries.length > 0) {
      return entries;
    }
  } catch (error) {
    console.warn("Failed to load change logs; falling back to derived activity", error);
  }

  // Fallback: derive activity from catalogue + deleted entries only
  const [recentResponse, deletedRows] = await Promise.all([
    listPlanets({
      limit: recentLimit,
      offset: 0,
      sort_by: "created_at",
      sort_order: "desc",
    }),
    adminKey
      ? listDeletedPlanets({ limit: recentLimit, offset: 0, apiKey: adminKey })
      : Promise.resolve<DeletedPlanetOut[]>([]),
  ]);

  const recentItems = recentResponse.items ?? [];

  const createdEntries: RecentActivityEntry[] = recentItems
    .filter((planet) => planet.created_at)
    .map((planet) => ({
      id: planet.id,
      name: planet.name,
      type: "created" as const,
      at: planet.created_at!,
      method: planet.disc_method,
      disc_year: planet.disc_year,
      orbperd: planet.orbperd,
      rade: planet.rade,
      masse: planet.masse,
      st_teff: planet.st_teff,
      st_rad: planet.st_rad,
      st_mass: planet.st_mass,
    }));

  const deletedEntries: RecentActivityEntry[] = deletedRows
    .filter((row) => row.deleted_at)
    .map((row) => ({
      id: row.id,
      name: row.name,
      type: "deleted" as const,
      at: row.deleted_at!,
      method: row.disc_method,
      disc_year: row.disc_year,
    }));

  const updatedEntries: RecentActivityEntry[] = recentItems
    .filter((planet) => planet.updated_at && planet.updated_at !== planet.created_at)
    .map((planet) => ({
      id: planet.id,
      name: planet.name,
      type: "updated" as const,
      at: planet.updated_at!,
      method: planet.disc_method,
      disc_year: planet.disc_year,
      orbperd: planet.orbperd,
      rade: planet.rade,
      masse: planet.masse,
      st_teff: planet.st_teff,
      st_rad: planet.st_rad,
      st_mass: planet.st_mass,
    }));

  const combined = [...createdEntries, ...deletedEntries, ...updatedEntries]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);

  return combined;
}

function convertChangeLogToActivity(
  log: PlanetChangeLogEntry,
  planetLookup: Map<number, Partial<Planet>>,
): RecentActivityEntry | null {
  const type: RecentActivityType = log.action === "update"
    ? "updated"
    : log.action === "delete"
    ? "deleted"
    : "created";

  const info = planetLookup.get(log.planet_id) ?? {};
  const changeSet = log.changes ?? [];
  const nameChange = findChange(changeSet, "name");
  const methodChange = findChange(changeSet, "disc_method");

  const name = (nameChange?.after
    ?? nameChange?.before
    ?? info.name
    ?? log.planet_name
    ?? `Planet #${log.planet_id}`) as string;
  const method = (methodChange?.after ?? methodChange?.before ?? info.disc_method ?? null) as string | null;

  const snapshotValue = (field: keyof Planet): unknown => {
    const change = findChange(changeSet, field as string);
    if (change) {
      if (type === "deleted") {
        return change.before ?? (info as Record<string, unknown>)[field];
      }
      return change.after ?? change.before ?? (info as Record<string, unknown>)[field];
    }
    return (info as Record<string, unknown>)[field];
  };

  return {
    id: log.planet_id,
    name,
    type,
    at: log.created_at,
    method,
    changes: changeSet,
    disc_year: snapshotValue("disc_year") as number | null | undefined,
    orbperd: snapshotValue("orbperd") as number | null | undefined,
    rade: snapshotValue("rade") as number | null | undefined,
    masse: snapshotValue("masse") as number | null | undefined,
    st_teff: snapshotValue("st_teff") as number | null | undefined,
    st_rad: snapshotValue("st_rad") as number | null | undefined,
    st_mass: snapshotValue("st_mass") as number | null | undefined,
  };
}

function findChange(changes: PlanetChangeEntry[], field: string): PlanetChangeEntry | undefined {
  return changes.find((change) => change.field === field);
}
