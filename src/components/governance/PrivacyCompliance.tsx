import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const PRIVACY_DISCLOSURE =
  "Narrative text is machine-scrubbed of direct identifiers before transmission to the AI provider. Residual risk of undetected identifiers remains. Data is processed in the Sydney (AU) region; AI inference occurs via Google Gemini with a data-processing addendum.";

const statusVariant = (s: string) => (s === "compliant" || s === "signed" ? "default" : s === "gap" ? "destructive" : "secondary");

export function PrivacyCompliance() {
  const [apps, setApps] = useState<any[]>([]);
  const [dpr, setDpr] = useState<any[]>([]);
  const [ret, setRet] = useState<any[]>([]);
  const [pii, setPii] = useState<{ calls: number; spans: number }>({ calls: 0, spans: 0 });

  const load = async () => {
    const [a, d, r, p] = await Promise.all([
      supabase.from("privacy_compliance").select("*"),
      supabase.from("data_processing_records").select("*").order("processor"),
      supabase.from("data_retention_policies").select("*").order("data_type"),
      supabase.from("ai_inference_events").select("pii_spans_detected").gt("pii_spans_detected", 0).limit(1000),
    ]);
    setApps((a.data ?? []).sort((x, y) => Number(x.app_principle.slice(3)) - Number(y.app_principle.slice(3))));
    setDpr(d.data ?? []); setRet(r.data ?? []);
    setPii({ calls: p.data?.length ?? 0, spans: (p.data ?? []).reduce((n, e: any) => n + e.pii_spans_detected, 0) });
  };
  useEffect(() => { load(); }, []);

  const update = async (table: "privacy_compliance" | "data_processing_records", id: string, field: string, value: string) => {
    const { data: u } = await supabase.auth.getUser();
    const patch: any = { [field]: value, last_reviewed: new Date().toISOString() };
    if (table === "privacy_compliance") patch.reviewed_by = u.user?.id;
    const { error } = await supabase.from(table).update(patch).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Updated"); load(); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Privacy disclosure</CardTitle><CardDescription>Shown to staff and partners</CardDescription></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>{PRIVACY_DISCLOSURE}</p>
          <p className="text-muted-foreground">Identifier scrubbing: {pii.spans} identifiers removed across {pii.calls} AI calls (phones, Medicare, TFN, emails, addresses, dates of birth, Tazkira / Iraqi / NRC / NIC / Iranian / Sudanese IDs, introduced names).</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Australian Privacy Principles (Privacy Act 1988, amended 2024)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {apps.map((a) => (
            <div key={a.id} className="flex flex-col md:flex-row md:items-center gap-2 border-b border-border pb-2">
              <span className="font-mono text-sm w-14">{a.app_principle}</span>
              <div className="flex-1 text-sm"><p className="font-medium">{a.title}</p><p className="text-muted-foreground text-xs">{a.evidence_reference}</p></div>
              <Select value={a.compliance_status} onValueChange={(v) => update("privacy_compliance", a.id, "compliance_status", v)}>
                <SelectTrigger className="w-40"><Badge variant={statusVariant(a.compliance_status)}>{a.compliance_status}</Badge></SelectTrigger>
                <SelectContent>{["compliant", "partial", "gap", "not_applicable"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sub-processors and cross-border transfer (APP8)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {dpr.map((d) => (
            <div key={d.id} className="flex flex-col md:flex-row md:items-center gap-2 border-b border-border pb-2 text-sm">
              <div className="flex-1"><p className="font-medium">{d.processor} <span className="text-muted-foreground font-normal">— {d.location}</span></p>
                <p className="text-xs text-muted-foreground">{d.purpose} · {d.data_types?.join(", ")} · {d.legal_basis}</p></div>
              <Select value={d.dpa_status} onValueChange={(v) => update("data_processing_records", d.id, "dpa_status", v)}>
                <SelectTrigger className="w-40"><Badge variant={statusVariant(d.dpa_status)}>DPA: {d.dpa_status}</Badge></SelectTrigger>
                <SelectContent>{["signed", "pending", "not_required"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Data retention (runs daily 03:00 UTC)</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {ret.map((r) => (
            <div key={r.id} className="flex flex-wrap justify-between gap-2 border-b border-border pb-2">
              <span className="font-medium">{r.data_type}</span>
              <span>{Math.round(r.retention_period_days / 365 * 10) / 10 >= 1 ? `${Math.round(r.retention_period_days / 365)} years` : `${r.retention_period_days} days`} → {r.auto_action}</span>
              <span className="text-xs text-muted-foreground w-full">{r.legal_basis} · last run: {r.last_run_at ? `${new Date(r.last_run_at).toLocaleString()} (${r.last_run_affected} records)` : "pending first run"}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
