import { CloudOff, RefreshCw, Trash2, Wifi, WifiOff, Clock, Shield, FileText, ArrowUpRight, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { formatDistanceToNow } from "date-fns";
import { StorageUsageIndicator } from "@/components/offline/StorageUsageIndicator";

const TYPE_CONFIG = {
  screening: { label: "Screening", icon: FileText, color: "bg-blue-100 text-blue-800" },
  crisis_intervention: { label: "Crisis Intervention", icon: Shield, color: "bg-red-100 text-red-800" },
  referral: { label: "Referral", icon: ArrowUpRight, color: "bg-amber-100 text-amber-800" },
} as const;

export function OfflineQueueView() {
  const { queue, syncQueue, syncOne, removeItem, isSyncing, syncProgress, isOnline, pendingCount } = useOfflineQueue();

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CloudOff className="h-5 w-5" />
                Offline Queue
              </CardTitle>
              <CardDescription>
                {pendingCount === 0
                  ? "All items have been synced. Nothing pending."
                  : `${pendingCount} item(s) waiting to sync`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="flex items-center gap-1.5">
                {isOnline ? (
                  <><Wifi className="h-3 w-3 text-green-600" /> Online</>
                ) : (
                  <><WifiOff className="h-3 w-3 text-destructive" /> Offline</>
                )}
              </Badge>
              {pendingCount > 0 && (
                <Button
                  size="sm"
                  onClick={() => syncQueue()}
                  disabled={isSyncing || !isOnline}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Syncing..." : "Sync All"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {/* Sync Progress Bar */}
        {syncProgress && (
          <CardContent className="pt-0 pb-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium">
                  Syncing {syncProgress.completed + syncProgress.failed} of {syncProgress.total}…
                </span>
                <div className="flex items-center gap-3 text-xs">
                  {syncProgress.completed > 0 && (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {syncProgress.completed} synced
                    </span>
                  )}
                  {syncProgress.failed > 0 && (
                    <span className="flex items-center gap-1 text-destructive">
                      <XCircle className="h-3.5 w-3.5" /> {syncProgress.failed} failed
                    </span>
                  )}
                </div>
              </div>
              <Progress
                value={((syncProgress.completed + syncProgress.failed) / syncProgress.total) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        )}
      </Card>

      <StorageUsageIndicator />

      {/* Empty State */}
      {pendingCount === 0 && (
        <Alert>
          <Wifi className="h-4 w-4" />
          <AlertDescription>
            No pending offline items. Assessments, crisis interventions, and referrals saved while offline will appear here for review and sync.
          </AlertDescription>
        </Alert>
      )}

      {/* Queue Items */}
      <div className="space-y-3">
        {queue.map((item) => {
          const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.screening;
          const Icon = config.icon;
          const timeAgo = formatDistanceToNow(new Date(item.queuedAt), { addSuffix: true });

          return (
            <Card key={item.id} className="border-l-4 border-l-muted-foreground/30">
              <CardContent className="py-4 px-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className={`text-xs ${config.color}`}>
                          {config.label}
                        </Badge>
                        {item.toolType && (
                          <Badge variant="outline" className="text-xs">
                            {item.toolType}
                          </Badge>
                        )}
                      </div>

                      <div className="text-sm text-muted-foreground space-y-0.5">
                        <p className="truncate">
                          Patient: <span className="font-mono text-xs">{item.patientId.slice(0, 8)}…</span>
                        </p>
                        {item.data.severity_level && (
                          <p>Severity: <span className="font-medium text-foreground">{item.data.severity_level}</span></p>
                        )}
                        {item.data.total_score !== undefined && (
                          <p>Score: <span className="font-medium text-foreground">{item.data.total_score}</span></p>
                        )}
                        {item.type === "crisis_intervention" && item.data.crisis_type && (
                          <p>Crisis: <span className="font-medium text-foreground">{item.data.crisis_type.replace(/_/g, " ")}</span></p>
                        )}
                        {item.type === "referral" && item.data.referral_type && (
                          <p>Referral: <span className="font-medium text-foreground">{item.data.referral_type}</span></p>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Queued {timeAgo}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => syncOne(item.id)}
                      disabled={!isOnline || isSyncing}
                      title="Sync this item now"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Delete this item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
