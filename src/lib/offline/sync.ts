// Sync engine for the Dexie outbox. Currently handles the
// `audio_transcript` kind — reassembles audio chunks, posts them to the
// transcribe-audio edge function, and persists the resulting transcript
// as an assessment narrative on the patient record.
//
// The existing useOfflineQueue (localStorage) continues to handle
// screenings / crisis interventions / referrals; this engine only owns
// what the legacy queue does not cover.

import { offlineDB, type OutboxRow } from "./db";
import { reassembleAudio } from "./audioStore";
import { supabase } from "@/integrations/supabase/client";

async function blobToBase64(blob: Blob): Promise<string> {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function syncAudioTranscript(row: OutboxRow): Promise<void> {
  if (!row.audioId) throw new Error("audio_transcript row missing audioId");
  const blob = await reassembleAudio(row.audioId);
  if (!blob || blob.size === 0) throw new Error("No audio chunks found for this row");

  const language = (row.payload?.language as string) ?? "en-US";
  const base64 = await blobToBase64(blob);

  const { data, error } = await supabase.functions.invoke("transcribe-audio", {
    body: { audio: base64, languageCode: language },
  });
  if (error) throw new Error(error.message || "Transcription failed");
  if (data?.error) throw new Error(data.error);
  const text = (data?.text as string | undefined) ?? "";

  // Persist a lightweight assessment record so the clinician sees the
  // transcript on the patient profile.
  const { data: userResp } = await supabase.auth.getUser();
  if (userResp?.user) {
    await supabase.from("assessments").insert({
      patient_id: row.patientId,
      user_id: userResp.user.id,
      raw_input: text,
      ai_analysis: null,
      metadata: {
        source: "offline_audio_sync",
        original_narrative: row.payload?.narrative ?? null,
        captured_at: row.queuedAt,
      },
    } as never);
  }

  // Cleanup: chunks + outbox row
  await offlineDB.audio_chunks.where("audioId").equals(row.audioId).delete();
  await offlineDB.outbox.delete(row.id);
}

let running = false;

export async function runOutboxSync(): Promise<{ synced: number; failed: number }> {
  if (running) return { synced: 0, failed: 0 };
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { synced: 0, failed: 0 };
  }
  running = true;
  let synced = 0;
  let failed = 0;
  try {
    const pending = await offlineDB.outbox.where("status").equals("pending").toArray();
    for (const row of pending) {
      try {
        await offlineDB.outbox.update(row.id, { status: "syncing", attempts: row.attempts + 1 });
        if (row.kind === "audio_transcript") {
          await syncAudioTranscript(row);
          synced++;
        } else {
          // Other kinds: leave for legacy handler / no-op for now.
          await offlineDB.outbox.update(row.id, { status: "pending" });
        }
      } catch (err) {
        failed++;
        await offlineDB.outbox.update(row.id, {
          status: "failed",
          lastError: err instanceof Error ? err.message : String(err),
        });
      }
    }
    // Reset failed rows back to pending so the next online event retries.
    await offlineDB.outbox.where("status").equals("failed").modify({ status: "pending" });
  } finally {
    running = false;
  }
  return { synced, failed };
}

let listenersBound = false;
export function bindOutboxAutoSync(): void {
  if (listenersBound || typeof window === "undefined") return;
  listenersBound = true;
  window.addEventListener("online", () => void runOutboxSync());
  // Initial pass on app boot
  setTimeout(() => void runOutboxSync(), 2_000);
  // Periodic safety net (every 5 min)
  setInterval(() => void runOutboxSync(), 5 * 60 * 1000);
}
