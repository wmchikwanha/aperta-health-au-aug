import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";

const Stat = ({ label, value, hint }: { label: string; value: any; hint?: string }) => (
  <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-semibold">{value ?? "—"}</p>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</CardContent></Card>
);

// Cell intensity uses the primary/destructive tokens with opacity so it themes correctly.
function Cell({ value, bad }: { value: number | null; bad: boolean }) {
  if (value == null) return <td className="p-2 text-center text-xs text-muted-foreground">—</td>;
  const alpha = Math.min(0.15 + value / 100, 0.9);
  return (
    <td className="p-2 text-center text-xs font-medium" style={{ backgroundColor: `hsl(var(${bad ? "--destructive" : "--primary"}) / ${alpha})` }}>
      {value.toFixed(0)}%
    </td>
  );
}

export function SafetyMonitor() {
  const [days, setDays] = useState("30");
  const [m, setM] = useState<any>(null);

  useEffect(() => {
    supabase.rpc("safety_monitor_metrics", { _days: Number(days) }).then(({ data }) => setM(data));
  }, [days]);

  const langRows = useMemo(() => {
    const conf = new Map<string, any>((m?.confidence_by_lang ?? []).map((r: any) => [r.language, r]));
    const rev = new Map<string, { total: number; over: number }>();
    for (const r of m?.review_by_fn_lang ?? []) {
      const g = rev.get(r.language) ?? { total: 0, over: 0 };
      g.total += Number(r.total); g.over += Number(r.overridden); rev.set(r.language, g);
    }
    const codes = new Set<string>([...SUPPORTED_LANGUAGES.map((l: any) => l.code), ...conf.keys(), ...rev.keys()]);
    return [...codes].map((code) => {
      const lang = SUPPORTED_LANGUAGES.find((l: any) => l.code === code) as any;
      const c = conf.get(code); const r = rev.get(code);
      return {
        code, name: lang?.name ?? code,
        confidence: c?.avg_confidence != null ? Number(c.avg_confidence) * 100 : null,
        override: r?.total ? (r.over / r.total) * 100 : c?.override_rate != null ? Number(c.override_rate) : null,
        n: (r?.total ?? 0) + Number(c?.total ?? 0),
      };
    }).sort((a, b) => b.n - a.n);
  }, [m]);

  const tta = m?.time_to_approve ?? {};
  const totalReviews = (m?.review_by_fn_lang ?? []).reduce((s: number, r: any) => s + Number(r.total), 0);
  const accepted = (m?.review_by_fn_lang ?? []).reduce((s: number, r: any) => s + Number(r.accepted), 0);
  const flagged = langRows.filter((r) => r.n >= 5 && ((r.override ?? 0) > 40 || (r.confidence ?? 100) < 60));

  const digest = [
    `Aperta safety digest — last ${days} days (${new Date().toLocaleDateString()})`,
    `AI reviews: ${totalReviews}, agreement ${totalReviews ? Math.round((accepted / totalReviews) * 100) : 0}%`,
    `Open crisis interventions: ${m?.crisis?.open ?? 0}; closed: ${m?.crisis?.closed ?? 0}`,
    `Open critical alerts: ${m?.alerts?.critical_open ?? 0}; warnings: ${m?.alerts?.warning_open ?? 0}`,
    `Referral SLA breaches: ${m?.referral_sla_breaches ?? 0}`,
    `Identifier scrubbing triggered on ${m?.scrub_rate ?? 0}% of AI inputs; injection text on ${m?.injection_rate ?? 0}%`,
    `Approvals under 10 seconds (automation-bias signal): ${tta.under_10s ?? 0}`,
    flagged.length ? `Languages needing review: ${flagged.map((f) => f.name).join(", ")}` : "No language flagged for drift.",
  ].join("\n");

  const download = () => {
    const blob = new Blob([digest], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `aperta-safety-digest-${new Date().toISOString().slice(0, 10)}.txt`; a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">Clinical safety oversight across functions, languages and pathways.</p>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="7">Last 7 days</SelectItem><SelectItem value="30">Last 30 days</SelectItem><SelectItem value="90">Last 90 days</SelectItem></SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Stat label="AI agreement rate" value={totalReviews ? `${Math.round((accepted / totalReviews) * 100)}%` : "—"} hint={`${totalReviews} reviews`} />
        <Stat label="Open crisis interventions" value={m?.crisis?.open} hint={`${m?.crisis?.closed ?? 0} closed`} />
        <Stat label="Open critical alerts" value={m?.alerts?.critical_open} hint={`${m?.alerts?.unacknowledged ?? 0} unacknowledged`} />
        <Stat label="Referral SLA breaches" value={m?.referral_sla_breaches} hint="pending > 24 h" />
        <Stat label="Identifier scrubbing rate" value={m?.scrub_rate != null ? `${m.scrub_rate}%` : "—"} />
        <Stat label="Injection text rate" value={m?.injection_rate != null ? `${m.injection_rate}%` : "—"} />
        <Stat label="Approvals < 10 s" value={tta.under_10s} hint="possible over-reliance" />
        <Stat label="Languages flagged" value={flagged.length} />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Language performance heatmap</CardTitle><CardDescription>Average AI confidence and clinician override rate per language. Flagged when override &gt; 40% or confidence &lt; 60% (n ≥ 5).</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0.5">
            <thead><tr className="text-xs text-muted-foreground"><th className="text-left p-2">Language</th><th className="p-2">Confidence</th><th className="p-2">Override</th><th className="p-2">n</th></tr></thead>
            <tbody>
              {langRows.map((r) => (
                <tr key={r.code}>
                  <td className="p-2">{r.name}{flagged.includes(r) && <span className="ml-1 text-destructive">●</span>}</td>
                  <Cell value={r.confidence} bad={false} />
                  <Cell value={r.override} bad />
                  <td className="p-2 text-center text-xs text-muted-foreground">{r.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Approval / override by function and language</CardTitle></CardHeader>
          <CardContent className="space-y-1 max-h-80 overflow-y-auto">
            {(m?.review_by_fn_lang ?? []).length === 0 && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
            {(m?.review_by_fn_lang ?? []).map((r: any) => (
              <div key={r.function_name + r.language} className="flex justify-between text-sm border-b py-1">
                <span>{r.function_name} · {r.language}</span>
                <span className="text-muted-foreground">{r.accepted}/{r.total} approved · median {r.median_review_ms ? Math.round(r.median_review_ms / 1000) + "s" : "—"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Time to approve</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[["Under 1 min", tta.lt1m], ["1–5 min", tta.m1_5], ["5–30 min", tta.m5_30], ["Over 30 min", tta.gt30m]].map(([label, v]) => {
              const total = (tta.lt1m ?? 0) + (tta.m1_5 ?? 0) + (tta.m5_30 ?? 0) + (tta.gt30m ?? 0);
              const pct = total ? ((v as number) / total) * 100 : 0;
              return (
                <div key={label as string} className="text-sm">
                  <div className="flex justify-between"><span>{label}</span><span>{v ?? 0}</span></div>
                  <div className="h-2 rounded bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-base">Weekly safety digest</CardTitle><Button size="sm" variant="outline" onClick={download}>Download</Button></CardHeader>
        <CardContent><pre className="text-xs whitespace-pre-wrap">{digest}</pre></CardContent>
      </Card>
    </div>
  );
}
