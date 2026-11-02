import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { sha256Hex } from "@/lib/aiProvenance";

type Review = { id: string; function_name: string; decision: string; language_of_encounter: string | null; model_id: string | null; model_version_id: string | null; created_at: string; patient_id: string | null; reviewer_role: string | null; override_reason: string | null; modified_fields: any; original_suggestion: any; final_content: any; review_time_ms: number | null };

function group(rows: Review[], key: (r: Review) => string) {
  const m = new Map<string, { total: number; accepted: number; modified: number; rejected: number }>();
  for (const r of rows) {
    const k = key(r) || "unknown";
    const g = m.get(k) ?? { total: 0, accepted: 0, modified: 0, rejected: 0 };
    g.total++; (g as any)[r.decision]++;
    m.set(k, g);
  }
  return [...m.entries()].sort((a, b) => b[1].total - a[1].total);
}

function RateTable({ title, rows }: { title: string; rows: ReturnType<typeof group> }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
        {rows.map(([k, g]) => {
          const pct = Math.round((g.accepted / g.total) * 100);
          return (
            <div key={k} className="text-sm">
              <div className="flex justify-between"><span className="font-medium truncate">{k}</span><span>{pct}% agree · {g.modified} modified · {g.rejected} rejected · n={g.total}</span></div>
              <div className="h-2 rounded bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function ConcordancePanel() {
  const [rows, setRows] = useState<Review[]>([]);
  useEffect(() => {
    supabase.from("ai_reviews").select("*").order("created_at", { ascending: false }).limit(5000).then(({ data }) => setRows((data ?? []) as Review[]));
  }, []);

  const byFn = useMemo(() => group(rows, (r) => r.function_name), [rows]);
  const byLang = useMemo(() => group(rows, (r) => r.language_of_encounter ?? "unknown"), [rows]);
  const byModel = useMemo(() => group(rows, (r) => r.model_id ?? "unknown"), [rows]);
  const byMonth = useMemo(() => group(rows, (r) => r.created_at.slice(0, 7)).sort((a, b) => a[0].localeCompare(b[0])), [rows]);

  const exportCsv = async () => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["review_id", "patient_hash", "function", "decision", "override_reason", "modified_fields", "ai_code", "final_code", "reviewer_role", "language", "model_id", "model_version_id", "review_time_ms", "created_at"];
    const lines = [header.join(",")];
    for (const r of rows) {
      const hash = r.patient_id ? await sha256Hex(`aperta-research:${r.patient_id}`) : "";
      lines.push([r.id, hash, r.function_name, r.decision, r.override_reason, JSON.stringify(r.modified_fields), r.original_suggestion?.code, r.final_content?.code, r.reviewer_role, r.language_of_encounter, r.model_id, r.model_version_id, r.review_time_ms, r.created_at].map(esc).join(","));
    }
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `aperta-ai-reviews-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const accepted = rows.filter((r) => r.decision === "accepted").length;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>AI–clinician concordance</CardTitle>
            <CardDescription>How often clinicians keep, change or reject AI suggestions. Every change requires a written reason.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4 mr-2" />Research CSV</Button>
        </CardHeader>
        <CardContent className="text-sm">
          {rows.length ? <p><strong>{Math.round((accepted / rows.length) * 100)}%</strong> overall agreement across {rows.length} reviews. Patient IDs are one-way hashed in the export.</p> : <p className="text-muted-foreground">No reviews yet — they appear when clinicians approve a formulation after generating AI suggestions.</p>}
        </CardContent>
      </Card>
      <div className="grid md:grid-cols-2 gap-4">
        <RateTable title="By function" rows={byFn} />
        <RateTable title="By language of encounter" rows={byLang} />
        <RateTable title="By model" rows={byModel} />
        <RateTable title="Over time (monthly)" rows={byMonth} />
      </div>
    </div>
  );
}
