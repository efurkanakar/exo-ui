import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode, FormEvent, ChangeEvent } from "react";
import {
  useAdminDeleted,
  useRestorePlanet,
  useRestorePlanetById,
  useHardDeletePlanetMutation,
  useWipePlanetsMutation,
  useCreatePlanet,
} from "../hooks/usePlanets";
import type { DeletedPlanetOut } from "../api/types";
import { PLANET_FIELD_LABELS, extractPlanetApiErrors } from "../utils/planetFields";

const LIMIT_OPTIONS = [25, 50, 100];

const ADMIN_API_KEY_STORAGE_KEY = "exo-admin-api-key";

const defaultCreateForm = {
  name: "",
  disc_method: "",
  disc_year: "",
  orbperd: "",
  rade: "",
  masse: "",
  st_teff: "",
  st_rad: "",
  st_mass: "",
};

export default function AdminDeletedPage() {
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(ADMIN_API_KEY_STORAGE_KEY);
      if (stored) {
        return stored;
      }
    }
    return import.meta.env.VITE_ADMIN_API_KEY ?? "";
  });
  const [limit, setLimit] = useState<number>(25);
  const [offset, setOffset] = useState<number>(0);

  const trimmedApiKey = apiKey.trim();

  const params = useMemo(() => ({ limit, offset, apiKey: trimmedApiKey }), [limit, offset, trimmedApiKey]);
  const deletedQuery = useAdminDeleted(params);
  const rows: DeletedPlanetOut[] = deletedQuery.data ?? [];

  const restoreById = useRestorePlanetById(trimmedApiKey);
  const hardDelete = useHardDeletePlanetMutation(trimmedApiKey);
  const wipeAll = useWipePlanetsMutation(trimmedApiKey);
  const { reset: resetRestoreById } = restoreById;
  const { reset: resetHardDelete } = hardDelete;
  const { reset: resetWipeAll } = wipeAll;

  const [restoreId, setRestoreId] = useState("");
  const [hardDeleteId, setHardDeleteId] = useState("");
  const [confirmHardDelete, setConfirmHardDelete] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [hardDeleteError, setHardDeleteError] = useState<string | null>(null);
  const [wipeError, setWipeError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [createFormError, setCreateFormError] = useState<string | null>(null);

  const create = useCreatePlanet();
  const createErrorDetails = useMemo(() => extractPlanetApiErrors(create.error), [create.error]);
  const createFormComplete = useMemo(
    () => Object.values(createForm).every((value) => value.trim().length > 0),
    [createForm]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextKey = apiKey.trim();
    if (nextKey) {
      window.localStorage.setItem(ADMIN_API_KEY_STORAGE_KEY, nextKey);
    } else {
      window.localStorage.removeItem(ADMIN_API_KEY_STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent<string>("exo-admin-api-key", { detail: nextKey }));
  }, [apiKey]);

  useEffect(() => {
    resetRestoreById();
    resetHardDelete();
    resetWipeAll();
    setRestoreError(null);
    setHardDeleteError(null);
    setWipeError(null);
  }, [apiKey, resetRestoreById, resetHardDelete, resetWipeAll]);

  useEffect(() => {
    if (create.isSuccess) {
      setCreateForm(defaultCreateForm);
      setCreateFormError(null);
    }
  }, [create.isSuccess]);

  const disableActions = !trimmedApiKey;

  const parsePlanetId = (value: string, action: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new Error(`${action}: Provide a planet id.`);
    }
    const numeric = Number(trimmed);
    if (!Number.isInteger(numeric) || numeric <= 0) {
      throw new Error(`${action}: Planet id must be a positive integer.`);
    }
    return numeric;
  };

  const handleCreateChange = (key: keyof typeof defaultCreateForm) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setCreateForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const parseNumber = (value: string, { integer, label }: { integer?: boolean; label: string }) => {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new Error(`${label} is required.`);
    }
    const numeric = integer ? Number.parseInt(trimmed, 10) : Number(trimmed);
    if (Number.isNaN(numeric)) {
      throw new Error(`${label} must be a valid ${integer ? "integer" : "number"}.`);
    }
    return numeric;
  };

  const handleCreateSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedName = createForm.name.trim();

    try {
      if (!trimmedName) {
        throw new Error("Name is required.");
      }
      const trimmedMethod = createForm.disc_method.trim();
      if (!trimmedMethod) {
        throw new Error("Discovery Method is required.");
      }

      const payload = {
        name: trimmedName,
        disc_method: trimmedMethod,
        disc_year: parseNumber(createForm.disc_year, { integer: true, label: "Discovery Year" }),
        orbperd: parseNumber(createForm.orbperd, { label: "Orbital Period" }),
        rade: parseNumber(createForm.rade, { label: "Radius" }),
        masse: parseNumber(createForm.masse, { label: "Mass" }),
        st_teff: parseNumber(createForm.st_teff, { label: "Star Effective Temperature" }),
        st_rad: parseNumber(createForm.st_rad, { label: "Star Radius" }),
        st_mass: parseNumber(createForm.st_mass, { label: "Star Mass" }),
      };

      setCreateFormError(null);
      create.mutate(payload);
    } catch (err) {
      setCreateFormError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleRestoreSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRestoreError(null);
    restoreById.reset();

    if (disableActions) {
      setRestoreError("Provide an admin API key to restore planets.");
      return;
    }

    try {
      const planetId = parsePlanetId(restoreId, "Restore");
      restoreById.mutate(planetId, {
        onSuccess: () => {
          setRestoreId("");
        },
        onError: (err) => {
          setRestoreError(describeAdminError(err));
        },
      });
    } catch (err) {
      setRestoreError(describeAdminError(err));
    }
  };

  const handleHardDeleteSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setHardDeleteError(null);
    hardDelete.reset();

    if (disableActions) {
      setHardDeleteError("Provide an admin API key to hard delete planets.");
      return;
    }

    if (!confirmHardDelete) {
      setHardDeleteError("Confirm the hard delete checkbox before proceeding.");
      return;
    }

    try {
      const planetId = parsePlanetId(hardDeleteId, "Hard delete");
      hardDelete.mutate(planetId, {
        onSuccess: () => {
          setHardDeleteId("");
          setConfirmHardDelete(false);
        },
        onError: (err) => {
          setHardDeleteError(describeAdminError(err));
        },
      });
    } catch (err) {
      setHardDeleteError(describeAdminError(err));
    }
  };

  const handleWipeSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setWipeError(null);
    wipeAll.reset();

    if (disableActions) {
      setWipeError("Provide an admin API key to run destructive operations.");
      return;
    }

    if (!confirmWipe) {
      setWipeError("Acknowledge the warning before truncating the table.");
      return;
    }

    wipeAll.mutate(undefined, {
      onSuccess: () => {
        setConfirmWipe(false);
      },
      onError: (err) => {
        setWipeError(describeAdminError(err));
      },
    });
  };

  const onPrev = () => setOffset(Math.max(0, offset - limit));
  const onNext = () => setOffset(offset + limit);

  const totalKnown = rows.length;

  return (
    <section style={pageWrap}>
      <header style={pageIntro}>
        <div>
          <h1 style={pageTitle}>Control Page</h1>
          <p style={pageSubtitle}>
            Manage the catalogue end to end: create new planets, inspect soft-deleted records, restore entries,
            escalate to hard deletes, or trigger a full wipe. All actions require a valid admin API key.
          </p>
        </div>
        <div style={metaRow}>
          <span style={metaPill}>
            API key {apiKey ? "loaded" : "missing"}
          </span>
          <span style={metaPill}>Listing {totalKnown} planets</span>
        </div>
      </header>

      <div className="card interactive-card" style={{ ...surfaceCard, padding: 24 }}>
        <CardHeader title="Create planet" />
        <form className="admin-create-grid" onSubmit={handleCreateSubmit}>
          <label style={fieldLabel}>
            <LabelText fieldKey="name" />
            <input
              value={createForm.name}
              onChange={handleCreateChange("name")}
              placeholder="Kepler-451 b"
              style={inputControl}
              required
            />
          </label>
          <label style={fieldLabel}>
            <LabelText fieldKey="disc_method" />
            <input
              value={createForm.disc_method}
              onChange={handleCreateChange("disc_method")}
              placeholder="Transit"
              style={inputControl}
              required
            />
          </label>
          <label style={fieldLabel}>
            <LabelText fieldKey="disc_year" />
            <input
              type="number"
              value={createForm.disc_year}
              onChange={handleCreateChange("disc_year")}
              placeholder="2015"
              style={inputControl}
              step={1}
              required
            />
          </label>
          <label style={fieldLabel}>
            <LabelText fieldKey="orbperd" />
            <input
              type="number"
              value={createForm.orbperd}
              onChange={handleCreateChange("orbperd")}
              placeholder="365.25"
              style={inputControl}
              step="any"
              required
            />
          </label>
          <label style={fieldLabel}>
            <LabelText fieldKey="rade" />
            <input
              type="number"
              value={createForm.rade}
              onChange={handleCreateChange("rade")}
              placeholder="1.0"
              style={inputControl}
              step="any"
              required
            />
          </label>
          <label style={fieldLabel}>
            <LabelText fieldKey="masse" />
            <input
              type="number"
              value={createForm.masse}
              onChange={handleCreateChange("masse")}
              placeholder="1.0"
              style={inputControl}
              step="any"
              required
            />
          </label>
          <label style={fieldLabel}>
            <LabelText fieldKey="st_teff" />
            <input
              type="number"
              value={createForm.st_teff}
              onChange={handleCreateChange("st_teff")}
              placeholder="5778"
              style={inputControl}
              step="any"
              required
            />
          </label>
          <label style={fieldLabel}>
            <LabelText fieldKey="st_rad" />
            <input
              type="number"
              value={createForm.st_rad}
              onChange={handleCreateChange("st_rad")}
              placeholder="1.0"
              style={inputControl}
              step="any"
              required
            />
          </label>
          <label style={fieldLabel}>
            <LabelText fieldKey="st_mass" />
            <input
              type="number"
              value={createForm.st_mass}
              onChange={handleCreateChange("st_mass")}
              placeholder="1.0"
              style={inputControl}
              step="any"
              required
            />
          </label>
          <button
            type="submit"
            style={{
              ...primaryButton(create.isPending || !createFormComplete),
              gridColumn: "1 / -1",
            }}
            disabled={create.isPending || !createFormComplete}
          >
            {create.isPending ? "Creating…" : "Create"}
          </button>
          {createFormError && (
            <div className="admin-create-grid__full">
              <ErrorNote text={createFormError} />
            </div>
          )}
          {create.isError && (
            <div className="admin-create-grid__full">
              <ErrorNote
                text={
                  createErrorDetails?.length
                    ? "Create planet request failed validation."
                    : (create.error as Error)?.message ?? "Create failed."
                }
                items={createErrorDetails}
              />
            </div>
          )}
          {create.isSuccess && (
            <div className="admin-create-grid__full">
              <SuccessNote text="Planet created." />
            </div>
          )}
        </form>
      </div>

      <div className="page-grid page-grid--with-aside">
        <div style={primaryColumn}>
          <div className="card interactive-card" style={{ ...surfaceCard, padding: 24 }}>
            <CardHeader
              title="Soft-deleted planets"
              subtitle="Restore planets or review which records are pending permanent removal."
              trailing={
                <div style={listControls}>
                  <label style={controlLabel}>
                    Limit
                    <select
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setOffset(0);
                      }}
                      style={selectControl}
                    >
                      {LIMIT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" onClick={() => deletedQuery.refetch()} style={ghostButton}>
                    Refresh
                  </button>
                </div>
              }
            />

            {deletedQuery.isLoading && <TableSkeleton rows={5} />}
            {deletedQuery.isError && (
              <ErrorNote text={describeAdminError(deletedQuery.error, "Failed to load deleted planets.")} />
            )}
            {!deletedQuery.isLoading && !deletedQuery.isError && rows.length === 0 && (
              <EmptyNote
                text={
                  disableActions
                    ? "Provide an admin API key to load soft-deleted planets."
                    : "No soft-deleted planets found for the current window."
                }
              />
            )}

            {!deletedQuery.isLoading && !deletedQuery.isError && rows.length > 0 && (
              <div style={{ marginTop: 16, overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Method</th>
                      <th>Year</th>
                      <th>Deleted at</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <Row key={row.id} row={row} apiKey={trimmedApiKey} />
                    ))}
                  </tbody>
                </table>
                <div style={paginationRow}>
                  <button onClick={onPrev} disabled={offset === 0} style={ghostButton}>
                    Prev
                  </button>
                  <span style={pageInfo}>Offset {offset}</span>
                  <button onClick={onNext} style={ghostButton}>
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <aside style={sideColumn}>
          <div className="card interactive-card" style={{ ...surfaceCard, padding: 24 }}>
            <CardHeader
              title="Soft delete access"
              subtitle="Store an admin API key for restore, delete, and catalogue soft deletes."
            />
            <div style={{ display: "grid", gap: 12 }}>
              <input
                placeholder="x-api-key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={inputControl}
              />
              <small style={mutedText}>
                Saved securely in local storage only. Updates sync automatically to the Planets table actions.
              </small>
            </div>
          </div>

          <div className="card interactive-card" style={{ ...surfaceCard, padding: 24 }}>
            <CardHeader title="Restore planet" subtitle="Backs out a soft delete using POST /{id}/restore." />
            <form style={formGrid} onSubmit={handleRestoreSubmit}>
              <label style={fieldLabel}>
                Planet ID
                <input
                  value={restoreId}
                  onChange={(e) => setRestoreId(e.target.value)}
                  placeholder="42"
                  style={inputControl}
                />
              </label>
              <button type="submit" style={primaryButton(disableActions || restoreById.isPending)} disabled={disableActions || restoreById.isPending}>
                {restoreById.isPending ? "Restoring…" : "Restore"}
              </button>
              {restoreError && <ErrorNote text={restoreError} />}
              {restoreById.isError && (
                <ErrorNote text={describeAdminError(restoreById.error, "Restore failed.")} />
              )}
              {restoreById.isSuccess && (
                <SuccessNote text={restoreById.data?.message ?? "Planet restored."} />
              )}
            </form>
          </div>

          <div className="card interactive-card" style={{ ...surfaceCard, padding: 24 }}>
            <CardHeader
              title="Hard delete"
              subtitle="DELETE /admin/hard-delete/{id}?confirm=true — removes the record permanently."
            />
            <form style={formGrid} onSubmit={handleHardDeleteSubmit}>
              <label style={fieldLabel}>
                Planet ID
                <input
                  value={hardDeleteId}
                  onChange={(e) => setHardDeleteId(e.target.value)}
                  placeholder="42"
                  style={inputControl}
                />
              </label>
              <label style={checkboxRow}>
                <input
                  type="checkbox"
                  checked={confirmHardDelete}
                  onChange={(e) => setConfirmHardDelete(e.target.checked)}
                />
                <span>I understand this removes the record permanently.</span>
              </label>
              <button
                type="submit"
                style={dangerButton(disableActions || hardDelete.isPending)}
                disabled={disableActions || hardDelete.isPending}
              >
                {hardDelete.isPending ? "Deleting…" : "Hard delete"}
              </button>
              {hardDeleteError && <ErrorNote text={hardDeleteError} />}
              {hardDelete.isError && (
                <ErrorNote text={describeAdminError(hardDelete.error, "Hard delete failed.")} />
              )}
              {hardDelete.isSuccess && <SuccessNote text="Planet hard deleted." />}
            </form>
          </div>

          <div
            className="card interactive-card"
            style={{ ...surfaceCard, padding: 24, borderColor: "var(--note-error-border)" }}
          >
            <CardHeader
              title="Danger zone"
              subtitle="DELETE /admin/delete-all?confirm=true — truncates the planets table."
            />
            <form style={formGrid} onSubmit={handleWipeSubmit}>
              <label style={checkboxRow}>
                <input
                  type="checkbox"
                  checked={confirmWipe}
                  onChange={(e) => setConfirmWipe(e.target.checked)}
                />
                <span>Yes, delete every planet and reset ids.</span>
              </label>
              <button
                type="submit"
                style={dangerButton(disableActions || wipeAll.isPending)}
                disabled={disableActions || wipeAll.isPending}
              >
                {wipeAll.isPending ? "Wiping…" : "Delete all"}
              </button>
              {wipeError && <ErrorNote text={wipeError} />}
              {wipeAll.isError && (
                <ErrorNote text={describeAdminError(wipeAll.error, "Failed to truncate.")} />
              )}
              {wipeAll.isSuccess && <SuccessNote text="Planets table truncated." />}
            </form>
          </div>
        </aside>
      </div>
    </section>
  );
}

