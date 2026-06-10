import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ClipboardList, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ScreeningContextProps {
  patientId: string | null;
  onAutoPopulate: (text: string) => void;
}

interface ScreeningAssessment {
  id: string;
  tool_type: string;
  total_score: number;
  severity_level: string;
  interpretation: string;
  administered_at: string;
}

const TOOL_NAMES: Record<string, string> = {
  GAD7: "GAD-7",
  PHQ9: "PHQ-9",
  PCL5: "PCL-5",
  MMSE: "MMSE",
  PSQ: "PSQ",
  PRIMER5: "PRIME-R-5"
};

const getSeverityColor = (severity: string) => {
  const lower = severity.toLowerCase();
  if (lower.includes("severe") || lower.includes("urgent") || lower.includes("multiple")) return "destructive";
  if (lower.includes("moderate")) return "default";
  if (lower.includes("mild") || lower.includes("positive")) return "secondary";
  return "outline";
};

const generateMSEContext = (screenings: ScreeningAssessment[]): string => {
  if (screenings.length === 0) return "";
  
  const sections: string[] = [];
  
  // Header
  sections.push("SCREENING CONTEXT FOR MSE:");
  sections.push(`Recent standardized assessments completed: ${format(new Date(), "PPP")}\n`);
  
  // Process each screening
  screenings.forEach(screening => {
    const toolName = TOOL_NAMES[screening.tool_type as keyof typeof TOOL_NAMES];
    sections.push(`${toolName} (${format(new Date(screening.administered_at), "MMM d, yyyy")}): Score ${screening.total_score} - ${screening.severity_level}`);
  });
  
  sections.push("\nCLINICAL OBSERVATIONS INFORMED BY SCREENING:");
  
  // PHQ-9 → Mood & Affect
  const phq9 = screenings.find(s => s.tool_type === "PHQ9");
  if (phq9) {
    const severity = phq9.severity_level.toLowerCase();
    if (severity.includes("severe")) {
      sections.push("\nMood & Affect: Patient presents with significantly depressed mood. PHQ-9 indicates severe depressive symptoms (score: " + phq9.total_score + "/27). Observable signs include low energy, anhedonia, and negative cognitive patterns. Affect appears constricted and mood dysphoric.");
    } else if (severity.includes("moderate")) {
      sections.push("\nMood & Affect: Patient reports moderate depressive symptoms (PHQ-9: " + phq9.total_score + "/27). Mood appears low with reduced reactivity. Some anhedonia noted. Affect partially congruent with reported mood.");
    } else if (severity.includes("mild")) {
      sections.push("\nMood & Affect: Mild depressive symptoms noted on PHQ-9 (score: " + phq9.total_score + "/27). Mood slightly low but reactive. Affect range appears somewhat restricted but appropriate to context.");
    } else {
      sections.push("\nMood & Affect: PHQ-9 screening negative for significant depressive symptoms (score: " + phq9.total_score + "/27). Mood reported as euthymic. Affect appropriate and reactive.");
    }
  }
  
  // GAD-7 → Mood & Affect (anxiety component)
  const gad7 = screenings.find(s => s.tool_type === "GAD7");
  if (gad7) {
    const severity = gad7.severity_level.toLowerCase();
    if (severity.includes("severe")) {
      sections.push("\nAnxiety Features: GAD-7 indicates severe anxiety symptoms (score: " + gad7.total_score + "/21). Patient appears tense, restless. Reports excessive worry and physiological arousal. Difficulty with relaxation noted.");
    } else if (severity.includes("moderate")) {
      sections.push("\nAnxiety Features: Moderate anxiety present (GAD-7: " + gad7.total_score + "/21). Patient reports worry and tension affecting daily function. Some autonomic arousal observable.");
    } else if (severity.includes("mild")) {
      sections.push("\nAnxiety Features: Mild anxiety symptoms noted (GAD-7: " + gad7.total_score + "/21). Occasional worry reported but manageable. No significant impairment in functioning.");
    } else {
      sections.push("\nAnxiety Features: GAD-7 screening negative for significant anxiety (score: " + gad7.total_score + "/21). Patient denies excessive worry or tension.");
    }
  }
  
  // PCL-5 → Perception & Thought Content (trauma responses)
  const pcl5 = screenings.find(s => s.tool_type === "PCL5");
  if (pcl5) {
    if (pcl5.interpretation.toLowerCase().includes("provisional ptsd")) {
      sections.push("\nTrauma & Perception: PCL-5 positive for provisional PTSD diagnosis (score: " + pcl5.total_score + "/80). Patient reports intrusive re-experiencing, avoidance behaviors, negative alterations in cognition/mood, and hyperarousal. Consider trauma-focused assessment and intervention.");
    } else if (pcl5.total_score >= 33) {
      sections.push("\nTrauma & Perception: Clinically significant trauma symptoms noted (PCL-5: " + pcl5.total_score + "/80). Patient reports distressing trauma-related experiences. Warrants further trauma assessment.");
    } else {
      sections.push("\nTrauma & Perception: PCL-5 screening does not suggest significant PTSD symptoms (score: " + pcl5.total_score + "/80).");
    }
  }
  
  // MMSE → Cognition
  const mmse = screenings.find(s => s.tool_type === "MMSE");
  if (mmse) {
    if (mmse.total_score >= 24) {
      sections.push("\nCognitive Status: MMSE within normal range (score: " + mmse.total_score + "/30). No significant cognitive impairment detected. Orientation, memory, attention, and executive function appear intact.");
    } else if (mmse.total_score >= 18) {
      sections.push("\nCognitive Status: MMSE suggests mild cognitive impairment (score: " + mmse.total_score + "/30). Difficulties noted in [specify domains affected during assessment]. Consider further neuropsychological evaluation.");
    } else {
      sections.push("\nCognitive Status: MMSE indicates severe cognitive impairment (score: " + mmse.total_score + "/30). Significant deficits across multiple cognitive domains. Urgent neuropsychiatric assessment recommended.");
    }
  }
  
  // PSQ → Perception & Thought Content
  const psq = screenings.find(s => s.tool_type === "PSQ");
  if (psq) {
    if (psq.total_score >= 2) {
      sections.push("\nThought Content & Perception: PSQ positive for multiple psychotic symptoms (score: " + psq.total_score + "/5). Patient endorses experiences consistent with perceptual disturbances and/or thought content abnormalities. Urgent psychiatric evaluation indicated to rule out primary psychotic disorder or psychosis secondary to other condition.");
    } else if (psq.total_score >= 1) {
      sections.push("\nThought Content & Perception: PSQ positive for psychotic symptoms (score: " + psq.total_score + "/5). Patient reports experiences suggesting possible perceptual disturbances. Requires further detailed assessment of psychotic symptoms.");
    } else {
      sections.push("\nThought Content & Perception: PSQ screening negative for psychotic symptoms (score: " + psq.total_score + "/5). No hallucinations or delusions reported.");
    }
  }
  
  // PRIME-R-5 → Prodromal Psychosis Risk
  const primer5 = screenings.find(s => s.tool_type === "PRIMER5");
  if (primer5) {
    if (primer5.total_score >= 18) {
      sections.push("\nProdromal Psychosis Risk: PRIME-R-5 indicates very high prodromal symptom severity (score: " + primer5.total_score + "/30). Patient reports significant unusual perceptual experiences, atypical thoughts, and/or somatic disturbances. Urgent referral to early psychosis intervention service recommended.");
    } else if (primer5.total_score >= 10) {
      sections.push("\nProdromal Psychosis Risk: PRIME-R-5 positive for elevated prodromal symptoms (score: " + primer5.total_score + "/30). Patient endorses attenuated psychotic experiences. Consider comprehensive psychosis risk assessment and specialist referral.");
    } else if (primer5.total_score >= 6) {
      sections.push("\nProdromal Psychosis Risk: PRIME-R-5 indicates moderate prodromal symptoms (score: " + primer5.total_score + "/30). Some unusual experiences reported. Monitor for symptom progression.");
    } else {
      sections.push("\nProdromal Psychosis Risk: PRIME-R-5 screening indicates low prodromal symptom burden (score: " + primer5.total_score + "/30). No significant early psychosis risk indicators detected.");
    }
  }
  
  sections.push("\n\n[Clinician to complete detailed MSE based on direct interview and behavioral observations]");
  
  return sections.join("\n");
};

