import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { scoreGDS15 } from "@/lib/screening/refugeeScreening";
import { Loader2 } from "lucide-react";

interface Props { patientId: string; onComplete: () => void; }

// Item text and the "positive-scoring" answer per Yesavage GDS-15.
// depressedAnswer indicates which answer counts as 1 point.
const ITEMS: { q: string; depressedAnswer: "yes" | "no" }[] = [
  { q: "Are you basically satisfied with your life?", depressedAnswer: "no" },
  { q: "Have you dropped many of your activities and interests?", depressedAnswer: "yes" },
  { q: "Do you feel that your life is empty?", depressedAnswer: "yes" },
  { q: "Do you often get bored?", depressedAnswer: "yes" },
  { q: "Are you in good spirits most of the time?", depressedAnswer: "no" },
  { q: "Are you afraid that something bad is going to happen to you?", depressedAnswer: "yes" },
  { q: "Do you feel happy most of the time?", depressedAnswer: "no" },
  { q: "Do you often feel helpless?", depressedAnswer: "yes" },
  { q: "Do you prefer to stay at home, rather than going out and doing new things?", depressedAnswer: "yes" },
  { q: "Do you feel you have more problems with memory than most?", depressedAnswer: "yes" },
  { q: "Do you think it is wonderful to be alive now?", depressedAnswer: "no" },
  { q: "Do you feel pretty worthless the way you are now?", depressedAnswer: "yes" },
  { q: "Do you feel full of energy?", depressedAnswer: "no" },
  { q: "Do you feel that your situation is hopeless?", depressedAnswer: "yes" },
  { q: "Do you think that most people are better off than you?", depressedAnswer: "yes" },
];

export const GDS15Form = ({ patientId, onComplete }: Props) => {
  const [answers, setAnswers] = useState<Record<number, "yes" | "no">>({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const isComplete = Object.keys(answers).length === ITEMS.length;

  const handleSubmit = async () => {
    if (!isComplete) {
      toast({ title: "Incomplete", description: "Please answer all 15 items.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // Map raw yes/no to the 0/1 array expected by scoreGDS15.
      const arr = ITEMS.map((item, i) => (answers[i] === item.depressedAnswer ? 1 : 0));
      const result = scoreGDS15(arr);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("screening_assessments").insert({
        patient_id: patientId,
        user_id: user.id,
        tool_type: "GDS15",
        responses: { rawAnswers: ITEMS.map((_, i) => answers[i]), scored: arr } as any,
        total_score: result.totalScore,
        severity_level: result.severityLevel,
        interpretation: result.interpretation,
        notes: notes || null,
      });
      if (error) throw error;
      toast({
        title: "GDS-15 Saved",
        description: `Score: ${result.totalScore}/15 (${result.severityLevel})`,
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
        <CardTitle>GDS-15: Geriatric Depression Scale (short form)</CardTitle>
        <CardDescription>
          Choose the answer that best describes how you have felt over the past week.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {ITEMS.map((item, i) => (
          <div key={i} className="space-y-3">
            <Label className="text-sm font-medium">{i + 1}. {item.q}</Label>
            <RadioGroup
              value={answers[i]}
              onValueChange={(v) => setAnswers(p => ({ ...p, [i]: v as "yes" | "no" }))}
            >
              <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id={`gds-${i}-yes`} />
                  <Label htmlFor={`gds-${i}-yes`} className="text-sm cursor-pointer font-normal">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id={`gds-${i}-no`} />
                  <Label htmlFor={`gds-${i}-no`} className="text-sm cursor-pointer font-normal">No</Label>
                </div>
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
