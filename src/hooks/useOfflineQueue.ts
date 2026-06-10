import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const QUEUE_KEY = "aperta_health_offline_queue";

export interface QueuedItem {
  id: string;
  queuedAt: string;
  type: "screening" | "crisis_intervention" | "referral";
  patientId: string;
  /** Screening-specific */
  toolType?: string;
  /** Payload to insert — shape depends on `type` */
  data: Record<string, any>;
}

// Back-compat alias
export type QueuedAssessment = QueuedItem;

function loadQueue(): QueuedItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedItem[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return isOnline;
}

async function syncItem(item: QueuedItem, userId: string): Promise<boolean> {
  switch (item.type) {
    case "screening": {
      const { error } = await supabase.from("screening_assessments").insert({
        patient_id: item.patientId,
        user_id: userId,
        tool_type: item.toolType ?? item.data.tool_type,
        responses: item.data.responses,
        total_score: item.data.total_score,
        severity_level: item.data.severity_level,
        interpretation: item.data.interpretation,
        notes: item.data.notes,
      });
      if (error) throw error;
      return true;
    }
    case "crisis_intervention": {
      const { error } = await supabase.from("crisis_interventions").insert({
        patient_id: item.patientId,
        user_id: userId,
        crisis_type: item.data.crisis_type,
        severity_level: item.data.severity_level,
        interventions_applied: item.data.interventions_applied,
        checklist_completed: item.data.checklist_completed,
        referral_made: item.data.referral_made,
        referral_type: item.data.referral_type,
        referral_destination: item.data.referral_destination,
        referral_notes: item.data.referral_notes,
        outcome: item.data.outcome,
        follow_up_required: item.data.follow_up_required,
        resolved_at: item.data.resolved_at,
      });
      if (error) throw error;
      return true;
    }
    case "referral": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("referrals").insert({
        patient_id: item.patientId,
        recorded_by: userId,
        ...item.data,
      });
      if (error) throw error;
      return true;
    }
    default:
      return false;
  }
}

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedItem[]>(loadQueue);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const isOnline = useOnlineStatus();
  const { toast } = useToast();
  const syncingRef = useRef(false);

  const enqueue = useCallback((item: Omit<QueuedItem, "id" | "queuedAt">) => {
    const entry: QueuedItem = {
      ...item,
      id: crypto.randomUUID(),
      queuedAt: new Date().toISOString(),
    };
    setQueue((prev) => {
      const next = [...prev, entry];
      saveQueue(next);
      return next;
    });

    const label = item.type === "screening"
      ? `${item.toolType} assessment`
      : item.type === "crisis_intervention"
        ? "Crisis intervention"
        : "Referral";

    toast({
      title: "Saved Offline",
      description: `${label} queued. It will sync when you're back online.`,
    });
  }, [toast]);

  const syncQueue = useCallback(async () => {
    if (syncingRef.current) return;
    const current = loadQueue();
    if (current.length === 0) return;

    syncingRef.current = true;
    setIsSyncing(true);
    setSyncProgress({ total: current.length, completed: 0, failed: 0 });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      syncingRef.current = false;
      setIsSyncing(false);
      setSyncProgress(null);
      return;
    }

    const failed: QueuedItem[] = [];
    let synced = 0;
    let failedCount = 0;

    for (const item of current) {
      try {
        await syncItem(item, user.id);
        synced++;
      } catch {
        failed.push(item);
        failedCount++;
      }
      setSyncProgress({ total: current.length, completed: synced, failed: failedCount });
    }

    saveQueue(failed);
    setQueue(failed);
    syncingRef.current = false;
    setIsSyncing(false);

    if (synced > 0) {
      toast({
        title: "Sync Complete",
        description: `${synced} offline item(s) synced successfully.${failed.length > 0 ? ` ${failed.length} failed — will retry.` : ""}`,
      });
    }

    // Clear progress after a brief delay so the user sees 100%
    setTimeout(() => setSyncProgress(null), 2000);
  }, [toast]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && loadQueue().length > 0) {
      syncQueue();
    }
  }, [isOnline, syncQueue]);

  const removeItem = useCallback((itemId: string) => {
    setQueue((prev) => {
      const next = prev.filter((i) => i.id !== itemId);
      saveQueue(next);
      return next;
    });
    toast({ title: "Item Removed", description: "Offline item has been deleted." });
  }, [toast]);

  const syncOne = useCallback(async (itemId: string) => {
    const current = loadQueue();
    const item = current.find((i) => i.id === itemId);
    if (!item) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      await syncItem(item, user.id);
      setQueue((prev) => {
        const next = prev.filter((i) => i.id !== itemId);
        saveQueue(next);
        return next;
      });
      toast({ title: "Synced", description: "Item synced successfully." });
    } catch {
      toast({ title: "Sync Failed", description: "Could not sync this item. Will retry later.", variant: "destructive" });
    }
  }, [toast]);

  return { queue, enqueue, syncQueue, syncOne, removeItem, isSyncing, syncProgress, isOnline, pendingCount: queue.length };
}
