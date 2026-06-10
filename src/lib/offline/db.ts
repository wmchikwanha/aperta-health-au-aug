// IndexedDB-backed offline store for Aperta Health (Dexie).
//
// Holds clinical work that a CHW can complete with no internet:
// screenings, MSE drafts, crisis events, audio chunks, and an outbox
// that the sync engine drains when connectivity returns.
//
// Storage budget target: < 50 MB per CHW. Audio is the dominant cost;
// the upload path deletes chunks as soon as their parent outbox row
// reports `synced`.

import Dexie, { type Table } from "dexie";

export type SyncStatus = "pending" | "syncing" | "synced" | "failed";

export type OutboxKind =
  | "screening"
  | "crisis_intervention"
  | "referral"
  | "audio_transcript"
  | "narrative";

export interface OutboxRow {
  id: string;
  kind: OutboxKind;
  patientId: string;
  /** When this row was first queued (client clock) */
  queuedAt: string;
  /** Free-form payload posted to the relevant edge function / table */
  payload: Record<string, unknown>;
  /** Auxiliary fields */
  toolType?: string;
  /** For audio_transcript rows: encounter / audio id link */
  audioId?: string;
  status: SyncStatus;
  attempts: number;
  lastError?: string;
  /** Optional idempotency key the server can de-dupe against */
  idempotencyKey: string;
  /** Local-only flag — server result has not yet replaced this entry */
  provisional: boolean;
}

export interface AudioChunkRow {
  id: string;
  audioId: string;
  patientId: string;
  /** Sequence within the encounter; 0-indexed */
  seq: number;
  blob: Blob;
  bytes: number;
  capturedAt: string;
  mimeType: string;
}

export interface EncounterDraftRow {
  id: string;
  patientId: string;
  startedAt: string;
  status: "draft" | "completed";
  /** Source of the encounter — useful for the CHW workflow */
  origin?: string;
}

export interface MseDraftRow {
  id: string;
  patientId: string;
  encounterId?: string;
  data: Record<string, unknown>;
  updatedAt: string;
}

export interface CacheMetaRow {
  key: string;
  value: unknown;
  updatedAt: string;
}

class Aperta HealthOfflineDB extends Dexie {
  outbox!: Table<OutboxRow, string>;
  audio_chunks!: Table<AudioChunkRow, string>;
  encounters!: Table<EncounterDraftRow, string>;
  mse_drafts!: Table<MseDraftRow, string>;
  cache_meta!: Table<CacheMetaRow, string>;

  constructor() {
    super("aperta_health_offline_v1");
    this.version(1).stores({
      outbox: "id, status, kind, patientId, queuedAt",
      audio_chunks: "id, audioId, patientId, seq",
      encounters: "id, patientId, status, startedAt",
      mse_drafts: "id, patientId, encounterId, updatedAt",
      cache_meta: "key",
    });
  }
}

export const offlineDB = new Aperta HealthOfflineDB();

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function enqueueOutbox(
  row: Omit<OutboxRow, "id" | "queuedAt" | "status" | "attempts" | "provisional" | "idempotencyKey"> & {
    idempotencyKey?: string;
    provisional?: boolean;
  },
): Promise<OutboxRow> {
  const entry: OutboxRow = {
    id: newId(),
    queuedAt: new Date().toISOString(),
    status: "pending",
    attempts: 0,
    provisional: row.provisional ?? true,
    idempotencyKey: row.idempotencyKey ?? newId(),
    ...row,
  };
  await offlineDB.outbox.add(entry);
  return entry;
}

export async function getStorageEstimate(): Promise<{ usageMB: number; quotaMB: number; pct: number }> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return { usageMB: 0, quotaMB: 0, pct: 0 };
  }
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  const usageMB = +(usage / (1024 * 1024)).toFixed(1);
  const quotaMB = +(quota / (1024 * 1024)).toFixed(1);
  const pct = quota ? Math.min(100, Math.round((usage / quota) * 100)) : 0;
  return { usageMB, quotaMB, pct };
}

export async function purgeSyncedAudio(): Promise<number> {
  // Remove audio chunks whose owning outbox row has been synced and removed.
  const allAudio = await offlineDB.audio_chunks.toArray();
  if (allAudio.length === 0) return 0;
  const audioIds = Array.from(new Set(allAudio.map((c) => c.audioId)));
  const stillReferenced = new Set(
    (await offlineDB.outbox.where("kind").equals("audio_transcript").toArray()).map((r) => r.audioId),
  );
  const toRemove = audioIds.filter((id) => !stillReferenced.has(id));
  if (toRemove.length === 0) return 0;
  await offlineDB.audio_chunks.where("audioId").anyOf(toRemove).delete();
  return toRemove.length;
}
