import { useEffect, useMemo, useState } from "react";
import type { ReactNode, FormEvent, ChangeEvent, MouseEvent } from "react";
import {
  usePlanetList,
  useDiscoveryMethods,
  useSoftDeletePlanet,
  usePlanetCount,
  usePatchPlanet,
} from "../hooks/usePlanets";
import type { Planet, PlanetUpdate } from "../api/types";
import { PLANET_FIELD_LABELS, extractPlanetApiErrors } from "../utils/planetFields";

const sortOptions = [
  { value: "id", label: "ID" },
  { value: "name", label: "Name" },
  { value: "disc_year", label: "Discovery Year" },
  { value: "disc_method", label: "Discovery Method" },
  { value: "orbperd", label: "Orbital Period" },
  { value: "rade", label: "Radius" },
  { value: "masse", label: "Mass" },
  { value: "st_teff", label: "Star Teff" },
  { value: "st_rad", label: "Star Radius" },
  { value: "st_mass", label: "Star Mass" },
  { value: "created_at", label: "Created" },
] as const;

type SortOptionValue = (typeof sortOptions)[number]["value"];

const sortLabelMap = new Map(sortOptions.map((option) => [option.value, option.label]));

function getSortLabel(value: (typeof sortOptions)[number]["value"]) {
  return sortLabelMap.get(value) ?? value;
}

type FiltersState = {
  name: string;
  method: string;
  minYear: string;
  maxYear: string;
  minPeriod: string;
  maxPeriod: string;
  limit: number;
  sortBy: SortOptionValue;
  sortOrder: "asc" | "desc";
};

const tableColumns: Array<{
  key: SortOptionValue;
  label: string;
}> = [
  { key: "id", label: "ID" },
  { key: "name", label: "Name" },
  { key: "disc_method", label: "Method" },
  { key: "disc_year", label: "Year" },
  { key: "orbperd", label: "Period (d)" },
  { key: "rade", label: "Radius (R⊕)" },
  { key: "masse", label: "Mass (M⊕)" },
  { key: "st_teff", label: "Star Teff" },
  { key: "st_rad", label: "Star Radius" },
  { key: "st_mass", label: "Star Mass" },
];

const numericColumns = new Set<SortOptionValue>([
  "id",
  "disc_year",
  "orbperd",
  "rade",
  "masse",
  "st_teff",
  "st_rad",
  "st_mass",
]);

const ADMIN_API_KEY_STORAGE_KEY = "exo-admin-api-key";

const defaultFilters: FiltersState = {
  name: "",
  method: "",
  minYear: "",
  maxYear: "",
  minPeriod: "",
  maxPeriod: "",
  limit: 25,
  sortBy: sortOptions[0].value,
  sortOrder: "desc" as "asc" | "desc",
};

const defaultFiltersJSON = JSON.stringify(defaultFilters);

const editorDefaults = {
  name: "",
  disc_method: "",
  disc_year: "",
  orbperd: "",
  rade: "",
  masse: "",
  st_teff: "",
  st_rad: "",
  st_mass: "",
} as const;

type PlanetEditorKey = keyof typeof editorDefaults;
type PlanetNumericKey = Exclude<PlanetEditorKey, "name" | "disc_method">;

const numericEditorMeta: Array<{
  key: PlanetNumericKey;
  label: string;
  integer?: boolean;
  step?: number | "any";
}> = [
  { key: "disc_year", label: "Discovery Year", integer: true, step: 1 },
  { key: "orbperd", label: "Orbital Period", step: "any" },
  { key: "rade", label: "Radius", step: "any" },
  { key: "masse", label: "Mass", step: "any" },
  { key: "st_teff", label: "Star Effective Temperature", step: "any" },
  { key: "st_rad", label: "Star Radius", step: "any" },
  { key: "st_mass", label: "Star Mass", step: "any" },
];

