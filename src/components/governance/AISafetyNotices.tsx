import { useState } from "react";
import { AlertTriangle, Flag, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const INCIDENT_TYPES: Array<[string, string]> = [
  ["hallucination", "Hallucination / made-up content"],
  ["wrong_formulation", "Wrong clinical formulation"],
  ["missed_crisis_cue", "Missed crisis cue"],
  ["injection_attempt", "Instruction-injection attempt"],
  ["output_validation_failure", "Broken or incomplete output"],
  ["unsafe_content", "Unsafe content (e.g. dosage)"],
  ["cultural_misinterpretation", "Cultural misinterpretation"],
  ["translation_error", "Translation error"],
  ["other", "Other"],
];

export interface AISafetyInfo {
  injection_detected?: boolean;
  injection_patterns?: string[];
  cultural_flags?: Array<{ idiom: string; guidance?: string | null; message: string }>;
}

export function AISafetyBanners({ safety }: { safety?: AISafetyInfo | null }) {
  if (!safety) return null;
  return (
    <div className="space-y-2">
      {safety.injection_detected && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Possible instruction-injection text detected.</strong> It was neutralised before processing and logged. Review the source text before relying on this output.
          </AlertDescription>
        </Alert>
      )}
      {(safety.cultural_flags?.length ?? 0) > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs space-y-1">
            <strong>Cultural review required.</strong> This output may rest on a culturally normative expression that should not be pathologised:
            <ul className="list-disc pl-5">
              {safety.cultural_flags!.map((f) => <li key={f.idiom}><span className="font-medium">{f.idiom}</span>{f.guidance ? ` — ${f.guidance}` : ""}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export function FailSafeNotice() {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="text-sm"><strong>AI suggestion unavailable, clinical review required.</strong> The AI output failed safety validation and was not shown. The event has been logged as an incident.</AlertDescription>
    </Alert>
  );
}

interface ReportProps {
  functionName: string;
  patientId?: string | null;
  outputRef?: string | null;
  size?: "sm" | "default";
}

export function ReportAIIssueButton({ functionName, patientId, outputRef, size = "sm" }: ReportProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("hallucination");
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user || !description.trim()) return;
    setSaving(true);
    const { error } = await (supabase as any).from("ai_incidents").insert({
      reported_by: user.id,
      source: "clinician",
      incident_type: type,
      severity,
      function_name: functionName,
      description: description.trim().slice(0, 4000),
      linked_ai_output_id: outputRef ?? null,
      linked_patient_id: patientId ?? null,
    });
    setSaving(false);
    if (error) return toast({ title: "Report not saved", description: error.message, variant: "destructive" });
    toast({ title: "AI issue reported", description: "The safety team will review it." });
    setOpen(false);
    setDescription("");
  };

  return (
    <>
      <Button variant="ghost" size={size} className="text-muted-foreground" onClick={() => setOpen(true)}>
        <Flag className="h-4 w-4 mr-1" />Report AI issue
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report an AI issue</DialogTitle>
            <DialogDescription>Reports go to the AI safety review queue. Do not include names or identifying details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Issue type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INCIDENT_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["low", "medium", "high", "critical"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>What happened?</Label>
              <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={4000} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !description.trim()}>Submit report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
