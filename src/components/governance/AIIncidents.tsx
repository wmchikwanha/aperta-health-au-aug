import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw } from "lucide-react";
import { INCIDENT_TYPES } from "./AISafetyNotices";

const db = supabase as any;
const SEV_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = { critical: "destructive", high: "destructive", medium: "secondary", low: "outline" };
const NEXT: Record<string, string[]> = { open: ["under_review", "closed"], under_review: ["capa", "closed"], capa: ["closed"], closed: [] };
const LABEL: Record<string, string> = { open: "Open", under_review: "Under review", capa: "CAPA", closed: "Closed" };

export function AIIncidents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("active");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    let q = db.from("ai_incidents").select("*").order("created_at", { ascending: false }).limit(200);
    if (severity !== "all") q = q.eq("severity", severity);
    if (status === "active") q = q.neq("status", "closed"); else if (status !== "all") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) toast({ title: "Could not load incidents", description: error.message, variant: "destructive" });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [severity, status]);

  const move = async (row: any, next: string) => {
    const capa = (notes[row.id] ?? row.capa_notes ?? "").trim();
    if (next === "capa" && !capa) return toast({ title: "CAPA notes required", description: "Describe the corrective and preventive action first.", variant: "destructive" });
    const { error } = await db.from("ai_incidents").update({ status: next, reviewer_id: user?.id, capa_notes: capa || null, closed_at: next === "closed" ? new Date().toISOString() : null }).eq("id", row.id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    await db.from("audit_events").insert({ actor_id: user?.id, actor_role: "admin", action: "ai_incident_status_changed", outcome: "success", resource_type: "ai_incident", resource_id: row.id, description: `${row.status} → ${next}`, source: "admin_dashboard" });
    load();
  };

  const counts = rows.reduce((a: Record<string, number>, r) => ({ ...a, [r.severity]: (a[r.severity] ?? 0) + 1 }), {});

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>AI Safety Incidents</CardTitle>
          <CardDescription>Clinician reports and automatic detections (injection attempts, validation failures, blocked dosages).</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{["all", "critical", "high", "medium", "low"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s === "all" ? "All severities" : s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Not closed</SelectItem>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.keys(LABEL).map((s) => <SelectItem key={s} value={s}>{LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-1 text-xs">{["critical", "high", "medium", "low"].map((s) => counts[s] ? <Badge key={s} variant={SEV_VARIANT[s]}>{counts[s]} {s}</Badge> : null)}</div>
        </div>
        {rows.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No incidents match these filters.</p>}
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="border rounded-md p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant={SEV_VARIANT[r.severity]} className="capitalize">{r.severity}</Badge>
                <Badge variant="outline">{INCIDENT_TYPES.find(([v]) => v === r.incident_type)?.[1] ?? r.incident_type}</Badge>
                <Badge variant="secondary">{LABEL[r.status]}</Badge>
                {r.function_name && <span className="font-mono text-muted-foreground">{r.function_name}</span>}
                <span className="text-muted-foreground">{r.source === "system" ? "Automatic" : "Clinician report"} · {new Date(r.created_at).toLocaleString("en-AU")}</span>
              </div>
              <p className="text-sm">{r.description}</p>
              {r.capa_notes && <p className="text-xs bg-muted rounded p-2"><strong>CAPA:</strong> {r.capa_notes}</p>}
              {NEXT[r.status].length > 0 && (
                <div className="space-y-2">
                  <Textarea rows={2} placeholder="CAPA / review notes" value={notes[r.id] ?? r.capa_notes ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
                  <div className="flex gap-2">{NEXT[r.status].map((n) => <Button key={n} size="sm" variant={n === "closed" ? "outline" : "default"} onClick={() => move(r, n)}>Move to {LABEL[n]}</Button>)}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
