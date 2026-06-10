import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { scoreMMSE } from "@/lib/screening/scoringUtils";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { Loader2, WifiOff } from "lucide-react";

interface MMSEFormProps {
  patientId: string;
  onComplete: () => void;
}

const MMSE_SECTIONS = [
  { name: "Orientation to Time", maxScore: 5, description: "Year, season, date, day, month" },
  { name: "Orientation to Place", maxScore: 5, description: "State, county, town, hospital, floor" },
  { name: "Registration", maxScore: 3, description: "Name three objects" },
  { name: "Attention and Calculation", maxScore: 5, description: "Serial 7s or spell WORLD backwards" },
  { name: "Recall", maxScore: 3, description: "Recall the three objects" },
  { name: "Language - Naming", maxScore: 2, description: "Name pencil and watch" },
  { name: "Language - Repetition", maxScore: 1, description: "Repeat 'No ifs, ands, or buts'" },
  { name: "Language - Comprehension", maxScore: 3, description: "Follow 3-stage command" },
  { name: "Language - Reading", maxScore: 1, description: "Read and obey 'Close your eyes'" },
  { name: "Language - Writing", maxScore: 1, description: "Write a sentence" },
  { name: "Visuospatial", maxScore: 1, description: "Copy intersecting pentagons" }
];

export const MMSEForm = ({ patientId, onComplete }: MMSEFormProps) => {
  const [scores, setScores] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { enqueue, isOnline } = useOfflineQueue();

  const handleScoreChange = (sectionIndex: number, value: string) => {
    const numValue = parseInt(value) || 0;
    const maxScore = MMSE_SECTIONS[sectionIndex].maxScore;
    if (numValue >= 0 && numValue <= maxScore) {
      setScores(prev => ({ ...prev, [sectionIndex]: numValue }));
    }
  };

  const isComplete = Object.keys(scores).length === MMSE_SECTIONS.length;

  const handleSubmit = async () => {
    if (!isComplete) {
      toast({
        title: "Incomplete Assessment",
        description: "Please score all sections before submitting.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const scoreArray = Array.from({ length: MMSE_SECTIONS.length }, (_, i) => scores[i]);
      const scoringResult = scoreMMSE(scoreArray);

      const assessmentData = {
        responses: scoreArray,
        total_score: scoringResult.totalScore,
        severity_level: scoringResult.severityLevel,
        interpretation: scoringResult.interpretation,
        notes: notes || null,
      };

      if (!isOnline) {
        enqueue({ type: "screening", toolType: "MMSE", patientId, data: assessmentData });
        onComplete();
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("screening_assessments").insert({
        patient_id: patientId,
        user_id: user.id,
        tool_type: "MMSE",
        ...assessmentData,
      });

      if (error) throw error;

      toast({
        title: "MMSE Saved",
        description: `Total Score: ${scoringResult.totalScore}/30 (${scoringResult.severityLevel})`
      });

      onComplete();
    } catch (error) {
      console.error("Error saving MMSE:", error);
      const scoreArray = Array.from({ length: MMSE_SECTIONS.length }, (_, i) => scores[i]);
      const scoringResult = scoreMMSE(scoreArray);
      enqueue({ type: "screening",
        toolType: "MMSE", patientId,
        data: { responses: scoreArray, total_score: scoringResult.totalScore, severity_level: scoringResult.severityLevel, interpretation: scoringResult.interpretation, notes: notes || null },
      });
      onComplete();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>MMSE: Mini-Mental State Examination</CardTitle>
        <CardDescription>
          Cognitive assessment tool for detecting cognitive impairment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {MMSE_SECTIONS.map((section, index) => (
          <div key={index} className="space-y-2">
            <Label className="text-sm font-medium">
              {section.name} (Max: {section.maxScore} points)
            </Label>
            <p className="text-xs text-muted-foreground">{section.description}</p>
            <Input
              type="number"
              min={0}
              max={section.maxScore}
              value={scores[index] ?? ""}
              onChange={(e) => handleScoreChange(index, e.target.value)}
              placeholder={`0-${section.maxScore}`}
              className="w-24"
            />
          </div>
        ))}

        <div className="pt-4 px-4 py-2 bg-muted rounded-md">
          <p className="text-sm font-medium">
            Total Score: {Object.values(scores).reduce((sum, val) => sum + val, 0)}/30
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
