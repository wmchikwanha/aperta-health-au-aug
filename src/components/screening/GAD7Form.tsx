import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { scoreGAD7 } from "@/lib/screening/scoringUtils";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { Loader2, WifiOff } from "lucide-react";

interface GAD7FormProps {
  patientId: string;
  onComplete: () => void;
}

const GAD7_QUESTIONS = [
  "Feeling nervous, anxious or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it is hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid as if something awful might happen"
];

const RESPONSE_OPTIONS = [
  { value: "0", label: "Not at all" },
  { value: "1", label: "Several days" },
  { value: "2", label: "More than half the days" },
  { value: "3", label: "Nearly every day" }
];

export const GAD7Form = ({ patientId, onComplete }: GAD7FormProps) => {
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { enqueue, isOnline } = useOfflineQueue();

  const handleResponseChange = (questionIndex: number, value: string) => {
    setResponses(prev => ({ ...prev, [questionIndex]: parseInt(value) }));
  };

  const isComplete = Object.keys(responses).length === 7;

  const handleSubmit = async () => {
    if (!isComplete) {
      toast({
        title: "Incomplete Assessment",
        description: "Please answer all questions before submitting.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const responseArray = Array.from({ length: 7 }, (_, i) => responses[i]);
      const scoringResult = scoreGAD7(responseArray);

      const assessmentData = {
        responses: responseArray,
        total_score: scoringResult.totalScore,
        severity_level: scoringResult.severityLevel,
        interpretation: scoringResult.interpretation,
        notes: notes || null,
      };

      if (!isOnline) {
        enqueue({ type: "screening", toolType: "GAD7", patientId, data: assessmentData });
        onComplete();
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("screening_assessments").insert({
        patient_id: patientId,
        user_id: user.id,
        tool_type: "GAD7",
        ...assessmentData,
      });

      if (error) throw error;

      toast({
        title: "GAD-7 Saved",
        description: `Total Score: ${scoringResult.totalScore}/21 (${scoringResult.severityLevel})`
      });

      onComplete();
    } catch (error) {
      console.error("Error saving GAD-7:", error);
      const responseArray = Array.from({ length: 7 }, (_, i) => responses[i]);
      const scoringResult = scoreGAD7(responseArray);
      enqueue({ type: "screening",
        toolType: "GAD7", patientId,
        data: { responses: responseArray, total_score: scoringResult.totalScore, severity_level: scoringResult.severityLevel, interpretation: scoringResult.interpretation, notes: notes || null },
      });
      onComplete();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>GAD-7: Generalized Anxiety Disorder</CardTitle>
        <CardDescription>
          Over the last 2 weeks, how often have you been bothered by the following problems?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {GAD7_QUESTIONS.map((question, index) => (
          <div key={index} className="space-y-3">
            <Label className="text-sm font-medium">
              {index + 1}. {question}
            </Label>
            <RadioGroup
              value={responses[index]?.toString()}
              onValueChange={(value) => handleResponseChange(index, value)}
            >
              <div className="grid grid-cols-2 gap-3">
                {RESPONSE_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`gad7-${index}-${option.value}`} />
                    <Label
                      htmlFor={`gad7-${index}-${option.value}`}
                      className="text-sm cursor-pointer font-normal"
                    >
                      {option.label} ({option.value})
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>
        ))}

        <div className="space-y-2 pt-4">
          <Label htmlFor="notes">Clinical Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Additional observations or context..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleSubmit}
            disabled={!isComplete || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : !isOnline ? (
              <>
                <WifiOff className="mr-2 h-4 w-4" />
                Save Offline
              </>
            ) : (
              "Save Assessment"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
