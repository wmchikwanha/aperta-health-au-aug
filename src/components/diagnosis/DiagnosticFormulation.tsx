import { useState, useEffect } from 'react';
import { FileText, Save, Send, CheckCircle, Loader2, AlertTriangle, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DiagnosisCodeSelector } from './DiagnosisCodeSelector';
import { DifferentialDiagnosisList, DifferentialDiagnosis } from './DifferentialDiagnosisList';
import { AIDiagnosticSuggestions, type SuggestionsResult } from './AIDiagnosticSuggestions';
import { ReasoningTrace, UncertaintyBanners } from './ReasoningTrace';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { reviewDecision } from '@/lib/aiProvenance';
import { DiagnosticCode, CONFIDENCE_LEVELS, FORMULATION_STATUS } from '@/lib/diagnosis/diagnosticCodes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface DiagnosticFormulationProps {
  patientId: string;
  patientName: string;
  assessmentId?: string;
  screeningData?: Record<string, any>;
  mseFindings?: Record<string, any>;
  onComplete?: () => void;
}

interface FormulationData {
  id?: string;
  primaryDiagnosis: DiagnosticCode | null;
  primaryConfidence: string;
  differentialDiagnoses: DifferentialDiagnosis[];
  diagnosticReasoning: string;
  culturalFormulation: string;
  supportingEvidence: Record<string, any>;
  status: string;
  framework: 'ICD-11' | 'ICD-10' | 'DSM-5';
}

