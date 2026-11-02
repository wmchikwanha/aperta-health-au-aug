import { useState } from "react";
import { ChevronDown, Info, AlertTriangle, Languages } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface ReasoningTraceData {
  primary?: { code?: string; name?: string; codes?: Record<string, string | null>; confidence?: number | null; evidence?: Array<{ source: string; quote_or_score?: string; quote?: string; relevance?: string }>; limitations?: string | null };
  differential_considerations?: Array<{ diagnosis: string; reason_deprioritised: string }>;
  limitations?: string | null;
  conflicting_signals?: boolean;
  conflict_description?: string | null;
  insufficient_information?: boolean;
  idioms_considered?: Array<{ id: string; term: string; language: string; gloss: string; guidance_type: string; guidance?: string | null }>;
  provenance?: Record<string, string>;
  generated_at?: string;
}

/** Uncertainty banners (shown outside the collapsible so they are never missed). */
export function UncertaintyBanners({ trace }: { trace?: ReasoningTraceData | null }) {
  if (!trace) return null;
  const c = trace.primary?.confidence;
  return (
    <div className="space-y-2">
      {trace.insufficient_information && (
        <Alert><Info className="h-4 w-4" /><AlertDescription className="text-sm font-medium">ℹ️ INSUFFICIENT INFORMATION — AI could not generate a suggestion. Proceed with standard assessment.</AlertDescription></Alert>
      )}
      {!trace.insufficient_information && typeof c === "number" && c < 0.5 && (
        <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription className="text-sm font-medium">⚠️ LOW CONFIDENCE — The AI is uncertain. Exercise additional clinical judgement.</AlertDescription></Alert>
      )}
      {trace.conflicting_signals && (
        <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription className="text-sm"><span className="font-medium">⚠️ CONFLICTING SIGNALS — Screening scores and narrative suggest different considerations.</span>{trace.conflict_description ? ` ${trace.conflict_description}` : ""}</AlertDescription></Alert>
      )}
    </div>
  );
}

export function IdiomAttribution({ trace }: { trace?: ReasoningTraceData | null }) {
  if (!trace?.idioms_considered?.length) return null;
  return (
    <div className="space-y-2">
      {trace.idioms_considered.map((i) => (
        <div key={i.id} className="rounded-md border border-border bg-muted/40 p-3 text-sm">
          <p className="flex items-start gap-2"><Languages className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <span>This suggestion considers the idiom '<strong>{i.term}</strong>' ({i.language}), which means '{i.gloss}'. Clinical guidance: <Badge variant={i.guidance_type === "crisis-probe" ? "destructive" : "secondary"}>{i.guidance_type}</Badge>{i.guidance ? ` ${i.guidance}` : ""}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1 ml-6">Cultural knowledge base entry: <code>{i.id}</code></p>
        </div>
      ))}
    </div>
  );
}

const SOURCE_LABEL: Record<string, string> = { narrative: "Narrative", screening: "Screening score", cultural_idiom: "Cultural idiom" };

export function ReasoningTrace({ trace, defaultOpen = false }: { trace?: ReasoningTraceData | null; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!trace) return null;
  const p = trace.primary;
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border border-border">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between">How was this suggested?<ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} /></Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 space-y-3 text-sm">
        {p?.codes && (
          <div className="flex flex-wrap gap-2">
            {p.codes.icd10am && <Badge variant="outline">ICD-10-AM {p.codes.icd10am}</Badge>}
            {p.codes.icd11 && <Badge variant="outline">ICD-11 {p.codes.icd11}</Badge>}
            {p.codes.dsm5tr && <Badge variant="outline">DSM-5-TR {p.codes.dsm5tr}</Badge>}
            {typeof p.confidence === "number" && <Badge variant="secondary">{Math.round(p.confidence * 100)}% confidence</Badge>}
          </div>
        )}
        <div>
          <p className="font-medium mb-1">Evidence used</p>
          {p?.evidence?.length ? (
            <ul className="space-y-1">
              {p.evidence.map((e, i) => (
                <li key={i} className="flex gap-2"><Badge variant="outline" className="shrink-0">{SOURCE_LABEL[e.source] ?? e.source}</Badge>
                  <span><span className="italic">"{e.quote_or_score ?? e.quote}"</span>{e.relevance ? <span className="text-muted-foreground"> — {e.relevance}</span> : null}</span></li>
              ))}
            </ul>
          ) : <p className="text-muted-foreground">No itemised evidence returned.</p>}
        </div>
        {!!trace.differential_considerations?.length && (
          <div>
            <p className="font-medium mb-1">Considered but ranked lower</p>
            <ul className="list-disc list-inside space-y-1">{trace.differential_considerations.map((d, i) => <li key={i}><strong>{d.diagnosis}</strong>: {d.reason_deprioritised}</li>)}</ul>
          </div>
        )}
        {(p?.limitations || trace.limitations) && (
          <div><p className="font-medium mb-1">Limitations</p><p className="text-muted-foreground">{p?.limitations || trace.limitations}</p></div>
        )}
        <IdiomAttribution trace={trace} />
        {trace.provenance && (
          <p className="text-xs text-muted-foreground">Model {trace.provenance.model_id} ({trace.provenance.model_version}) · prompt v{trace.provenance.prompt_template_version}{trace.generated_at ? ` · ${new Date(trace.generated_at).toLocaleString()}` : ""}</p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
