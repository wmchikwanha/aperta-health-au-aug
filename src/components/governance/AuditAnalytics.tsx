import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";

type Ev = { id: string; recorded_at: string; actor_id: string; actor_role: string; action: string; outcome: string; resource_type: string; resource_id: string | null; description: string | null };

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export function AuditAnalytics() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const [f, setF] = useState({ actor: "", action: "", resource: "", outcome: "", from: monthAgo, to: today });
  const [rows, setRows] = useState<Ev[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("audit_events").select("id, recorded_at, actor_id, actor_role, action, outcome, resource_type, resource_id, description")
      .gte("recorded_at", `${f.from}T00:00:00Z`).lte("recorded_at", `${f.to}T23:59:59Z`)
      .order("recorded_at", { ascending: false }).limit(2000);
    if (f.action) q = q.ilike("action", `%${f.action}%`);
    if (f.resource) q = q.ilike("resource_type", `%${f.resource}%`);
    if (f.outcome) q = q.eq("outcome", f.outcome);
    const { data } = await q;
    const list = (data as Ev[]) ?? [];
    const ids = [...new Set(list.map((r) => r.actor_id))];
    if (ids.length) {
      const { data: p } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      setNames(Object.fromEntries((p ?? []).map((x) => [x.id, x.full_name])));
    }
    setRows(list);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const filtered = useMemo(() => {
    const a = f.actor.toLowerCase();
    return a ? rows.filter((r) => (names[r.actor_id] ?? r.actor_id).toLowerCase().includes(a) || r.actor_role.toLowerCase().includes(a)) : rows;
  }, [rows, f.actor, names]);

  const count = (key: (r: Ev) => string) => {
    const m = new Map<string, number>();
    filtered.forEach((r) => m.set(key(r), (m.get(key(r)) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const byUser = count((r) => names[r.actor_id] ?? r.actor_role);
  const byDay = count((r) => r.recorded_at.slice(0, 10)).sort((a, b) => a[0].localeCompare(b[0]));
  const referrals = filtered.filter((r) => /referr/i.test(r.action) || /referr/i.test(r.resource_type)).length;
  const crises = filtered.filter((r) => /crisis/i.test(r.action) || /crisis/i.test(r.resource_type)).length;
  const maxDay = Math.max(1, ...byDay.map((d) => d[1]));

  const exportCsv = () => {
    const head = ["recorded_at", "actor", "actor_role", "action", "resource_type", "resource_id", "outcome", "description"];
    const lines = filtered.map((r) => [r.recorded_at, names[r.actor_id] ?? r.actor_id, r.actor_role, r.action, r.resource_type, r.resource_id, r.outcome, r.description].map(csvCell).join(","));
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `aperta-audit-${f.from}-to-${f.to}.csv`; a.click();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Filter audit events</CardTitle></CardHeader>
        <CardContent className="grid gap-2 grid-cols-2 md:grid-cols-6">
          <Input placeholder="Actor or role" value={f.actor} onChange={(e) => setF({ ...f, actor: e.target.value })} />
          <Input placeholder="Action" value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })} />
          <Input placeholder="Resource type" value={f.resource} onChange={(e) => setF({ ...f, resource: e.target.value })} />
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={f.outcome} onChange={(e) => setF({ ...f, outcome: e.target.value })}>
            <option value="">Any outcome</option><option value="success">success</option><option value="failure">failure</option><option value="flagged">flagged</option><option value="suppressed">suppressed</option>
          </select>
          <Input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
          <Input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
          <div className="col-span-2 md:col-span-6 flex gap-2">
            <Button size="sm" onClick={load} disabled={loading}>{loading ? "Loading…" : "Apply"}</Button>
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!filtered.length}><Download className="h-4 w-4 mr-1" />Export CSV ({filtered.length})</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Events</p><p className="text-2xl font-semibold">{filtered.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Referral events</p><p className="text-2xl font-semibold">{referrals}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Crisis events</p><p className="text-2xl font-semibold">{crises}</p></CardContent></Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Activity over time</CardTitle></CardHeader>
          <CardContent className="flex items-end gap-1 h-32">
            {byDay.map(([d, n]) => <div key={d} title={`${d}: ${n}`} className="flex-1 bg-primary rounded-t" style={{ height: `${(n / maxDay) * 100}%` }} />)}
            {!byDay.length && <p className="text-sm text-muted-foreground">No events.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Activity by user</CardTitle></CardHeader>
          <CardContent className="space-y-1 max-h-32 overflow-y-auto">
            {byUser.slice(0, 15).map(([u, n]) => <div key={u} className="flex justify-between text-sm"><span className="truncate">{u}</span><span>{n}</span></div>)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Events</CardTitle><CardDescription>Showing up to 200 of the filtered events; export includes all.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Resource</TableHead><TableHead>Outcome</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.slice(0, 200).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs whitespace-nowrap">{new Date(r.recorded_at).toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{names[r.actor_id] ?? r.actor_role}</TableCell>
                  <TableCell className="text-sm">{r.action.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.resource_type}</TableCell>
                  <TableCell><Badge variant={r.outcome === "success" ? "default" : "secondary"}>{r.outcome}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
