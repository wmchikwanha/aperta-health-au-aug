import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { scorePSQ } from "@/lib/screening/scoringUtils";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { Loader2, AlertTriangle, WifiOff } from "lucide-react";

interface PSQFormProps {
  patientId: string;
  onComplete: () => void;
}

const PSQ_QUESTIONS = [
  "Do you ever feel as if people seem to drop hints about you or say things with a double meaning?",
  "Do you ever feel as if things in magazines or on TV were written especially for you?",
  "Do you ever feel that some people are not what they seem to be?",
  "Do you ever feel that you are being persecuted in some way?",
  "Do you ever feel that there is a conspiracy against you?"
];

export const PSQForm = ({ patientId, onComplete }: PSQFormProps) => {
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { enqueue, isOnline } = useOfflineQueue();

  const handleResponseChange = (questionIndex: number, value: string) => {
    setResponses(prev => ({ ...prev, [questionIndex]: value }));
  };

  const isComplete = Object.keys(responses).length === 5;
  const positiveScreens = Object.values(responses).filter(v => v === 'yes').length;
  const hasMultiplePositives = positiveScreens > 1;

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
      const responseArray = PSQ_QUESTIONS.map((question, i) => ({
        question,
        endorsed: responses[i] === 'yes'
      }));
      
      const scoringResult = scorePSQ(responseArray);

      const assessmentData = {
        responses: responseArray,
        total_score: scoringResult.totalScore,
        severity_level: scoringResult.severityLevel,
        interpretation: scoringResult.interpretation,
        notes: notes || null,
      };

      if (!isOnline) {
        enqueue({ type: "screening", toolType: "PSQ", patientId, data: assessmentData });
        onComplete();
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("screening_assessments").insert({
        patient_id: patientId,
        user_id: user.id,
        tool_type: "PSQ",
        ...assessmentData,
      });

      if (error) throw error;

      toast({
        title: "PSQ Saved",
        description: `${positiveScreens} positive screen(s) - ${scoringResult.severityLevel}`,
        variant: scoringResult.alerts ? "destructive" : "default"
      });

      onComplete();
    } catch (error) {
      console.error("Error saving PSQ:", error);
      const responseArray = PSQ_QUESTIONS.map((question, i) => ({ question, endorsed: responses[i] === 'yes' }));
      const scoringResult = scorePSQ(responseArray);
      enqueue({ type: "screening",
        toolType: "PSQ", patientId,
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
        <CardTitle>PSQ: Psychosis Screening Questionnaire</CardTitle>
        <CardDescription>
          Please answer Yes or No to the following questions:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasMultiplePositives && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-semibold">
              URGENT: Multiple psychotic symptoms endorsed. Immediate psychiatric assessment required.
            </AlertDescription>
          </Alert>
        )}

        {PSQ_QUESTIONS.map((question, index) => (
          <div key={index} className="p-4 border rounded-md space-y-3">
            <Label className="text-sm font-normal leading-relaxed">
              {index + 1}. {question}
            </Label>
            <RadioGroup
              value={responses[index] || ''}
              onValueChange={(value) => handleResponseChange(index, value)}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id={`psq-${index}-yes`} />
                <Label htmlFor={`psq-${index}-yes`} className="font-normal cursor-pointer">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id={`psq-${index}-no`} />
                <Label htmlFor={`psq-${index}-no`} className="font-normal cursor-pointer">No</Label>
              </div>
            </RadioGroup>
          </div>
        ))}

        <div className="pt-4 px-4 py-2 bg-muted rounded-md">
          <p className="text-sm font-medium">
            Positive Screens: {positiveScreens}/5
          </p>
        </div>

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
