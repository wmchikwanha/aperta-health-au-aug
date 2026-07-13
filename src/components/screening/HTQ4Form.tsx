import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { scoreHTQ4 } from "@/lib/screening/refugeeScreening";
import { Loader2 } from "lucide-react";

interface Props { patientId: string; onComplete: () => void; }

const QUESTIONS = [
  "Recurrent thoughts or memories of the most hurtful or terrifying events",
  "Feeling as though the event is happening again",
  "Recurrent nightmares",
  "Feeling detached or withdrawn from people",
  "Unable to feel emotions",
  "Feeling jumpy, easily startled",
  "Difficulty concentrating",
  "Trouble sleeping",
  "Feeling on guard",
  "Feeling irritable or having outbursts of anger",
  "Avoiding activities that remind you of the traumatic event",
  "Inability to remember parts of the most traumatic events",
  "Less interest in daily activities",
  "Feeling as if you don't have a future",
  "Avoiding thoughts or feelings associated with the traumatic events",
  "Sudden emotional or physical reactions when reminded of the events",
];

const OPTIONS = [
  { value: "1", label: "Not at all" },
  { value: "2", label: "A little" },
  { value: "3", label: "Quite a bit" },
  { value: "4", label: "Extremely" },
];

export const HTQ4Form = ({ patientId, onComplete }: Props) => {
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const isComplete = Object.keys(responses).length === QUESTIONS.length;

  const handleSubmit = async () => {
    if (!isComplete) {
      toast({ title: "Incomplete", description: "Please answer all items.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const arr = QUESTIONS.map((_, i) => responses[i]);
      const result = scoreHTQ4(arr);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("screening_assessments").insert({
        patient_id: patientId,
        user_id: user.id,
        tool_type: "HTQ4",
        responses: arr,
        total_score: result.totalScore,
        severity_level: result.severityLevel,
        interpretation: result.interpretation,
        notes: notes || null,
      });
      if (error) throw error;
      toast({
        title: "HTQ-IV Saved",
        description: `Mean: ${result.totalScore} (${result.severityLevel})`,
        variant: result.alerts ? "destructive" : "default",
      });
      onComplete();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e.message ?? "Failed to save", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>HTQ-IV: Harvard Trauma Questionnaire (Part IV)</CardTitle>
        <CardDescription>
          Trauma symptom screener validated across refugee populations. Rate how much each symptom has bothered you in the past week.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {QUESTIONS.map((q, i) => (
          <div key={i} className="space-y-3">
            <Label className="text-sm font-medium">{i + 1}. {q}</Label>
            <RadioGroup
              value={responses[i]?.toString()}
              onValueChange={(v) => setResponses(p => ({ ...p, [i]: parseInt(v) }))}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {OPTIONS.map(o => (
                  <div key={o.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={o.value} id={`htq-${i}-${o.value}`} />
                    <Label htmlFor={`htq-${i}-${o.value}`} className="text-xs cursor-pointer font-normal">
                      {o.label}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>
        ))}
        <div className="space-y-2 pt-2">
          <Label htmlFor="notes">Clinical Notes (Optional)</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
        <Button onClick={handleSubmit} disabled={!isComplete || submitting} className="w-full">
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Assessment"}
        </Button>
      </CardContent>
    </Card>
  );
};