function LabelText({ fieldKey }: { fieldKey: keyof typeof defaultCreateForm }) {
  return (
    <span style={labelText}>
      {PLANET_FIELD_LABELS[fieldKey]}
      <span aria-hidden="true" style={requiredMark}>
        *
      </span>
    </span>
  );
}

function Row({ row, apiKey }: { row: DeletedPlanetOut; apiKey: string }) {
  const restore = useRestorePlanet(row.id, apiKey);
  const disabled = !apiKey || restore.isPending;

  return (
    <tr>
      <td>{row.id}</td>
      <td>{row.name}</td>
      <td>{row.disc_method ?? "—"}</td>
      <td>{row.disc_year ?? "—"}</td>
      <td>{formatDateTime(row.deleted_at)}</td>
      <td>
        <div style={rowActionCell}>
          <button
            type="button"
            onClick={() => restore.mutate()}
            disabled={disabled}
            style={primaryButton(disabled)}
            title={apiKey ? "Restore planet" : "Provide x-api-key to enable"}
          >
            {restore.isPending ? "Restoring…" : "Restore"}
          </button>
          {!apiKey && <span style={hintText}>API key required</span>}
          {restore.isError && (
            <span style={errorHint}>{describeAdminError(restore.error, "Failed")}</span>
          )}
          {restore.isSuccess && <span style={successHint}>Restored</span>}
        </div>
      </td>
    </tr>
  );
}

