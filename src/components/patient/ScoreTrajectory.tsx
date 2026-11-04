import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { normaliseTool, reliableChange } from "@/lib/screening/measurementBasedCare";

type S = { tool_type: string; total_score: number; administered_at: string };

function Sparkline({ values, max }: { values: number[]; max: number }) {
  const w = 120, h = 32;
  const pts = values.map((v, i) => `${values.length === 1 ? w / 2 : (i / (values.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return <svg width={w} height={h} className="text-primary" aria-hidden><polyline points={pts} fill="none" stroke="currentColor" strokeWidth={2} /></svg>;
}

/** PHQ-9 / GAD-7 trajectories with reliable-change status and open deterioration alerts. */
export function ScoreTrajectory({ patientId, screenings }: { patientId: string; screenings: S[] }) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const load = () => supabase.from("system_alerts").select("id, message, created_at").eq("patient_id", patientId)
    .eq("alert_type", "clinical_deterioration").is("acknowledged_at", null).order("created_at", { ascending: false })
    .then(({ data }) => setAlerts(data ?? []));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [patientId]);

  const ack = async (id: string) => {
    const { data } = await supabase.auth.getSession();
    await supabase.from("system_alerts").update({ acknowledged_by: data.session?.user.id, acknowledged_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const tools = [["PHQ9", "PHQ-9", 27], ["GAD7", "GAD-7", 21]] as const;
  const series = tools.map(([key, label, max]) => {
    const vals = screenings.filter((s) => normaliseTool(s.tool_type) === key)
      .sort((a, b) => a.administered_at.localeCompare(b.administered_at)).map((s) => s.total_score);
    return { label, max, vals, rc: reliableChange(key, vals) };
  }).filter((s) => s.vals.length);

  if (!series.length && !alerts.length) return null;
  const tone = { deteriorated: "destructive", improved: "default", no_reliable_change: "outline", insufficient_data: "outline" } as const;
  const text = { deteriorated: "Reliable deterioration", improved: "Reliable improvement", no_reliable_change: "No reliable change", insufficient_data: "Needs 2+ scores" };

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Measurement-based care</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((a) => (
          <div key={a.id} className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <span className="flex-1">{a.message}</span>
            <Button size="sm" variant="outline" onClick={() => ack(a.id)}>Acknowledge</Button>
          </div>
        ))}
        {series.map((s) => (
          <div key={s.label} className="flex flex-wrap items-center gap-3">
            <span className="w-14 text-sm font-medium">{s.label}</span>
            <Sparkline values={s.vals} max={s.max} />
            <span className="text-sm">{s.vals.join(" → ")}</span>
            <Badge variant={tone[s.rc.trend] as any}>{text[s.rc.trend]}{s.rc.delta != null ? ` (${s.rc.delta > 0 ? "+" : ""}${s.rc.delta})` : ""}</Badge>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">Reliable change: PHQ-9 ±5, GAD-7 ±4 between consecutive scores. Deterioration alerts the owning clinician.</p>
      </CardContent>
    </Card>
  );
}
