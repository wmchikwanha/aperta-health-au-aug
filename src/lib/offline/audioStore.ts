// Persists captured audio to IndexedDB and queues a transcript upload.
// Splits large blobs into <=2 MB chunks so we can stream them out one
// at a time when the device next reaches the internet without hitting
// edge-function base64 limits.
//
// The caller hands us the full Blob from MediaRecorder.onstop. We do
// the slicing and outbox bookkeeping here so audio paths stay simple.

import { offlineDB, enqueueOutbox, newId, type AudioChunkRow } from "./db";

const CHUNK_BYTES = 2 * 1024 * 1024; // 2 MB

export interface PersistAudioOptions {
  patientId: string;
  language?: string;
  /** Optional encounter context the server should join on */
  encounterId?: string;
  /** Optional clinician narrative captured alongside the audio */
  narrative?: string;
}

export interface PersistAudioResult {
  audioId: string;
  outboxId: string;
  totalBytes: number;
  chunks: number;
}

export async function persistAudioForLaterSync(
  blob: Blob,
  opts: PersistAudioOptions,
): Promise<PersistAudioResult> {
  const audioId = newId();
  const chunks: AudioChunkRow[] = [];
  let seq = 0;

  for (let offset = 0; offset < blob.size; offset += CHUNK_BYTES) {
    const slice = blob.slice(offset, Math.min(offset + CHUNK_BYTES, blob.size), blob.type);
    chunks.push({
      id: `${audioId}-${seq}`,
      audioId,
      patientId: opts.patientId,
      seq,
      blob: slice,
      bytes: slice.size,
      capturedAt: new Date().toISOString(),
      mimeType: blob.type || "audio/webm",
    });
    seq++;
  }

  await offlineDB.audio_chunks.bulkAdd(chunks);

  const entry = await enqueueOutbox({
    kind: "audio_transcript",
    patientId: opts.patientId,
    audioId,
    payload: {
      language: opts.language ?? "en-US",
      encounterId: opts.encounterId,
      narrative: opts.narrative,
      mimeType: blob.type || "audio/webm",
      totalBytes: blob.size,
      chunkCount: chunks.length,
    },
  });

  return {
    audioId,
    outboxId: entry.id,
    totalBytes: blob.size,
    chunks: chunks.length,
  };
}

export async function reassembleAudio(audioId: string): Promise<Blob | null> {
  const chunks = await offlineDB.audio_chunks
    .where("audioId")
    .equals(audioId)
    .sortBy("seq");
  if (chunks.length === 0) return null;
  return new Blob(
    chunks.map((c) => c.blob),
    { type: chunks[0].mimeType },
  );
}
