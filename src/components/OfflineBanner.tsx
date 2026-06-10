import { useState, useEffect, useRef } from "react";
import { WifiOff, X } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOfflineQueue";
import { toast } from "sonner";

export const OfflineBanner = () => {
  const isOnline = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      setDismissed(false);
    } else if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      toast.success("You're back online", {
        description: "Pending items will now sync automatically.",
      });
    }
  }, [isOnline]);

  if (isOnline || dismissed) return null;

  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 mx-auto">
        <WifiOff className="h-4 w-4" />
        <span className="font-medium">You are offline.</span>
        <span className="hidden sm:inline">Screening forms, crisis protocols, and checklists remain available. Data will sync when you reconnect.</span>
      </div>
      <button onClick={() => setDismissed(true)} className="shrink-0 p-1 rounded hover:bg-destructive-foreground/20 transition-colors">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