function CardHeader({ title, subtitle, trailing }: { title: string; subtitle?: string; trailing?: ReactNode }) {
  return (
    <div style={cardHeader}>
      <div>
        <h3 style={{ margin: "0 0 4px" }}>{title}</h3>
        {subtitle && (
          <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{subtitle}</div>
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
            {Array.from({ length: 6 }).map((_, idx) => (
              <th key={idx}>
                <div style={skeletonBar(80)} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {Array.from({ length: 6 }).map((__, cellIdx) => (
                <td key={cellIdx}>
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

function ErrorNote({ text, items }: { text?: string; items?: ReactNode[] | null }) {
  if (!text && (!items || items.length === 0)) return null;
  return (
    <div style={errorNote} role="alert">
      {text && <span>{text}</span>}
      {items && items.length > 0 && (
        <ul style={errorList}>
          {items.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SuccessNote({ text }: { text: string }) {
  return (
    <div style={successNote} role="status">
      {text}
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <div style={emptyNote}>{text}</div>;
}

function skeletonBar(width: number): CSSProperties {
  return {
    width,
    height: 14,
    background: "var(--skeleton-bar-bg)",
    borderRadius: 8,
  };
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
    return "Admin API key rejected. Double-check the value and try again.";
  }

  if (/HTTP\s+403/i.test(message)) {
    return "Admin API key is missing required permissions.";
  }

  return null;
}

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  try {
    const date = typeof value === "string" ? new Date(value) : value;
    return date.toLocaleString();
  } catch {
    return String(value);
  }
}

const pageWrap: CSSProperties = {
  display: "grid",
  gap: 24,
  maxWidth: 1280,
  margin: "0 auto",
  width: "100%",
};

const pageIntro: CSSProperties = {
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

const pageTitle: CSSProperties = {
  margin: 0,
  fontSize: 30,
  fontWeight: 700,
  color: "var(--color-heading)",
  letterSpacing: -0.3,
};

const pageSubtitle: CSSProperties = {
  margin: "8px 0 0",
  color: "var(--color-text-secondary)",
  fontSize: 14,
  lineHeight: "22px",
  maxWidth: 640,
};

const metaRow: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const metaPill: CSSProperties = {
  background: "var(--badge-bg)",
  color: "var(--badge-text)",
  borderRadius: 999,
  padding: "6px 14px",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0.4,
  textTransform: "uppercase",
};

const primaryColumn: CSSProperties = {
  display: "grid",
  gap: 24,
  minWidth: 0,
};

const sideColumn: CSSProperties = {
  display: "grid",
  gap: 24,
  alignSelf: "start",
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

const listControls: CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const controlLabel: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: "var(--color-text-secondary)",
};

const selectControl: CSSProperties = {
  borderRadius: 10,
  border: "1px solid var(--control-border-strong)",
  background: "var(--surface-card-bg)",
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--color-text-primary)",
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
  boxShadow: "var(--button-ghost-shadow)",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const paginationRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginTop: 16,
};

const pageInfo: CSSProperties = {
  fontSize: 12,
  color: "var(--color-text-muted)",
  fontWeight: 600,
};

const formGrid: CSSProperties = {
  display: "grid",
  gap: 14,
};

const fieldLabel: CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 12,
  color: "var(--color-text-secondary)",
  fontWeight: 600,
  letterSpacing: 0.3,
};

const labelText: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const requiredMark: CSSProperties = {
  color: "var(--color-danger)",
  fontWeight: 700,
};

const inputControl: CSSProperties = {
  width: "100%",
  borderRadius: 10,
  border: "1px solid var(--input-border)",
  background: "var(--input-bg)",
  padding: "10px 12px",
  fontSize: 13,
  lineHeight: "20px",
  color: "var(--input-text)",
  boxShadow: "var(--input-shadow)",
};

const checkboxRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
  color: "var(--color-text-secondary)",
};

const primaryButton = (disabled: boolean): CSSProperties => ({
  padding: "10px 16px",
  borderRadius: 12,
  border: "none",
  background: disabled ? "rgba(37, 99, 235, 0.35)" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "#ffffff",
  fontWeight: 600,
  fontSize: 13,
  cursor: disabled ? "not-allowed" : "pointer",
  boxShadow: disabled ? "none" : "0 12px 22px -16px rgba(37, 99, 235, 0.55)",
});

const dangerButton = (disabled: boolean): CSSProperties => ({
  padding: "10px 16px",
  borderRadius: 12,
  border: "1px solid rgba(239, 68, 68, 0.5)",
  background: disabled ? "rgba(248, 113, 113, 0.25)" : "linear-gradient(135deg, #f87171, #dc2626)",
  color: "#ffffff",
  fontWeight: 600,
  fontSize: 13,
  cursor: disabled ? "not-allowed" : "pointer",
  boxShadow: disabled ? "none" : "0 12px 22px -16px rgba(220, 38, 38, 0.55)",
});

const rowActionCell: CSSProperties = {
  display: "grid",
  gap: 6,
  alignItems: "flex-start",
};

const hintText: CSSProperties = {
  fontSize: 11,
  color: "var(--color-hint)",
};

const errorHint: CSSProperties = {
  fontSize: 11,
  color: "var(--color-danger)",
};

const successHint: CSSProperties = {
  fontSize: 11,
  color: "var(--color-success)",
};

const mutedText: CSSProperties = {
  fontSize: 12,
  color: "var(--color-text-muted)",
  lineHeight: "18px",
};

const errorNote: CSSProperties = {
  border: "1px solid var(--note-error-border)",
  background: "var(--note-error-bg)",
  color: "var(--note-error-text)",
  padding: 12,
  borderRadius: 12,
  fontSize: 13,
};

const successNote: CSSProperties = {
  border: "1px solid var(--note-success-border)",
  background: "var(--note-success-bg)",
  color: "var(--note-success-text)",
  padding: 10,
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

const errorList: CSSProperties = {
  margin: "8px 0 0",
  paddingLeft: 18,
  display: "grid",
  gap: 4,
  fontSize: 12,
};
