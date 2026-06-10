import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { scorePHQ9 } from "@/lib/screening/scoringUtils";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { Loader2, AlertTriangle, WifiOff } from "lucide-react";

interface PHQ9FormProps {
  patientId: string;
  onComplete: () => void;
}

const PHQ9_QUESTIONS = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself - or that you are a failure or have let yourself or your family down",
  "Trouble concentrating on things, such as reading the newspaper or watching television",
  "Moving or speaking so slowly that other people could have noticed. Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual",
  "Thoughts that you would be better off dead, or of hurting yourself in some way"
];

const RESPONSE_OPTIONS = [
  { value: "0", label: "Not at all" },
  { value: "1", label: "Several days" },
  { value: "2", label: "More than half the days" },
  { value: "3", label: "Nearly every day" }
];

export const PHQ9Form = ({ patientId, onComplete }: PHQ9FormProps) => {
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { enqueue, isOnline } = useOfflineQueue();

  const handleResponseChange = (questionIndex: number, value: string) => {
    setResponses(prev => ({ ...prev, [questionIndex]: parseInt(value) }));
  };

  const isComplete = Object.keys(responses).length === 9;
  const hasSuicidalThoughts = responses[8] >= 1;

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
      const responseArray = Array.from({ length: 9 }, (_, i) => responses[i]);
      const scoringResult = scorePHQ9(responseArray);

      const assessmentData = {
        responses: responseArray,
        total_score: scoringResult.totalScore,
        severity_level: scoringResult.severityLevel,
        interpretation: scoringResult.interpretation,
        notes: notes || null,
      };

      if (!isOnline) {
        enqueue({ type: "screening", toolType: "PHQ9", patientId, data: assessmentData });
        onComplete();
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("screening_assessments").insert({
        patient_id: patientId,
        user_id: user.id,
        tool_type: "PHQ9",
        ...assessmentData,
      });

      if (error) throw error;

      toast({
        title: "PHQ-9 Saved",
        description: `Total Score: ${scoringResult.totalScore}/27 (${scoringResult.severityLevel})`,
        variant: scoringResult.alerts ? "destructive" : "default"
      });

      onComplete();
    } catch (error) {
      console.error("Error saving PHQ-9:", error);
      // Fallback to offline queue on network errors
      const responseArray = Array.from({ length: 9 }, (_, i) => responses[i]);
      const scoringResult = scorePHQ9(responseArray);
      enqueue({ type: "screening",
        toolType: "PHQ9",
        patientId,
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
        <CardTitle>PHQ-9: Patient Health Questionnaire</CardTitle>
        <CardDescription>
          Over the last 2 weeks, how often have you been bothered by any of the following problems?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasSuicidalThoughts && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-semibold">
              SUICIDALITY ALERT: Patient has endorsed thoughts of self-harm or suicide. Immediate safety assessment required.
            </AlertDescription>
          </Alert>
        )}

        {PHQ9_QUESTIONS.map((question, index) => (
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
                    <RadioGroupItem value={option.value} id={`phq9-${index}-${option.value}`} />
                    <Label
                      htmlFor={`phq9-${index}-${option.value}`}
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
