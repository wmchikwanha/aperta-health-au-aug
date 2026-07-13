import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { scoreRHS15 } from "@/lib/screening/refugeeScreening";
import { Loader2 } from "lucide-react";

interface Props {
  patientId: string;
  onComplete: () => void;
}

const QUESTIONS = [
  "Muscle, bone, joint pains",
  "Feeling down, sad, or blue most of the time",
  "Too much thinking or too many thoughts",
  "Feeling helpless",
  "Suddenly scared for no reason",
  "Faintness, dizziness, or weakness",
  "Nervousness or shakiness inside",
  "Feeling restless, can't sit still",
  "Crying easily",
  "Feeling that most people cannot be trusted",
  "Difficulty dealing with new situations",
  "Feeling that no one understands you",
  "Feeling of being trapped, caught",
  "Poor memory",
];

const OPTIONS = [
  { value: "0", label: "Not at all" },
  { value: "1", label: "A little bit" },
  { value: "2", label: "Moderately" },
  { value: "3", label: "Quite a bit" },
  { value: "4", label: "Extremely" },
];

export const RHS15Form = ({ patientId, onComplete }: Props) => {
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [thermo, setThermo] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const isComplete = Object.keys(responses).length === 14;

  const handleSubmit = async () => {
    if (!isComplete) {
      toast({ title: "Incomplete", description: "Please answer all 14 items.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const items = Array.from({ length: 14 }, (_, i) => responses[i] ?? 0);
      const result = scoreRHS15({ items, distressThermometer: thermo });
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("screening_assessments").insert({
        patient_id: patientId,
        user_id: user.id,
        tool_type: "RHS15",
        responses: { items, distressThermometer: thermo } as any,
        total_score: result.totalScore,
        severity_level: result.severityLevel,
        interpretation: result.interpretation,
        notes: notes || null,
      });
      if (error) throw error;
      toast({
        title: "RHS-15 Saved",
        description: `Sum: ${result.totalScore}/56, Distress: ${thermo}/10 (${result.severityLevel})`,
        variant: result.alerts ? "destructive" : "default",
      });
      onComplete();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e.message ?? "Failed to save", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>RHS-15: Refugee Health Screener</CardTitle>
        <CardDescription>
          Emotional distress screener validated in refugee populations. In the past month, how much have you been distressed by:
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
                    <RadioGroupItem value={o.value} id={`rhs-${i}-${o.value}`} />
                    <Label htmlFor={`rhs-${i}-${o.value}`} className="text-xs cursor-pointer font-normal">
                      {o.label}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>
        ))}

        <div className="space-y-3 pt-4 border-t">
          <Label className="text-sm font-medium">
            15. Distress thermometer — overall distress today: {thermo}/10
          </Label>
          <Slider value={[thermo]} min={0} max={10} step={1} onValueChange={(v) => setThermo(v[0])} />
          <p className="text-xs text-muted-foreground">0 = No distress · 10 = Extreme distress</p>
        </div>

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