export const ScreeningContext = ({ patientId, onAutoPopulate }: ScreeningContextProps) => {
  const [screenings, setScreenings] = useState<ScreeningAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (patientId) {
      loadScreenings();
    } else {
      setScreenings([]);
    }
  }, [patientId]);

  const loadScreenings = async () => {
    if (!patientId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("screening_assessments")
        .select("id, tool_type, total_score, severity_level, interpretation, administered_at")
        .eq("patient_id", patientId)
        .order("administered_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setScreenings(data || []);
      
      // Auto-open if there are screenings
      if (data && data.length > 0) {
        setIsOpen(true);
      }
    } catch (error) {
      console.error("Error loading screening context:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoPopulate = () => {
    const contextText = generateMSEContext(screenings);
    onAutoPopulate(contextText);
    toast({
      title: "MSE Context Added",
      description: "Screening results incorporated into narrative. Review and expand with clinical observations.",
    });
  };

  if (!patientId || isLoading) {
    return null;
  }

  if (screenings.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-primary/30 bg-primary/5">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer hover:bg-primary/10 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">
                  Screening Context Available
                </CardTitle>
                <Badge variant="secondary" className="ml-2">
                  {screenings.length} recent
                </Badge>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </div>
            <CardDescription className="text-left text-xs mt-1">
              Recent standardized assessments for context
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            {/* Screening Summary Cards */}
            <div className="grid grid-cols-2 gap-2">
              {screenings.map((screening) => (
                <div key={screening.id} className="p-2 rounded-md bg-background border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">
                      {TOOL_NAMES[screening.tool_type as keyof typeof TOOL_NAMES]}
                    </span>
                    <Badge variant={getSeverityColor(screening.severity_level)} className="text-xs py-0 px-1">
                      {screening.severity_level}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Score: {screening.total_score}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(screening.administered_at), "MMM d")}
                  </p>
                </div>
              ))}
            </div>

            {/* Auto-populate Button */}
            <Button 
              onClick={handleAutoPopulate}
              className="w-full"
              size="sm"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Auto-Populate MSE Context from Screenings
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              This will add screening-informed context to guide your clinical observations
            </p>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};