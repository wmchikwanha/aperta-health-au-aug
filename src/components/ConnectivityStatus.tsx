import { Wifi, WifiOff, RefreshCw, CloudOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOfflineQueue, useOnlineStatus } from "@/hooks/useOfflineQueue";

export const ConnectivityStatus = () => {
  const { pendingCount, isSyncing, syncQueue } = useOfflineQueue();
  const isOnline = useOnlineStatus();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {!isOnline && (
        <Badge variant="destructive" className="flex items-center gap-1.5 text-xs">
          <WifiOff className="h-3 w-3" />
          Offline
        </Badge>
      )}
      {pendingCount > 0 && (
        <Badge variant="secondary" className="flex items-center gap-1.5 text-xs">
          <CloudOff className="h-3 w-3" />
          {pendingCount} queued
          {isOnline && (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 ml-1"
              onClick={() => syncQueue()}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
            </Button>
          )}
        </Badge>
      )}
    </div>
  );
};
