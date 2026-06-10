import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { scorePCL5 } from "@/lib/screening/scoringUtils";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { Loader2, WifiOff } from "lucide-react";

interface PCL5FormProps {
  patientId: string;
  onComplete: () => void;
}

const PCL5_QUESTIONS = [
  "Repeated, disturbing, and unwanted memories of the stressful experience",
  "Repeated, disturbing dreams of the stressful experience",
  "Suddenly feeling or acting as if the stressful experience were actually happening again",
  "Feeling very upset when something reminded you of the stressful experience",
  "Having strong physical reactions when something reminded you of the stressful experience",
  "Avoiding memories, thoughts, or feelings related to the stressful experience",
  "Avoiding external reminders of the stressful experience",
  "Trouble remembering important parts of the stressful experience",
  "Having strong negative beliefs about yourself, other people, or the world",
  "Blaming yourself or someone else for the stressful experience or what happened after it",
  "Having strong negative feelings such as fear, horror, anger, guilt, or shame",
  "Loss of interest in activities that you used to enjoy",
  "Feeling distant or cut off from other people",
  "Trouble experiencing positive feelings",
  "Irritable behavior, angry outbursts, or acting aggressively",
  "Taking too many risks or doing things that could cause you harm",
  "Being \"superalert\" or watchful or on guard",
  "Feeling jumpy or easily startled",
  "Having difficulty concentrating",
  "Trouble falling or staying asleep"
];

const RESPONSE_OPTIONS = [
  { value: "0", label: "Not at all" },
  { value: "1", label: "A little bit" },
  { value: "2", label: "Moderately" },
  { value: "3", label: "Quite a bit" },
  { value: "4", label: "Extremely" }
];

export const PCL5Form = ({ patientId, onComplete }: PCL5FormProps) => {
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { enqueue, isOnline } = useOfflineQueue();

  const handleResponseChange = (questionIndex: number, value: string) => {
    setResponses(prev => ({ ...prev, [questionIndex]: parseInt(value) }));
  };

  const isComplete = Object.keys(responses).length === 20;

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
      const responseArray = Array.from({ length: 20 }, (_, i) => responses[i]);
      const scoringResult = scorePCL5(responseArray);

      const assessmentData = {
        responses: responseArray,
        total_score: scoringResult.totalScore,
        severity_level: scoringResult.severityLevel,
        interpretation: scoringResult.interpretation,
        notes: notes || null,
      };

      if (!isOnline) {
        enqueue({ type: "screening", toolType: "PCL5", patientId, data: assessmentData });
        onComplete();
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("screening_assessments").insert({
        patient_id: patientId,
        user_id: user.id,
        tool_type: "PCL5",
        ...assessmentData,
      });

      if (error) throw error;

      toast({
        title: "PCL-5 Saved",
        description: `Total Score: ${scoringResult.totalScore}/80 (${scoringResult.severityLevel})`,
        variant: scoringResult.alerts ? "destructive" : "default"
      });

      onComplete();
    } catch (error) {
      console.error("Error saving PCL-5:", error);
      const responseArray = Array.from({ length: 20 }, (_, i) => responses[i]);
      const scoringResult = scorePCL5(responseArray);
      enqueue({ type: "screening",
        toolType: "PCL5", patientId,
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
        <CardTitle>PCL-5: PTSD Checklist</CardTitle>
        <CardDescription>
          In the past month, how much were you bothered by the following problems?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {PCL5_QUESTIONS.map((question, index) => (
          <div key={index} className="space-y-3">
            <Label className="text-sm font-medium">
              {index + 1}. {question}
            </Label>
            <RadioGroup
              value={responses[index]?.toString()}
              onValueChange={(value) => handleResponseChange(index, value)}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {RESPONSE_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`pcl5-${index}-${option.value}`} />
                    <Label
                      htmlFor={`pcl5-${index}-${option.value}`}
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
