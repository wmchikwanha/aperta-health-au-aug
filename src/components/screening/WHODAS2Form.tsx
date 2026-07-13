import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { scoreWHODAS2 } from "@/lib/screening/refugeeScreening";
import { Loader2 } from "lucide-react";

interface Props { patientId: string; onComplete: () => void; }

const QUESTIONS = [
  "Standing for long periods (about 30 minutes)",
  "Taking care of your household responsibilities",
  "Learning a new task (e.g. learning how to get to a new place)",
  "How much of a problem did you have joining in community activities?",
  "How much have you been emotionally affected by your health problems?",
  "Concentrating on doing something for ten minutes",
  "Walking a long distance (about 1 km)",
  "Washing your whole body",
  "Getting dressed",
  "Dealing with people you do not know",
  "Maintaining a friendship",
  "Your day-to-day work / school",
];

const OPTIONS = [
  { value: "0", label: "None" },
  { value: "1", label: "Mild" },
  { value: "2", label: "Moderate" },
  { value: "3", label: "Severe" },
  { value: "4", label: "Extreme / Cannot do" },
];

export const WHODAS2Form = ({ patientId, onComplete }: Props) => {
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const isComplete = Object.keys(responses).length === QUESTIONS.length;

  const handleSubmit = async () => {
    if (!isComplete) {
      toast({ title: "Incomplete", description: "Please answer all 12 items.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const arr = QUESTIONS.map((_, i) => responses[i]);
      const result = scoreWHODAS2(arr);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("screening_assessments").insert({
        patient_id: patientId,
        user_id: user.id,
        tool_type: "WHODAS2",
        responses: arr,
        total_score: result.totalScore,
        severity_level: result.severityLevel,
        interpretation: result.interpretation,
        notes: notes || null,
      });
      if (error) throw error;
      toast({ title: "WHODAS 2.0 Saved", description: `Score: ${result.totalScore}/48 (${result.severityLevel})` });
      onComplete();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e.message ?? "Failed to save", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>WHODAS 2.0 (12-item self-report)</CardTitle>
        <CardDescription>
          WHO Disability Assessment Schedule. In the past 30 days, how much difficulty did you have in:
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
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {OPTIONS.map(o => (
                  <div key={o.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={o.value} id={`whodas-${i}-${o.value}`} />
                    <Label htmlFor={`whodas-${i}-${o.value}`} className="text-xs cursor-pointer font-normal">
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
