import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, AlertTriangle, Clock, Users, Pill, Brain, BookOpen, Copy, Check, FileDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { exportTreatmentPlanToPDF } from "@/lib/treatmentPlanPdfExport";

interface TreatmentPlanSuggestionsProps {
  screeningData: any[];
  mseFindings: any;
  patientContext: any;
}

interface TreatmentPlan {
  primary_interventions: Array<{
    intervention: string;
    rationale: string;
    evidence_base: string;
    priority: 'urgent' | 'high' | 'moderate' | 'low';
  }>;
  psychosocial_interventions: Array<{
    therapy_type: string;
    description: string;
    target_symptoms: string[];
    session_frequency?: string;
    evidence_level?: string;
  }>;
  pharmacological_considerations?: {
    indicated: boolean;
    medication_classes?: Array<{
      class: string;
      rationale: string;
      monitoring_requirements?: string;
      cultural_considerations?: string;
    }>;
    contraindications_to_assess?: string[];
  };
  monitoring_plan: {
    follow_up_frequency: string;
    outcome_measures: string[];
    red_flags: string[];
    review_timeline?: string;
  };
  referral_criteria: Array<{
    trigger: string;
    specialist_type: string;
    urgency: 'immediate' | 'urgent' | 'routine';
  }>;
  cultural_adaptations?: string[];
  patient_education_points?: string[];
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'destructive';
    case 'high': return 'default';
    case 'moderate': return 'secondary';
    case 'low': return 'outline';
    default: return 'outline';
  }
};

const getUrgencyColor = (urgency: string) => {
  switch (urgency) {
    case 'immediate': return 'destructive';
    case 'urgent': return 'default';
    case 'routine': return 'secondary';
    default: return 'outline';
  }
};