export default function PlanetsPage() {
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(ADMIN_API_KEY_STORAGE_KEY);
      if (stored) {
        return stored;
      }
    }
    return import.meta.env.VITE_ADMIN_API_KEY ?? "";
  });
  const [editingPlanet, setEditingPlanet] = useState<Planet | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const closeEditor = () => setEditingPlanet(null);

  const trimmedApiKey = apiKey.trim();

  const filtersPristine = useMemo(
    () => JSON.stringify(filters) === defaultFiltersJSON,
    [filters]
  );

  const countQuery = usePlanetCount();
  const { data: methodList } = useDiscoveryMethods();

  const params = useMemo(() => ({
    name: filters.name || undefined,
    disc_method: filters.method || undefined,
    min_year: valueOrUndefined(filters.minYear),
    max_year: valueOrUndefined(filters.maxYear),
    min_orbperd: valueOrUndefined(filters.minPeriod),
    max_orbperd: valueOrUndefined(filters.maxPeriod),
    limit: filters.limit,
    offset: 0,
    sort_by: filters.sortBy,
    sort_order: filters.sortOrder,
  }), [filters]);

  const listQuery = usePlanetList(params);
  const items: Planet[] = listQuery.data?.items ?? [];

  useEffect(() => {
    if (typeof window === "undefined") return;

    const fromStorage = window.localStorage.getItem(ADMIN_API_KEY_STORAGE_KEY);
    if (fromStorage && fromStorage !== apiKey) {
      setApiKey(fromStorage);
    }

    const handleCustom = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail ?? "";
      setApiKey(detail);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === ADMIN_API_KEY_STORAGE_KEY) {
        setApiKey(event.newValue ?? "");
      }
    };

    window.addEventListener("exo-admin-api-key", handleCustom as EventListener);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("exo-admin-api-key", handleCustom as EventListener);
      window.removeEventListener("storage", handleStorage);
    };
  }, [apiKey]);

  useEffect(() => {
    setActionError(null);
  }, [apiKey]);

  const onFilterChange = (key: keyof typeof defaultFilters) =>
    (value: string | number) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
      }));
    };

  const onResetFilters = () => {
    setFilters(() => ({ ...defaultFilters }));
  };

  const handleSortColumn = (column: SortOptionValue) => {
    if (!sortLabelMap.has(column)) return;
    setFilters((prev) => {
      if (prev.sortBy === column) {
        return {
          ...prev,
          sortOrder: prev.sortOrder === "asc" ? "desc" : "asc",
        };
      }
      return {
        ...prev,
        sortBy: column,
        sortOrder: column === "name" ? "asc" : "desc",
      };
    });
  };

  return (
    <>
      <section style={pageWrap}>
      <header style={pageIntro}>
        <div>
          <h1 style={pageTitle}>Planets Catalogue</h1>
          <p style={pageSubtitle}>
            Browse, filter, and curate exoplanet records. Keep the dataset clean by creating new entries,
            retiring stale ones, and monitoring discovery metadata.
          </p>
        </div>
        <span style={metaPill}>
          Total planets: {countQuery.isLoading ? "…" : formatNumber(countQuery.data?.count ?? 0)}
        </span>
      </header>

      <div className="page-grid page-grid--with-aside">
        <div style={catalogueColumn}>
          <div className="card interactive-card" style={{ ...surfaceCard, padding: 24 }}>
            <CardHeader
              title="Planet Catalogue"
              subtitle={
                listQuery.isFetching
                  ? "Fetching latest data…"
                  : `Showing ${items.length} of ${listQuery.data?.total ?? 0}`
              }
            />

            <div style={catalogueHighlight}>
              {listQuery.isLoading || listQuery.isError ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} style={catalogueSkeleton} />
                ))
              ) : (
                <>
                  <div style={catalogueMetric}>
                    <span>Matching records</span>
                    <strong>{formatNumber(listQuery.data?.total ?? 0)}</strong>
                  </div>
                  <div style={catalogueMetric}>
                    <span>Visible rows</span>
                    <strong>{formatNumber(items.length)}</strong>
                  </div>
                  <div style={catalogueMetric}>
                    <span>Sort</span>
                    <strong>{`${getSortLabel(filters.sortBy)} · ${filters.sortOrder === "asc" ? "Asc" : "Desc"}`}</strong>
                  </div>
                </>
              )}
            </div>

            {!listQuery.isLoading && actionError && (
              <div style={catalogueAlert}>{actionError}</div>
            )}

            {listQuery.isLoading && <TableSkeleton rows={6} />}
            {listQuery.isError && <ErrorNote error={listQuery.error as Error} />}
            {!listQuery.isLoading && !listQuery.isError && items.length === 0 && (
              <EmptyNote text="No planets match your current filters." />
            )}

            {!listQuery.isLoading && !listQuery.isError && items.length > 0 && (
              <div style={{ overflowX: "auto", marginTop: 12 }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      {tableColumns.map((column) => {
                        const isActive = filters.sortBy === column.key;
                        const direction = isActive ? filters.sortOrder : undefined;
                        const ariaSort = isActive
                          ? filters.sortOrder === "asc"
                            ? "ascending"
                            : "descending"
                          : "none";
                        return (
                          <th
                            key={column.key}
                            style={{
                              textAlign: "center",
                              whiteSpace: "nowrap",
                              padding: "10px 8px",
                            }}
                            aria-sort={ariaSort}
                          >
                            <button
                              type="button"
                              onClick={() => handleSortColumn(column.key)}
                              style={sortableHeaderButton(isActive)}
                              aria-label={`Sort by ${getSortLabel(column.key)}${
                                isActive ? ` (${direction === "asc" ? "ascending" : "descending"})` : ""
                              }`}
                            >
                              <span>{column.label}</span>
                              <span style={sortIconStyle}>{getSortIcon(direction)}</span>
                            </button>
                          </th>
                        );
                      })}
                      <th style={{ width: 120, textAlign: "center", padding: "10px 8px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((planet) => (
          <Row
            key={planet.id}
            planet={planet}
            apiKey={trimmedApiKey}
            onEdit={setEditingPlanet}
            onActionError={setActionError}
          />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <aside style={filtersColumn}>
          <div id="filters" className="card interactive-card" style={{ ...surfaceCard, padding: 24 }}>
            <CardHeader
              title="Filters"
              subtitle="Combine name, method, year, and period constraints to narrow the catalogue."
              trailing={
                <button onClick={onResetFilters} style={ghostButtonSmall} disabled={filtersPristine}>
                  Reset
                </button>
              }
            />

            <div style={filterGrid}>
              <Field label="Name" variant="filter">
                <input
                  placeholder="Search by name"
                  value={filters.name}
                  onChange={(e) => onFilterChange("name")(e.target.value)}
                  style={inputControl}
                />
              </Field>
              <Field label="Method" variant="filter">
                <select
                  value={filters.method}
                  onChange={(e) => onFilterChange("method")(e.target.value)}
                  style={inputControl}
                >
                  <option value="">Any</option>
                  {(methodList ?? []).map((method) => (
                    <option key={method ?? "unknown"} value={method ?? ""}>
                      {method ?? "Unknown"}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Year Range" variant="filter">
                <div style={rangeRow}>
                  <input
                    placeholder="Min"
                    value={filters.minYear}
                    onChange={(e) => onFilterChange("minYear")(e.target.value)}
                    style={{ ...inputControl, flex: 1 }}
                  />
                  <span style={rangeSep}>–</span>
                  <input
                    placeholder="Max"
                    value={filters.maxYear}
                    onChange={(e) => onFilterChange("maxYear")(e.target.value)}
                    style={{ ...inputControl, flex: 1 }}
                  />
                </div>
              </Field>
              <Field label="Period (days)" variant="filter">
                <div style={rangeRow}>
                  <input
                    placeholder="Min"
                    value={filters.minPeriod}
                    onChange={(e) => onFilterChange("minPeriod")(e.target.value)}
                    style={{ ...inputControl, flex: 1 }}
                  />
                  <span style={rangeSep}>–</span>
                  <input
                    placeholder="Max"
                    value={filters.maxPeriod}
                    onChange={(e) => onFilterChange("maxPeriod")(e.target.value)}
                    style={{ ...inputControl, flex: 1 }}
                  />
                </div>
              </Field>
              <Field label="Limit" variant="filter">
                <select
                  value={filters.limit}
                  onChange={(e) => onFilterChange("limit")(Number(e.target.value))}
                  style={inputControl}
                >
                  {[25, 50, 100].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sort By" variant="filter">
                <select
                  value={filters.sortBy}
                  onChange={(e) => onFilterChange("sortBy")(e.target.value)}
                  style={inputControl}
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sort Order" variant="filter">
                <select
                  value={filters.sortOrder}
                  onChange={(e) => onFilterChange("sortOrder")(e.target.value)}
                  style={inputControl}
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </Field>
            </div>
          </div>
        </aside>
      </div>
      </section>
      {editingPlanet && (
        <PlanetEditor planet={editingPlanet} onDismiss={closeEditor} apiKey={trimmedApiKey} />
      )}
    </>
  );
}

function Row({
  planet,
  apiKey,
  onEdit,
  onActionError,
}: {
  planet: Planet;
  apiKey: string;
  onEdit: (planet: Planet) => void;
  onActionError: (message: string | null) => void;
}) {
  const softDelete = useSoftDeletePlanet(planet.id, apiKey);

  return (
    <tr>
      {tableColumns.map((column) => (
        <td
          key={column.key}
          style={{
            padding: "10px 8px",
            textAlign: "center",
            fontVariantNumeric: numericColumns.has(column.key) ? "tabular-nums" : undefined,
          }}
        >
          {renderPlanetCell(planet, column.key)}
        </td>
      ))}
      <td style={{ padding: "10px 8px", textAlign: "center" }}>
        <div style={rowActions}>
          <button
            type="button"
            onClick={() => onEdit(planet)}
            style={ghostButtonSmall}
            title="Edit planet"
          >
            Edit
          </button>
          <button
            onClick={() =>
              softDelete.mutate(undefined, {
                onSuccess: () => {
                  onActionError(null);
                },
                onError: (error) => {
                  onActionError(describeAdminError(error, "Delete failed."));
                },
              })
            }
            disabled={!apiKey || softDelete.isPending}
            style={dangerButton(!apiKey || softDelete.isPending)}
            title={apiKey ? "Soft delete this planet" : "Provide x-api-key to enable soft delete"}
          >
            {softDelete.isPending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </td>
    </tr>
  );
}

function PlanetEditor({ planet, onDismiss, apiKey }: { planet: Planet; onDismiss: () => void; apiKey: string }) {
  const patch = usePatchPlanet(planet.id, apiKey);
  const { mutate, reset, isPending, isSuccess, error } = patch;
  const [values, setValues] = useState<Record<PlanetEditorKey, string>>(() => toEditorForm(planet));
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const apiErrors = useMemo(() => extractPlanetApiErrors(error), [error]);

  useEffect(() => {
    setValues(toEditorForm(planet));
    setFormError(null);
    setSuccessMessage(null);
    reset();
  }, [planet, reset]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        onDismiss();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onDismiss, isPending]);

  useEffect(() => {
    if (isSuccess && successMessage) {
      const timeout = window.setTimeout(() => {
        onDismiss();
      }, 1200);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [isSuccess, successMessage, onDismiss]);

  const handleChange = (key: PlanetEditorKey) => (event: ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [key]: event.target.value }));
    setFormError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    try {
      const updates: PlanetUpdate = {};

      const trimmedName = values.name.trim();
      if (!trimmedName) {
        throw new Error("Name is required.");
      }
      if (trimmedName !== (planet.name ?? "")) {
        updates.name = trimmedName;
      }

      const trimmedMethod = values.disc_method.trim();
      if (!trimmedMethod) {
        throw new Error("Discovery Method is required.");
      }
      if (trimmedMethod !== (planet.disc_method ?? "")) {
        updates.disc_method = trimmedMethod;
      }

      for (const meta of numericEditorMeta) {
        const raw = values[meta.key].trim();
        const current = planet[meta.key] as number | null | undefined;
        if (!raw) {
          if (current !== null && current !== undefined) {
            throw new Error(`${meta.label} is required.`);
          }
          continue;
        }
        const numeric = meta.integer ? Number.parseInt(raw, 10) : Number(raw);
        if (Number.isNaN(numeric)) {
          throw new Error(`${meta.label} must be a valid ${meta.integer ? "integer" : "number"}.`);
        }
        if (current === null || current === undefined || Number(current) !== numeric) {
          updates[meta.key] = numeric;
        }
      }

      if (Object.keys(updates).length === 0) {
        setFormError("No changes detected.");
        return;
      }

      mutate(updates, {
        onSuccess: () => {
          setSuccessMessage("Planet updated.");
        },
        onError: (error) => {
          setFormError(error instanceof Error ? error.message : String(error));
        },
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !isPending) {
      onDismiss();
    }
  };

  const isSaveDisabled = isPending;

  return (
    <div style={editorOverlay} onClick={handleOverlayClick} role="presentation">
      <div
        style={editorPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`planet-editor-${planet.id}`}
      >
        <header style={editorHeader}>
          <div>
            <h2 style={editorTitle} id={`planet-editor-${planet.id}`}>
              Edit planet
            </h2>
            <p style={editorSubtitle}>#{planet.id} · {planet.name}</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            style={editorCloseButton}
            title="Close editor"
            aria-label="Close editor"
            disabled={isPending}
          >
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit} style={editorForm}>
          <div style={editorGrid}>
            <Field label={PLANET_FIELD_LABELS.name} required>
              <input
                value={values.name}
                onChange={handleChange("name")}
                style={inputControl}
              />
            </Field>
            <Field label={PLANET_FIELD_LABELS.disc_method} required>
              <input
                value={values.disc_method}
                onChange={handleChange("disc_method")}
                style={inputControl}
              />
            </Field>
            {numericEditorMeta.map((meta) => (
              <Field key={meta.key} label={PLANET_FIELD_LABELS[meta.key]} required>
                <input
                  type="number"
                  value={values[meta.key]}
                  onChange={handleChange(meta.key)}
                  style={inputControl}
                  step={meta.step ?? "any"}
                />
              </Field>
            ))}
          </div>

          {(formError || (apiErrors && apiErrors.length > 0)) && (
            <div style={errorNote} role="alert">
              {formError && <div>{formError}</div>}
              {apiErrors && apiErrors.length > 0 && (
                <ul style={errorList}>
                  {apiErrors.map((entry, idx) => (
                    <li key={idx}>{entry}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {isSuccess && successMessage && (
            <div style={successNote} role="status">
              {successMessage}
            </div>
          )}

          <div style={editorFooter}>
            <button
              type="button"
              onClick={onDismiss}
              style={ghostButtonSmall}
              disabled={isPending}
            >
              Cancel
            </button>
            <button type="submit" style={primaryButton(isSaveDisabled)} disabled={isSaveDisabled}>
              {isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  required,
  layout = "stacked",
  variant = "default",
}: {
  label: ReactNode;
  children: ReactNode;
  required?: boolean;
  layout?: "stacked" | "inline";
  variant?: "default" | "filter";
}) {
  const isInline = layout === "inline";
  const wrapperStyle = isInline ? inlineFieldStyle : variant === "filter" ? filterFieldStyle : fieldStyle;
  const labelStyleChoice = isInline ? inlineFieldLabel : variant === "filter" ? filterFieldLabel : fieldLabel;
  return (
    <label style={wrapperStyle}>
      <span style={labelStyleChoice}>
        {label}
        {required && <span style={{ color: "var(--color-danger)", marginLeft: 4 }}>*</span>}
      </span>
      {children}
    </label>
  );
}


function ErrorNote({ error }: { error: unknown }) {
  const message = typeof error === "string" ? error : (error as Error)?.message ?? String(error);
  return (
    <div style={errorNote} role="alert">
      {message}
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div style={emptyNote}>{text}</div>
  );
}

function CardHeader({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  return (
    <div style={cardHeader}>
      <div>
        <h3 style={{ margin: "0 0 2px" }}>{title}</h3>
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

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ paddingTop: 8 }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {tableColumns.map((column) => (
              <th key={column.key} style={{ textAlign: "center" }}>
                <div style={skeletonBar(80)} />
              </th>
            ))}
            <th style={{ width: 120, textAlign: "center" }}>
              <div style={skeletonBar(100)} />
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {Array.from({ length: tableColumns.length + 1 }).map((__, cellIdx) => (
                <td key={cellIdx} style={{ textAlign: "center" }}>
                  <div style={skeletonBar(70)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

function fmtNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(2);
}

function renderPlanetCell(planet: Planet, key: SortOptionValue) {
  switch (key) {
    case "id":
      return formatNumber(planet.id);
    case "name":
      return planet.name ?? "—";
    case "disc_method":
      return planet.disc_method ?? "—";
    case "disc_year":
      return planet.disc_year ?? "—";
    case "orbperd":
      return fmtNumber(planet.orbperd);
    case "rade":
      return fmtNumber(planet.rade);
    case "masse":
      return fmtNumber(planet.masse);
    case "st_teff":
      return fmtNumber(planet.st_teff);
    case "st_rad":
      return fmtNumber(planet.st_rad);
    case "st_mass":
      return fmtNumber(planet.st_mass);
    default:
      return "—";
  }
}

function toEditorForm(planet: Planet): Record<PlanetEditorKey, string> {
  return {
    name: planet.name ?? "",
    disc_method: planet.disc_method ?? "",
    disc_year: numberToString(planet.disc_year),
    orbperd: numberToString(planet.orbperd),
    rade: numberToString(planet.rade),
    masse: numberToString(planet.masse),
    st_teff: numberToString(planet.st_teff),
    st_rad: numberToString(planet.st_rad),
    st_mass: numberToString(planet.st_mass),
  };
}

function numberToString(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function describeAdminError(error: unknown, fallback?: string): string {
  const friendly = friendlyAdminError(error);
  if (friendly) return friendly;
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return fallback ?? "Unexpected error.";
}

function friendlyAdminError(error: unknown): string | null {
  const message = typeof error === "string" ? error : error instanceof Error ? error.message : null;
  if (!message) return null;

  if (/HTTP\s+401/i.test(message) && /invalid api key/i.test(message)) {
    return "Admin API key rejected.";
  }

  if (/HTTP\s+403/i.test(message)) {
    return "Admin API key is missing required permissions.";
  }

  return null;
}

function getSortIcon(direction: "asc" | "desc" | undefined) {
  if (direction === "asc") return "▲";
  if (direction === "desc") return "▼";
  return "↕";
}

function valueOrUndefined(value: string) {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function skeletonBar(width: number): React.CSSProperties {
  return {
    width,
    height: 14,
    background: "var(--skeleton-bar-bg)",
    borderRadius: 8,
  };
}

const pageWrap: React.CSSProperties = {
  display: "grid",
  gap: 24,
  maxWidth: 1680,
  margin: "0 auto",
  width: "100%",
};

const pageIntro: React.CSSProperties = {
  background: "var(--surface-card-bg)",
  borderRadius: 28,
  border: "1px solid var(--surface-card-border)",
  boxShadow: "var(--surface-card-shadow)",
  padding: "28px clamp(18px, 5vw, 40px)",
  display: "flex",
  flexWrap: "wrap",
  gap: 18,
  alignItems: "flex-end",
  justifyContent: "space-between",
};

const pageTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 32,
  fontWeight: 700,
  letterSpacing: -0.4,
  color: "var(--color-heading)",
};

const pageSubtitle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "var(--color-text-secondary)",
  maxWidth: 640,
  fontSize: 15,
  lineHeight: "22px",
};

const metaPill: React.CSSProperties = {
  alignSelf: "center",
  background: "var(--accent-primary)",
  color: "var(--accent-on-primary)",
  borderRadius: 999,
  padding: "6px 16px",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0.4,
  textTransform: "uppercase",
  boxShadow: "0 12px 30px -20px rgba(29, 78, 216, 0.6)",
};

const catalogueColumn: React.CSSProperties = {
  display: "grid",
  gap: 24,
  minWidth: 0,
};

const filtersColumn: React.CSSProperties = {
  display: "grid",
  gap: 24,
  minWidth: 0,
};

const surfaceCard: React.CSSProperties = {
  background: "var(--surface-card-bg)",
  borderRadius: 24,
  border: "1px solid var(--surface-card-border)",
  boxShadow: "var(--surface-card-shadow)",
};

const catalogueHighlight: React.CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  margin: "12px 0 4px",
  padding: "16px",
  borderRadius: 18,
  background: "var(--surface-highlight-gradient)",
  border: "1px solid var(--surface-highlight-border)",
};

const catalogueMetric: React.CSSProperties = {
  display: "grid",
  gap: 4,
  fontSize: 12,
  color: "var(--surface-highlight-text)",
};

const catalogueAlert: React.CSSProperties = {
  marginTop: 12,
  padding: "10px 14px",
  borderRadius: 12,
  background: "var(--note-error-bg)",
  border: "1px solid var(--note-error-border)",
  color: "var(--note-error-text)",
  fontSize: 12,
  textAlign: "center",
  fontWeight: 600,
};

const catalogueSkeleton: React.CSSProperties = {
  height: 44,
  borderRadius: 12,
  background: "var(--surface-skeleton-bg)",
};

const filterGrid: React.CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  alignItems: "start",
};

const rangeRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
};

const rangeSep: React.CSSProperties = {
  color: "var(--color-text-muted)",
  fontSize: 12,
};

const fieldStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 13,
};

const fieldLabel: React.CSSProperties = {
  color: "var(--color-text-muted)",
  fontWeight: 500,
  letterSpacing: 0.2,
};

const inlineFieldStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  gap: 12,
  alignItems: "center",
  fontSize: 13,
};

const inlineFieldLabel: React.CSSProperties = {
  color: "var(--color-text-muted)",
  fontWeight: 500,
  whiteSpace: "nowrap",
};

const filterFieldStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  fontSize: 12,
  width: "100%",
};

const filterFieldLabel: React.CSSProperties = {
  color: "var(--color-text-secondary)",
  fontWeight: 600,
  letterSpacing: 0.4,
  textTransform: "uppercase",
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
};

const dangerButton = (disabled: boolean): React.CSSProperties => ({
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid var(--note-error-border-strong)",
  background: disabled ? "var(--note-error-bg)" : "var(--note-error-strong-bg)",
  color: "var(--note-error-text)",
  fontSize: 12,
  fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
});

const rowActions: React.CSSProperties = {
  display: "flex",
  gap: 8,
  justifyContent: "center",
  alignItems: "center",
};

const editorOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.55)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 24,
  zIndex: 2000,
};

const editorPanel: React.CSSProperties = {
  width: "min(720px, 100%)",
  background: "var(--surface-card-bg)",
  borderRadius: 24,
  border: "1px solid var(--surface-card-border)",
  boxShadow: "var(--surface-card-shadow)",
  padding: 28,
  display: "grid",
  gap: 20,
  maxHeight: "90vh",
  overflowY: "auto",
};

const editorHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
};

const editorTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 24,
  fontWeight: 700,
  letterSpacing: -0.2,
};

const editorSubtitle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "var(--color-text-muted)",
  fontSize: 13,
};

const editorCloseButton: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "var(--color-text-muted)",
  fontSize: 22,
  cursor: "pointer",
  lineHeight: 1,
  padding: "4px 6px",
  borderRadius: 999,
};

const editorForm: React.CSSProperties = {
  display: "grid",
  gap: 18,
};

const editorGrid: React.CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};

const editorFooter: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
};

const primaryButton = (disabled: boolean): React.CSSProperties => ({
  padding: "10px 18px",
  borderRadius: 12,
  border: "none",
  background: disabled
    ? "rgba(37, 99, 235, 0.35)"
    : "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "#ffffff",
  fontWeight: 600,
  fontSize: 13,
  cursor: disabled ? "not-allowed" : "pointer",
  boxShadow: disabled ? "none" : "0 12px 22px -16px rgba(37, 99, 235, 0.55)",
});

const successNote: React.CSSProperties = {
  border: "1px solid var(--note-success-border)",
  background: "var(--note-success-bg)",
  color: "var(--note-success-text)",
  padding: 12,
  borderRadius: 12,
  fontSize: 13,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const sortableHeaderButton = (active: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "transparent",
  border: "none",
  padding: 0,
  margin: 0,
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "inherit",
  color: active ? "var(--accent-primary-strong)" : "var(--color-heading)",
  cursor: "pointer",
});

const sortIconStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--color-text-muted)",
};

const cardHeader: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  alignItems: "start",
  gap: 12,
};

const errorNote: React.CSSProperties = {
  border: "1px solid var(--note-error-border)",
  background: "var(--note-error-bg)",
  color: "var(--note-error-text)",
  padding: 12,
  borderRadius: 12,
  fontSize: 13,
};

const errorList: React.CSSProperties = {
  margin: "8px 0 0",
  paddingLeft: 18,
  display: "grid",
  gap: 4,
  fontSize: 12,
};

const emptyNote: React.CSSProperties = {
  padding: 16,
  borderRadius: 12,
  textAlign: "center",
  color: "var(--note-empty-text)",
  background: "var(--note-empty-bg)",
};

// management summary styles removed

const inputControl: React.CSSProperties = {
  width: "100%",
  borderRadius: 10,
  border: "1px solid var(--input-border)",
  padding: "10px 12px",
  fontSize: 13,
  lineHeight: "20px",
  background: "var(--input-bg)",
  color: "var(--input-text)",
  boxShadow: "var(--input-shadow)",
};
