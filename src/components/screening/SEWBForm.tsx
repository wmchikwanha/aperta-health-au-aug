import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RULES_ENGINE_VERSION_ID, scoreSEWB } from "@/lib/clinical-rules-engine";

interface Props { patientId: string; onComplete: () => void; }

const DOMAINS = [
  ["body", "Connection to body and physical wellbeing"],
  ["mind_emotions", "Connection to mind and emotions"],
  ["family_kinship", "Connection to family and kinship"],
  ["community", "Connection to community"],
  ["culture", "Connection to culture"],
  ["country", "Connection to Country"],
  ["spirituality", "Connection to spirituality"],
  ["ancestors", "Connection to ancestors"],
] as const;

const OPTIONS = [
  { value: "0", label: "Not connected" }, { value: "1", label: "A little" },
  { value: "2", label: "Sometimes" }, { value: "3", label: "Mostly" }, { value: "4", label: "Strongly connected" },
];

export function SEWBForm({ patientId, onComplete }: Props) {
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const complete = DOMAINS.every(([domain]) => responses[domain] !== undefined);
  const result = useMemo(() => complete ? scoreSEWB(responses) : null, [complete, responses]);

  const handleSubmit = async () => {
    if (!result) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("screening_assessments").insert({
        patient_id: patientId, user_id: user.id, tool_type: "SEWB", responses,
        total_score: result.total, severity_level: result.overallWellbeing,
        interpretation: result.concerningDomains.length ? `Explore supports for: ${result.concerningDomains.join(", ")}. Do not pathologise cultural, spiritual, kinship or grief experiences.` : "Connections are reported as broadly strong. Continue culturally safe discussion.",
        notes: notes || null, rules_version_id: RULES_ENGINE_VERSION_ID,
      });
      if (error) throw error;
      toast({ title: "SEWB Saved", description: `Wellbeing profile: ${result.overallWellbeing}. Clinician review required.` });
      onComplete();
    } catch (error) {
      toast({ title: "SEWB not saved", description: error instanceof Error ? error.message : "Please retry.", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Social and Emotional Wellbeing</CardTitle>
        <CardDescription>A culturally safe, strengths-based conversation across eight interconnected domains. This is not a diagnostic scale.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {DOMAINS.map(([domain, label], index) => (
          <div key={domain} className="space-y-3 border-b pb-4">
            <Label>{index + 1}. {label}</Label>
            <RadioGroup value={responses[domain]?.toString()} onValueChange={value => setResponses(previous => ({ ...previous, [domain]: Number(value) }))}>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {OPTIONS.map(option => <div key={option.value} className="flex items-center gap-2"><RadioGroupItem id={`sewb-${domain}-${option.value}`} value={option.value} /><Label htmlFor={`sewb-${domain}-${option.value}`} className="cursor-pointer font-normal">{option.label}</Label></div>)}
              </div>
            </RadioGroup>
          </div>
        ))}
        {result && <div className="rounded-md border bg-muted p-4"><p className="font-semibold">Live profile: {result.total}/32 — {result.overallWellbeing}</p><p className="text-sm text-muted-foreground">Explore low-connection domains collaboratively; involve an Aboriginal Health Worker when the person agrees.</p></div>}
        <div className="space-y-2"><Label htmlFor="sewb-notes">Culturally informed notes</Label><Textarea id="sewb-notes" value={notes} onChange={event => setNotes(event.target.value)} rows={4} /></div>
        <Button className="w-full" disabled={!complete || submitting} onClick={handleSubmit}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save SEWB Profile</Button>
      </CardContent>
    </Card>
  );
}