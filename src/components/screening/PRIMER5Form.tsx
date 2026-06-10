import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { scorePRIMER5 } from "@/lib/screening/scoringUtils";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { Loader2, AlertTriangle, WifiOff } from "lucide-react";

interface PRIMER5FormProps {
  patientId: string;
  onComplete: () => void;
}

const PRIMER5_QUESTIONS = [
  "I think that I may see something that frightens me, but when I go back to look there is nothing there.",
  "I think that I may hear sounds or voices that most other people cannot hear.",
  "I think that I have unusual thoughts that cause me to feel upset, confused, or scared.",
  "I think that something strange may be happening to me that I can't explain (like people may be out to get me or people are playing tricks on me).",
  "I think that something strange may be happening to my body that I can't explain (like I feel that my body is changing in an unusual way)."
];

const LIKERT_LABELS = [
  "Definitely Disagree",
  "Strongly Disagree",
  "Somewhat Disagree",
  "Neither Agree nor Disagree",
  "Somewhat Agree",
  "Strongly Agree",
  "Definitely Agree"
];

export const PRIMER5Form = ({ patientId, onComplete }: PRIMER5FormProps) => {
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { enqueue, isOnline } = useOfflineQueue();

  const handleResponseChange = (questionIndex: number, value: string) => {
    setResponses(prev => ({ ...prev, [questionIndex]: parseInt(value) }));
  };

  const isComplete = Object.keys(responses).length === 5;
  const currentScore = Object.values(responses).reduce((sum, val) => sum + val, 0);
  const highRiskItems = Object.entries(responses).filter(([_, val]) => val >= 4);
  const isHighRisk = currentScore >= 10 || highRiskItems.length > 0;

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
      const responseArray = PRIMER5_QUESTIONS.map((question, i) => ({
        question,
        score: responses[i]
      }));
      
      const scoringResult = scorePRIMER5(Object.values(responses));

      const assessmentData = {
        responses: responseArray,
        total_score: scoringResult.totalScore,
        severity_level: scoringResult.severityLevel,
        interpretation: scoringResult.interpretation,
        notes: notes || null,
      };

      if (!isOnline) {
        enqueue({ type: "screening", toolType: "PRIMER5", patientId, data: assessmentData });
        onComplete();
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("screening_assessments").insert({
        patient_id: patientId,
        user_id: user.id,
        tool_type: "PRIMER5",
        ...assessmentData,
      });

      if (error) throw error;

      toast({
        title: "PRIME-R-5 Saved",
        description: `Score: ${scoringResult.totalScore}/30 - ${scoringResult.severityLevel}`,
        variant: scoringResult.alerts ? "destructive" : "default"
      });

      onComplete();
    } catch (error) {
      console.error("Error saving PRIME-R-5:", error);
      const responseArray = PRIMER5_QUESTIONS.map((question, i) => ({ question, score: responses[i] }));
      const scoringResult = scorePRIMER5(Object.values(responses));
      enqueue({
        type: "screening", toolType: "PRIMER5", patientId,
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
        <CardTitle>PRIME Screen-Revised 5 (PRIME-R-5)</CardTitle>
        <CardDescription>
          Prodromal Psychosis Risk Assessment. Please indicate how much you agree or disagree with each statement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isHighRisk && isComplete && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-semibold">
              {currentScore >= 10 
                ? "CLINICAL ALERT: Total score ≥10 indicates need for comprehensive psychosis risk assessment."
                : "CLINICAL ALERT: One or more items scored ≥4 warrants clinical attention for specific prodromal symptoms."}
            </AlertDescription>
          </Alert>
        )}

        {PRIMER5_QUESTIONS.map((question, index) => (
          <div key={index} className="p-4 border rounded-md space-y-4">
            <Label className="text-sm font-normal leading-relaxed">
              {index + 1}. {question}
            </Label>
            <RadioGroup
              value={responses[index]?.toString() || ''}
              onValueChange={(value) => handleResponseChange(index, value)}
              className="grid grid-cols-7 gap-1"
            >
              {LIKERT_LABELS.map((label, score) => (
                <div key={score} className="flex flex-col items-center space-y-1">
                  <RadioGroupItem 
                    value={score.toString()} 
                    id={`primer5-${index}-${score}`} 
                    className="peer"
                  />
                  <Label 
                    htmlFor={`primer5-${index}-${score}`} 
                    className="text-[10px] text-center text-muted-foreground cursor-pointer leading-tight peer-data-[state=checked]:text-primary peer-data-[state=checked]:font-medium"
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {responses[index] !== undefined && (
              <div className="text-xs text-muted-foreground text-right">
                Score: {responses[index]}/6
                {responses[index] >= 4 && (
                  <span className="text-destructive ml-2 font-medium">⚠ Clinically significant</span>
                )}
              </div>
            )}
          </div>
        ))}

        <div className="pt-4 px-4 py-3 bg-muted rounded-md space-y-1">
          <p className="text-sm font-medium">
            Current Score: {currentScore}/30
          </p>
          <p className="text-xs text-muted-foreground">
            {currentScore < 6 ? "Low Risk" : currentScore < 10 ? "Moderate Risk" : currentScore < 18 ? "High Risk" : "Very High Risk"}
          </p>
          {highRiskItems.length > 0 && (
            <p className="text-xs text-destructive">
              {highRiskItems.length} item(s) with clinically significant score (≥4)
            </p>
          )}
        </div>

        <div className="space-y-2 pt-4">
          <Label htmlFor="notes">Clinical Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Additional observations, context, or follow-up recommendations..."
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