export function DiagnosticFormulation({
  patientId,
  patientName,
  assessmentId,
  screeningData = {},
  mseFindings = {},
  onComplete,
}: DiagnosticFormulationProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [existingFormulation, setExistingFormulation] = useState<FormulationData | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<SuggestionsResult | null>(null);
  const [aiShownAt, setAiShownAt] = useState<number | null>(null);
  const [savedTrace, setSavedTrace] = useState<any>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  const [formulation, setFormulation] = useState<FormulationData>({
    primaryDiagnosis: null,
    primaryConfidence: 'provisional',
    differentialDiagnoses: [],
    diagnosticReasoning: '',
    culturalFormulation: '',
    supportingEvidence: {},
    status: 'draft',
    framework: 'ICD-10',
  });

  // Load existing formulation if any
  useEffect(() => {
    const loadExisting = async () => {
      if (!patientId || !user) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('diagnostic_formulations')
          .select('*')
          .eq('patient_id', patientId)
          .eq('user_id', user.id)
          .neq('status', 'superseded')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          const loadedFormulation: FormulationData = {
            id: data.id,
            primaryDiagnosis: {
              code: data.primary_diagnosis_code,
              name: data.primary_diagnosis_name,
              category: '',
              framework: data.diagnostic_framework as 'ICD-10' | 'ICD-11' | 'DSM-5',
            },
            primaryConfidence: data.diagnosis_confidence || 'provisional',
            differentialDiagnoses: (data.differential_diagnoses as unknown as DifferentialDiagnosis[]) || [],
            diagnosticReasoning: data.diagnostic_reasoning || '',
            culturalFormulation: data.cultural_formulation || '',
            supportingEvidence: (data.supporting_evidence as unknown as Record<string, any>) || {},
            status: data.status,
            framework: data.diagnostic_framework as 'ICD-10' | 'ICD-11' | 'DSM-5',
          };
          setSavedTrace((data as any).reasoning_trace ?? null);
          setExistingFormulation(loadedFormulation);
          setFormulation(loadedFormulation);
        }
      } catch (err) {
        console.error('Error loading formulation:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadExisting();
  }, [patientId, user]);

  const pendingDecision = aiSuggestion ? reviewDecision(aiSuggestion.primaryDiagnosis?.code, formulation.primaryDiagnosis?.code) : null;

  const handleApprove = () => {
    if (pendingDecision && pendingDecision !== 'accepted' && overrideReason.trim().length < 3) { setReviewOpen(true); return; }
    handleSave('approved');
  };

  const handleSave = async (newStatus?: string) => {
    if (!formulation.primaryDiagnosis || !user) {
      toast({
        title: 'Validation Error',
        description: 'Please select a primary diagnosis before saving.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const saveData = {
        patient_id: patientId,
        assessment_id: assessmentId || null,
        user_id: user.id,
        primary_diagnosis_code: formulation.primaryDiagnosis.code,
        primary_diagnosis_name: formulation.primaryDiagnosis.name,
        diagnostic_framework: formulation.framework,
        diagnosis_confidence: formulation.primaryConfidence,
        differential_diagnoses: JSON.parse(JSON.stringify(formulation.differentialDiagnoses)),
        diagnostic_reasoning: formulation.diagnosticReasoning,
        cultural_formulation: formulation.culturalFormulation,
        supporting_evidence: JSON.parse(JSON.stringify({
          screeningData,
          mseFindings,
          ...formulation.supportingEvidence,
        })),
        status: newStatus || formulation.status,
        approved_by: newStatus === 'approved' ? user.id : null,
        approved_at: newStatus === 'approved' ? new Date().toISOString() : null,
        ...(aiSuggestion ? {
          reasoning_trace: JSON.parse(JSON.stringify(aiSuggestion.reasoningTrace ?? null)),
          ai_suggestions: JSON.parse(JSON.stringify({ primaryDiagnosis: aiSuggestion.primaryDiagnosis, differentialDiagnoses: aiSuggestion.differentialDiagnoses })),
          ai_generated: true,
          provenance: JSON.parse(JSON.stringify(aiSuggestion.provenance ?? null)),
          model_id: aiSuggestion.provenance?.model_id ?? null,
          model_version: aiSuggestion.provenance?.model_version ?? null,
          prompt_template_id: aiSuggestion.provenance?.prompt_template_id ?? null,
          prompt_template_version: aiSuggestion.provenance?.prompt_template_version ?? null,
        } : {}),
      };

      if (formulation.id) {
        // Update existing
        const { error } = await supabase
          .from('diagnostic_formulations')
          .update(saveData)
          .eq('id', formulation.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('diagnostic_formulations')
          .insert(saveData);

        if (error) throw error;
      }

      if (newStatus === 'approved' && aiSuggestion && pendingDecision) {
        const final = { code: formulation.primaryDiagnosis.code, name: formulation.primaryDiagnosis.name, differentials: formulation.differentialDiagnoses.map((d: any) => d.code ?? d.diagnosis?.code) };
        const original = { code: aiSuggestion.primaryDiagnosis?.code, name: aiSuggestion.primaryDiagnosis?.name, differentials: (aiSuggestion.differentialDiagnoses ?? []).map((d) => d.code) };
        const modified = ['code', 'differentials'].filter((k) => JSON.stringify((original as any)[k]) !== JSON.stringify((final as any)[k]));
        const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', user.id).limit(1).maybeSingle();
        const { error: revErr } = await supabase.from('ai_reviews').insert({
          ai_output_id: aiSuggestion.generatedAt ?? null, function_name: 'suggest-diagnosis', patient_id: patientId,
          reviewer_id: user.id, reviewer_role: roleRow?.role ?? null, decision: pendingDecision,
          override_reason: pendingDecision === 'accepted' ? null : overrideReason.trim(),
          modified_fields: modified, original_suggestion: original, final_content: final,
          review_time_ms: aiShownAt ? Date.now() - aiShownAt : null,
          language_of_encounter: (screeningData as any)?.language ?? null,
          model_id: aiSuggestion.provenance?.model_id ?? null, model_version_id: aiSuggestion.provenance?.model_version_id ?? null,
          prompt_template_id: aiSuggestion.provenance?.prompt_template_id ?? null,
        });
        if (revErr) console.error('ai_reviews insert failed', revErr);
        setReviewOpen(false); setOverrideReason('');
      }

      toast({
        title: 'Saved',
        description: newStatus === 'approved' 
          ? 'Diagnostic formulation approved and saved.'
          : 'Diagnostic formulation saved as draft.',
      });

      if (newStatus === 'approved' && onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error('Error saving formulation:', err);
      toast({
        title: 'Error',
        description: 'Failed to save diagnostic formulation.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectPrimaryFromAI = (code: DiagnosticCode) => {
    setFormulation(prev => ({
      ...prev,
      primaryDiagnosis: code,
      framework: code.framework,
    }));
  };

  const handleAddDifferentialFromAI = (code: DiagnosticCode) => {
    const newDiff: DifferentialDiagnosis = {
      id: crypto.randomUUID(),
      code,
      confidence: 'rule_out',
      evidenceType: 'neutral',
      rank: formulation.differentialDiagnoses.length + 1,
    };
    setFormulation(prev => ({
      ...prev,
      differentialDiagnoses: [...prev.differentialDiagnoses, newDiff],
    }));
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = FORMULATION_STATUS.find(s => s.value === status);
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      pending_review: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      superseded: 'bg-red-100 text-red-800',
    };
    return (
      <Badge className={colors[status] || ''}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Diagnostic Formulation
              </CardTitle>
              <CardDescription>
                Patient: {patientName}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(formulation.status)}
              <Tabs
                value={formulation.framework}
                onValueChange={(v) => setFormulation(prev => ({ 
                  ...prev, 
                  framework: v as 'ICD-10' | 'ICD-11' | 'DSM-5',
                  primaryDiagnosis: null,
                  differentialDiagnoses: [],
                }))}
              >
                <TabsList className="h-8">
                  <TabsTrigger value="ICD-10" className="text-xs px-3">ICD-10</TabsTrigger>
                  <TabsTrigger value="ICD-11" className="text-xs px-3">ICD-11</TabsTrigger>
                  <TabsTrigger value="DSM-5" className="text-xs px-3">DSM-5-TR</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 2xl:grid-cols-5 gap-4">
        {/* Main Formulation Panel */}
        <div className="2xl:col-span-3 space-y-4">
          {/* Primary Diagnosis */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Primary Diagnosis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Diagnosis Code</Label>
                <DiagnosisCodeSelector
                  framework={formulation.framework}
                  selectedCode={formulation.primaryDiagnosis || undefined}
                  onSelect={(code) => setFormulation(prev => ({ ...prev, primaryDiagnosis: code }))}
                  placeholder="Search and select primary diagnosis..."
                />
              </div>

              <div>
                <Label>Diagnostic Confidence</Label>
                <Select
                  value={formulation.primaryConfidence}
                  onValueChange={(v) => setFormulation(prev => ({ ...prev, primaryConfidence: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONFIDENCE_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <div>
                          <span className="font-medium">{level.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            - {level.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Differential Diagnoses */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Differential Diagnoses</CardTitle>
              <CardDescription>
                Rank alternative diagnoses by likelihood
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DifferentialDiagnosisList
                framework={formulation.framework}
                differentials={formulation.differentialDiagnoses}
                onChange={(diffs) => setFormulation(prev => ({ ...prev, differentialDiagnoses: diffs }))}
              />
            </CardContent>
          </Card>

          {/* Diagnostic Reasoning */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Diagnostic Reasoning</CardTitle>
              <CardDescription>
                Document the clinical reasoning supporting your diagnosis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Clinical Reasoning</Label>
                <Textarea
                  value={formulation.diagnosticReasoning}
                  onChange={(e) => setFormulation(prev => ({ 
                    ...prev, 
                    diagnosticReasoning: e.target.value 
                  }))}
                  placeholder="Document the symptom presentation, course, relevant history, and how findings support the diagnosis..."
                  className="min-h-[120px]"
                />
              </div>

              <Separator />

              <div>
                <Label>Cultural Formulation</Label>
                <Textarea
                  value={formulation.culturalFormulation}
                  onChange={(e) => setFormulation(prev => ({ 
                    ...prev, 
                    culturalFormulation: e.target.value 
                  }))}
                  placeholder="Document cultural factors including idioms of distress (e.g., jigar khoon, asabi, nafsaniya), cultural explanatory models, and how culture influences symptom presentation..."
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Evidence Summary */}
          {(Object.keys(screeningData).length > 0 || Object.keys(mseFindings).length > 0) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Supporting Evidence</CardTitle>
                <CardDescription>
                  Automatically collected from screening tools and MSE
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {screeningData.PHQ9 && (
                    <div className="p-2 bg-muted rounded">
                      <span className="font-medium">PHQ-9:</span> {screeningData.PHQ9.score}/27 
                      ({screeningData.PHQ9.severity})
                    </div>
                  )}
                  {screeningData.GAD7 && (
                    <div className="p-2 bg-muted rounded">
                      <span className="font-medium">GAD-7:</span> {screeningData.GAD7.score}/21 
                      ({screeningData.GAD7.severity})
                    </div>
                  )}
                  {screeningData.PCL5 && (
                    <div className="p-2 bg-muted rounded">
                      <span className="font-medium">PCL-5:</span> {screeningData.PCL5.score}/80
                    </div>
                  )}
                  {screeningData.MMSE && (
                    <div className="p-2 bg-muted rounded">
                      <span className="font-medium">MMSE:</span> {screeningData.MMSE.score}/30
                    </div>
                  )}
                  {screeningData.PSQ && (
                    <div className="p-2 bg-muted rounded">
                      <span className="font-medium">PSQ:</span> {screeningData.PSQ.score}/5
                    </div>
                  )}
                  {screeningData.PRIMER5 && (
                    <div className="p-2 bg-muted rounded">
                      <span className="font-medium">PRIME-R-5:</span> {screeningData.PRIMER5.score}/30
                    </div>
                  )}
                </div>
                {mseFindings.mood && (
                  <div className="mt-3 text-sm">
                    <span className="font-medium">MSE Mood/Affect:</span> {mseFindings.mood}
                    {mseFindings.affect && ` / ${mseFindings.affect}`}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => handleSave()}
              disabled={isSaving || !formulation.primaryDiagnosis}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Draft
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isSaving || !formulation.primaryDiagnosis}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Approve & Finalize
            </Button>
          </div>
        </div>

        {/* AI Suggestions Sidebar */}
        <div className="2xl:col-span-2">
          <AIDiagnosticSuggestions
            framework={formulation.framework}
            screeningData={screeningData}
            mseFindings={mseFindings}
            onSelectPrimary={handleSelectPrimaryFromAI}
            onAddDifferential={handleAddDifferentialFromAI}
            onSuggestionsGenerated={(r) => { setAiSuggestion(r); setAiShownAt(Date.now()); }}
          />
          {!aiSuggestion && savedTrace && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Saved AI reasoning for this formulation</p>
              <UncertaintyBanners trace={savedTrace} />
              <ReasoningTrace trace={savedTrace} />
            </div>
          )}
        </div>
      </div>
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Why does your diagnosis differ from the AI suggestion?</DialogTitle>
            <DialogDescription>Your reason is stored with the review so the team can measure where the AI and clinicians disagree.</DialogDescription>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border border-border p-3 bg-muted/40">
              <p className="text-xs font-medium text-muted-foreground mb-1">AI suggested</p>
              <p className="font-mono line-through decoration-destructive">{aiSuggestion?.primaryDiagnosis?.code}</p>
              <p>{aiSuggestion?.primaryDiagnosis?.name}</p>
            </div>
            <div className="rounded-md border border-primary/40 p-3 bg-primary/5">
              <p className="text-xs font-medium text-muted-foreground mb-1">Your final diagnosis</p>
              <p className="font-mono font-semibold">{formulation.primaryDiagnosis?.code}</p>
              <p>{formulation.primaryDiagnosis?.name}</p>
            </div>
          </div>
          <Label htmlFor="override-reason">Reason (required)</Label>
          <Textarea id="override-reason" rows={3} value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="e.g. Symptoms better explained by culturally normative grief; trauma history not captured by the narrative" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button disabled={overrideReason.trim().length < 3 || isSaving} onClick={() => handleSave('approved')}>Save reason and approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
