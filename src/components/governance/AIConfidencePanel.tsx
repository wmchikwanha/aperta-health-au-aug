import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const OVERRIDE_REASONS = [
  "AI missed cultural context",
  "AI incorrect",
  "Patient preference",
  "Local guidelines differ",
  "Translation issue",
  "Other",
] as const;

export function normaliseConfidence(value: unknown): number | null {
  if (typeof value !== "number" || !isFinite(value)) return null;
  return Math.max(0, Math.min(1, value > 1 ? value / 100 : value));
}

export function confidenceBand(value: number | null): "High" | "Medium" | "Low" | "Unknown" {
  if (value === null) return "Unknown";
  if (value > 0.8) return "High";
  if (value >= 0.5) return "Medium";
  return "Low";
}

const BAND_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  High: "default", Medium: "secondary", Low: "destructive", Unknown: "outline",
};

interface Props {
  functionName: "suggest-diagnosis" | "generate-treatment-plan";
  confidence: unknown;
  provenance?: { model_id?: string; prompt_template_version?: string; model_version_id?: string; prompt_template_id?: string } | null;
  patientId?: string | null;
  language?: string | null;
}

export function AIConfidencePanel({ functionName, confidence, provenance, patientId, language }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const value = normaliseConfidence(confidence);
  const band = confidenceBand(value);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  const submit = async () => {
    if (!user || !reason) return;
    const { error } = await supabase.from("ai_confidence_log" as any).insert({
      function_name: functionName,
      patient_id: patientId ?? null,
      raw_confidence: value,
      clinician_override: true,
      clinician_override_reason: reason,
      override_note: note.slice(0, 1000) || null,
      language_of_input: language ?? "unknown",
      model_version_id: provenance?.model_version_id ?? null,
      prompt_template_id: provenance?.prompt_template_id ?? null,
      clinician_id: user.id,
    });
    if (error) {
      toast({ title: "Override not recorded", description: error.message, variant: "destructive" });
      return;
    }
    setSaved(true);
    setOpen(false);
    toast({ title: "Override recorded", description: "Thank you — this feeds AI safety monitoring." });
  };

  return (
    <div className="rounded-md border p-3 space-y-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">AI confidence:</span>
        <Badge variant={BAND_VARIANT[band]}>
          {band}{value !== null ? ` (${Math.round(value * 100)}%)` : ""}
        </Badge>
        {provenance?.model_id && (
          <span className="text-muted-foreground">
            Model {provenance.model_id} · prompt v{provenance.prompt_template_version}
          </span>
        )}
        <Button size="sm" variant="ghost" className="ml-auto h-7" disabled={saved} onClick={() => setOpen(o => !o)}>
          {saved ? "Override recorded" : "Modify / reject suggestion"}
        </Button>
      </div>
      {open && (
        <div className="space-y-2">
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="h-8"><SelectValue placeholder="Reason for override" /></SelectTrigger>
            <SelectContent>
              {OVERRIDE_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note (no identifying details)" rows={2} />
          <Button size="sm" onClick={submit} disabled={!reason}>Record override</Button>
        </div>
      )}
    </div>
  );
}
