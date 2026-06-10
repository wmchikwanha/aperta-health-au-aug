import { useEffect, useState } from "react";
import { HardDrive } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStorageEstimate, purgeSyncedAudio, offlineDB } from "@/lib/offline/db";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function StorageUsageIndicator() {
  const [usage, setUsage] = useState({ usageMB: 0, quotaMB: 0, pct: 0 });
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [chunks, setChunks] = useState(0);
  const { toast } = useToast();

  const refresh = async () => {
    setUsage(await getStorageEstimate());
    if (navigator.storage?.persisted) {
      setPersisted(await navigator.storage.persisted());
    }
    setChunks(await offlineDB.audio_chunks.count());
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, []);

  const handleEnablePersist = async () => {
    if (navigator.storage?.persist) {
      const ok = await navigator.storage.persist();
      setPersisted(ok);
      toast({
        title: ok ? "Persistent storage enabled" : "Persistent storage denied",
        description: ok
          ? "The browser will not evict your offline data under low-storage pressure."
          : "The browser declined. Your data may be cleared if storage runs low.",
      });
    }
  };

  const handlePurge = async () => {
    const removed = await purgeSyncedAudio();
    await refresh();
    toast({
      title: "Cleanup complete",
      description: `Removed ${removed} synced audio file(s).`,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <HardDrive className="h-4 w-4" /> Device storage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <div className="flex justify-between mb-1 text-muted-foreground">
            <span>{usage.usageMB} MB used</span>
            <span>{usage.quotaMB ? `${usage.quotaMB} MB available` : "Unknown quota"}</span>
          </div>
          <Progress value={usage.pct} className="h-2" />
        </div>

        <p className="text-xs text-muted-foreground">
          {chunks > 0
            ? `${chunks} audio chunk(s) stored locally, waiting to sync.`
            : "No audio waiting to sync."}
        </p>

        {persisted === false && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 space-y-2">
            <p>
              Your browser may clear offline data under low-storage pressure. Enable persistent storage to protect
              patient drafts.
            </p>
            <Button size="sm" variant="outline" onClick={handleEnablePersist}>
              Enable persistent storage
            </Button>
          </div>
        )}
        {persisted === true && (
          <p className="text-xs text-emerald-700">
            ✓ Persistent storage enabled — your offline data is protected from automatic eviction.
          </p>
        )}

        <Button variant="outline" size="sm" onClick={handlePurge} className="w-full">
          Clean up synced audio
        </Button>
      </CardContent>
    </Card>
  );
}