export const TreatmentPlanSuggestions = ({ 
  screeningData, 
  mseFindings, 
  patientContext 
}: TreatmentPlanSuggestionsProps) => {
  const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateTreatmentPlan = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-treatment-plan', {
        body: {
          screeningData,
          mseFindings,
          patientContext
        }
      });

      if (error) {
        if (error.message?.includes('429')) {
          throw new Error('Rate limit exceeded. Please try again in a moment.');
        }
        if (error.message?.includes('402')) {
          throw new Error('AI usage limit reached. Please add credits to continue.');
        }
        throw error;
      }

      setTreatmentPlan(data.treatmentPlan);
      toast({
        title: "Treatment Plan Generated",
        description: "Evidence-based recommendations are ready for review."
      });
    } catch (error) {
      console.error('Error generating treatment plan:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate treatment plan.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!treatmentPlan) return;

    const text = formatTreatmentPlanForCopy(treatmentPlan);
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copied to Clipboard",
      description: "Treatment plan copied for clinical notes."
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = () => {
    if (!treatmentPlan) return;
    
    exportTreatmentPlanToPDF({
      treatmentPlan,
      patientContext,
      generatedDate: new Date()
    });
    
    toast({
      title: "PDF Exported",
      description: "Treatment plan saved as PDF."
    });
  };

  const formatTreatmentPlanForCopy = (plan: TreatmentPlan): string => {
    let text = 'EVIDENCE-BASED TREATMENT PLAN\n\n';

    text += 'PRIMARY INTERVENTIONS:\n';
    plan.primary_interventions.forEach((int, i) => {
      text += `${i + 1}. ${int.intervention} [${int.priority.toUpperCase()}]\n`;
      text += `   Rationale: ${int.rationale}\n`;
      text += `   Evidence: ${int.evidence_base}\n\n`;
    });

    text += '\nPSYCHOSOCIAL INTERVENTIONS:\n';
    plan.psychosocial_interventions.forEach((psi, i) => {
      text += `${i + 1}. ${psi.therapy_type}\n`;
      text += `   ${psi.description}\n`;
      text += `   Target Symptoms: ${psi.target_symptoms.join(', ')}\n`;
      if (psi.session_frequency) text += `   Frequency: ${psi.session_frequency}\n`;
      text += '\n';
    });

    if (plan.pharmacological_considerations?.indicated) {
      text += '\nPHARMACOLOGICAL CONSIDERATIONS:\n';
      plan.pharmacological_considerations.medication_classes?.forEach((med, i) => {
        text += `${i + 1}. ${med.class}\n`;
        text += `   Rationale: ${med.rationale}\n`;
        if (med.monitoring_requirements) text += `   Monitoring: ${med.monitoring_requirements}\n`;
        text += '\n';
      });
    }

    text += '\nMONITORING PLAN:\n';
    text += `Follow-up Frequency: ${plan.monitoring_plan.follow_up_frequency}\n`;
    text += `Outcome Measures: ${plan.monitoring_plan.outcome_measures.join(', ')}\n`;
    text += `Red Flags: ${plan.monitoring_plan.red_flags.join('; ')}\n`;

    text += '\nREFERRAL CRITERIA:\n';
    plan.referral_criteria.forEach((ref, i) => {
      text += `${i + 1}. ${ref.trigger} → ${ref.specialist_type} [${ref.urgency.toUpperCase()}]\n`;
    });

    return text;
  };

  if (!screeningData.length && !mseFindings) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Complete screening assessments and MSE to generate treatment recommendations</p>
        </CardContent>
      </Card>
    );
  }

  if (isGenerating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 animate-pulse text-primary" />
            Generating Treatment Plan...
          </CardTitle>
          <CardDescription>
            Analyzing assessment data and consulting evidence-based guidelines
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!treatmentPlan) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Treatment Planning
          </CardTitle>
          <CardDescription>
            Generate evidence-based treatment recommendations from WHO mhGAP and clinical guidelines
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={generateTreatmentPlan} className="w-full">
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Treatment Plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Evidence-Based Treatment Recommendations
              </CardTitle>
              <CardDescription>
                AI-generated plan based on WHO mhGAP, NICE guidelines, and clinical best practices
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileDown className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="outline" size="sm" onClick={generateTreatmentPlan}>
                <Sparkles className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Clinical Judgment Required:</strong> These are AI-generated suggestions. Always apply clinical judgment, consider patient preferences, and adapt to local context and resources.
            </AlertDescription>
          </Alert>

          <Accordion type="multiple" defaultValue={["primary", "psychosocial"]} className="w-full">
            {/* Primary Interventions */}
            <AccordionItem value="primary">
              <AccordionTrigger className="text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Primary Interventions ({treatmentPlan.primary_interventions.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {treatmentPlan.primary_interventions.map((intervention, idx) => (
                    <Card key={idx} className="border-l-4 border-l-primary">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm">{intervention.intervention}</h4>
                          <Badge variant={getPriorityColor(intervention.priority)}>
                            {intervention.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{intervention.rationale}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <BookOpen className="h-3 w-3" />
                          <span>{intervention.evidence_base}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Psychosocial Interventions */}
            <AccordionItem value="psychosocial">
              <AccordionTrigger className="text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Psychosocial Interventions ({treatmentPlan.psychosocial_interventions.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {treatmentPlan.psychosocial_interventions.map((psi, idx) => (
                    <Card key={idx}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm">{psi.therapy_type}</h4>
                          {psi.evidence_level && (
                            <Badge variant="secondary" className="text-xs">{psi.evidence_level}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{psi.description}</p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {psi.target_symptoms.map((symptom, sidx) => (
                            <Badge key={sidx} variant="outline" className="text-xs">
                              {symptom}
                            </Badge>
                          ))}
                        </div>
                        {psi.session_frequency && (
                          <p className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {psi.session_frequency}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Pharmacological Considerations */}
            {treatmentPlan.pharmacological_considerations?.indicated && (
              <AccordionItem value="pharmacological">
                <AccordionTrigger className="text-sm font-semibold">
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-primary" />
                    Pharmacological Considerations
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {treatmentPlan.pharmacological_considerations.medication_classes?.map((med, idx) => (
                      <Card key={idx}>
                        <CardContent className="pt-4">
                          <h4 className="font-semibold text-sm mb-2">{med.class}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{med.rationale}</p>
                          {med.monitoring_requirements && (
                            <p className="text-xs text-muted-foreground mb-1">
                              <strong>Monitoring:</strong> {med.monitoring_requirements}
                            </p>
                          )}
                          {med.cultural_considerations && (
                            <p className="text-xs text-muted-foreground">
                              <strong>Cultural Note:</strong> {med.cultural_considerations}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {treatmentPlan.pharmacological_considerations.contraindications_to_assess && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          <strong>Assess for contraindications:</strong>{' '}
                          {treatmentPlan.pharmacological_considerations.contraindications_to_assess.join(', ')}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Monitoring Plan */}
            <AccordionItem value="monitoring">
              <AccordionTrigger className="text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Monitoring & Follow-up
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <div className="grid gap-3">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Follow-up Frequency</p>
                      <p className="text-sm">{treatmentPlan.monitoring_plan.follow_up_frequency}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Outcome Measures</p>
                      <div className="flex flex-wrap gap-1">
                        {treatmentPlan.monitoring_plan.outcome_measures.map((measure, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">{measure}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Red Flags for Escalation</p>
                      <ul className="text-sm space-y-1">
                        {treatmentPlan.monitoring_plan.red_flags.map((flag, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <AlertTriangle className="h-3 w-3 text-destructive mt-0.5 flex-shrink-0" />
                            <span>{flag}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Referral Criteria */}
            <AccordionItem value="referral">
              <AccordionTrigger className="text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Referral Criteria ({treatmentPlan.referral_criteria.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pt-2">
                  {treatmentPlan.referral_criteria.map((ref, idx) => (
                    <div key={idx} className="flex items-start justify-between p-3 rounded-lg border border-border">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{ref.trigger}</p>
                        <p className="text-xs text-muted-foreground mt-1">→ {ref.specialist_type}</p>
                      </div>
                      <Badge variant={getUrgencyColor(ref.urgency)} className="ml-2">
                        {ref.urgency}
                      </Badge>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Cultural Adaptations */}
            {treatmentPlan.cultural_adaptations && treatmentPlan.cultural_adaptations.length > 0 && (
              <AccordionItem value="cultural">
                <AccordionTrigger className="text-sm font-semibold">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Cultural Adaptations
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 pt-2">
                    {treatmentPlan.cultural_adaptations.map((adaptation, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{adaptation}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Patient Education */}
            {treatmentPlan.patient_education_points && treatmentPlan.patient_education_points.length > 0 && (
              <AccordionItem value="education">
                <AccordionTrigger className="text-sm font-semibold">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Patient Education Points
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 pt-2">
                    {treatmentPlan.patient_education_points.map((point, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};