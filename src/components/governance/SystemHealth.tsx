import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Health = { status: string; checks: Record<string, { ok: boolean; latency_ms: number; detail?: string }>; timestamp: string };
type Alert = { id: string; alert_type: string; severity: string; message: string; source_function: string | null; created_at: string; acknowledged_at: string | null; resolved_at: string | null; acknowledgement_note: string | null };

const ms = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v)} ms`);

export function SystemHealth() {
  const [metrics, setMetrics] = useState<any>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [auto, setAuto] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [updated, setUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    const [m, h, a, e] = await Promise.all([
      supabase.rpc("safety_monitor_metrics", { _days: 7 }),
      supabase.functions.invoke("health-check"),
      supabase.from("system_alerts").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("error_log").select("id, error_type, message, url, created_at").order("created_at", { ascending: false }).limit(20),
    ]);
    if (m.data) setMetrics(m.data);
    setHealth((h.data as Health) ?? { status: "down", checks: {}, timestamp: new Date().toISOString() });
    setAlerts((a.data as Alert[]) ?? []);
    setErrors(e.data ?? []);
    setUpdated(new Date());
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [auto, load]);
  useEffect(() => {
    const ch = supabase.channel(`alerts-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "system_alerts" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const act = async (a: Alert, resolve: boolean) => {
    const { data: s } = await supabase.auth.getSession();
    const note = notes[a.id]?.trim();
    if (a.severity === "critical" && !note && !a.acknowledged_at) { toast.error("Add a note before acknowledging a critical alert."); return; }
    const patch: any = { acknowledged_by: s.session?.user.id, acknowledged_at: a.acknowledged_at ?? new Date().toISOString() };
    if (note) patch.acknowledgement_note = note;
    if (resolve) patch.resolved_at = new Date().toISOString();
    const { error } = await supabase.from("system_alerts").update(patch).eq("id", a.id);
    if (error) toast.error(error.message); else { toast.success(resolve ? "Alert resolved" : "Alert acknowledged"); load(); }
  };

  const statusVariant = (s?: string) => (s === "healthy" ? "default" : s === "degraded" ? "secondary" : "destructive") as any;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Overall status</span>
          <Badge variant={statusVariant(health?.status)}>{health?.status ?? "checking…"}</Badge>
          {updated && <span className="text-xs text-muted-foreground">updated {updated.toLocaleTimeString()}</span>}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm"><Switch checked={auto} onCheckedChange={setAuto} /> Auto-refresh 60s</label>
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {Object.entries(health?.checks ?? {}).map(([k, c]) => (
          <Card key={k}><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground capitalize">{k.replace("_", " ")}</p>
            <p className="font-semibold">{c.ok ? "Available" : "Unavailable"}</p>
            <p className="text-xs text-muted-foreground">{c.latency_ms} ms{c.detail ? ` · ${c.detail}` : ""}</p>
          </CardContent></Card>
        ))}
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active users (30 min)</p><p className="text-2xl font-semibold">{metrics?.active_users_30m ?? "—"}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">DB connections</p><p className="text-2xl font-semibold">{metrics?.db_connections ?? "—"}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Database size</p><p className="text-2xl font-semibold">{metrics?.db_size_mb ?? "—"} MB</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">App errors (24 h)</p><p className="text-2xl font-semibold">{metrics?.client_errors_24h ?? "—"}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">AI function performance (7 days)</CardTitle><CardDescription>Response times and failure rate per function</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Function</TableHead><TableHead>Calls</TableHead><TableHead>Error %</TableHead><TableHead>p50</TableHead><TableHead>p95</TableHead><TableHead>p99</TableHead></TableRow></TableHeader>
            <TableBody>
              {(metrics?.function_perf ?? []).map((r: any) => (
                <TableRow key={r.function_name}><TableCell className="font-medium">{r.function_name}</TableCell><TableCell>{r.total}</TableCell><TableCell>{r.error_rate}%</TableCell><TableCell>{ms(r.p50)}</TableCell><TableCell>{ms(r.p95)}</TableCell><TableCell>{ms(r.p99)}</TableCell></TableRow>
              ))}
              {!metrics?.function_perf?.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No AI calls recorded this week.</TableCell></TableRow>}
            </TableBody>
          </Table>
          <h4 className="text-sm font-medium mt-4 mb-2">By model</h4>
          <Table>
            <TableHeader><TableRow><TableHead>Model</TableHead><TableHead>Calls</TableHead><TableHead>Failure %</TableHead><TableHead>p50</TableHead><TableHead>p95</TableHead></TableRow></TableHeader>
            <TableBody>
              {(metrics?.model_perf ?? []).map((r: any) => (
                <TableRow key={r.model_id}><TableCell className="font-medium">{r.model_id}</TableCell><TableCell>{r.total}</TableCell><TableCell>{r.failure_rate}%</TableCell><TableCell>{ms(r.p50)}</TableCell><TableCell>{ms(r.p95)}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">System alerts</CardTitle><CardDescription>Critical alerts notify every administrator in-app and need a note to acknowledge.</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {alerts.length === 0 && <p className="text-sm text-muted-foreground">No alerts.</p>}
          {alerts.map((a) => (
            <div key={a.id} className="border rounded-md p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={a.severity === "critical" ? "destructive" : a.severity === "warning" ? "secondary" : "outline"}>{a.severity}</Badge>
                <span className="text-sm font-medium">{a.alert_type.replace(/_/g, " ")}</span>
                <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                {a.resolved_at ? <Badge variant="outline">resolved</Badge> : a.acknowledged_at ? <Badge variant="outline">acknowledged</Badge> : null}
              </div>
              <p className="text-sm">{a.message}</p>
              {a.acknowledgement_note && <p className="text-xs text-muted-foreground">Note: {a.acknowledgement_note}</p>}
              {!a.resolved_at && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Textarea rows={1} placeholder="Action taken / note" value={notes[a.id] ?? ""} onChange={(e) => setNotes({ ...notes, [a.id]: e.target.value })} />
                  <div className="flex gap-2">
                    {!a.acknowledged_at && <Button size="sm" variant="outline" onClick={() => act(a, false)}>Acknowledge</Button>}
                    <Button size="sm" onClick={() => act(a, true)}>Resolve</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Recent app errors</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {errors.length === 0 && <p className="text-sm text-muted-foreground">No errors logged.</p>}
          {errors.map((e) => (
            <div key={e.id} className="text-xs border-b py-1"><span className="text-muted-foreground">{new Date(e.created_at).toLocaleString()} · {e.error_type} · {e.url}</span><div className="truncate">{e.message}</div></div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
