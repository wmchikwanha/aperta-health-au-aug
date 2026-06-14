import { useState } from 'react';
import { Sparkles, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DiagnosticCode } from '@/lib/diagnosis/diagnosticCodes';

interface AISuggestion {
  code: string;
  name: string;
  confidence: number;
  supportingEvidence: string[];
  reasoning: string;
}

interface AIDiagnosticSuggestionsProps {
  framework: 'ICD-11' | 'ICD-10' | 'DSM-5';
  screeningData: Record<string, any>;
  mseFindings: Record<string, any>;
  patientContext?: {
    age?: number;
    gender?: string;
    culturalBackground?: string;
    presentingComplaint?: string;
  };
  onSelectPrimary: (code: DiagnosticCode) => void;
  onAddDifferential: (code: DiagnosticCode) => void;
}

interface SuggestionsResult {
  primaryDiagnosis: AISuggestion;
  differentialDiagnoses: AISuggestion[];
  culturalFormulation: string;
  clinicalAlerts: string[];
  additionalAssessments?: string[];
  disclaimer: string;
}

export function AIDiagnosticSuggestions({
  framework,
  screeningData,
  mseFindings,
  patientContext,
  onSelectPrimary,
  onAddDifferential,
}: AIDiagnosticSuggestionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [processingTokens, setProcessingTokens] = useState(0);
  const [suggestions, setSuggestions] = useState<SuggestionsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generateSuggestions = async () => {
    setIsLoading(true);
    setProcessingTokens(0);
    setError(null);

    try {
      const DIAG_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/suggest-diagnosis`;
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Please sign in to generate diagnostic suggestions.');
      const response = await fetch(DIAG_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ screeningData, mseFindings, patientContext, framework }),
      });

      if (!response.ok || !response.headers.get('Content-Type')?.includes('text/event-stream')) {
        const errData = await response.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? `HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let data = null;

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6).trim();
          if (jsonStr === '[DONE]') break outer;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.result) { data = parsed.result; }
            else if (parsed.error) { throw new Error(parsed.error); }
            else if (parsed.tokens) { setProcessingTokens(parsed.tokens as number); }
          } catch (e) { if ((e as Error).message !== 'Unexpected token') throw e; }
        }
      }

      if (!data) throw new Error('No result received from server');

      setSuggestions(data);
      toast({
        title: 'Suggestions Generated',
        description: 'AI diagnostic suggestions are ready for review.',
      });
    } catch (err) {
      console.error('Error generating suggestions:', err);
      const message = err instanceof Error ? err.message : 'Failed to generate suggestions';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (confidence >= 60) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (confidence >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const createDiagnosticCode = (suggestion: AISuggestion): DiagnosticCode => ({
    code: suggestion.code,
    name: suggestion.name,
    category: 'AI Suggested',
    framework,
  });

  const hasData = Object.keys(screeningData).length > 0 || Object.keys(mseFindings).length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Diagnostic Suggestions
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {framework}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Generate Button */}
        {!suggestions && (
          <div className="text-center py-4">
            {!hasData ? (
              <p className="text-sm text-muted-foreground mb-3">
                Complete screening assessments or MSE to generate AI suggestions
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Generate AI-powered diagnostic suggestions based on clinical data
                </p>
                <Button
                  onClick={generateSuggestions}
                  disabled={isLoading}
                  className="gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {processingTokens > 0 ? `Analysing... (${processingTokens} tokens)` : 'Connecting to AI...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Suggestions
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Suggestions Display */}
        {suggestions && (
          <div className="max-h-[500px] overflow-y-auto pr-1">
            <div className="space-y-4">
              {/* Disclaimer */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {suggestions.disclaimer}
                </AlertDescription>
              </Alert>

              {/* Clinical Alerts */}
              {suggestions.clinicalAlerts?.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-1">Clinical Alerts:</p>
                    <ul className="list-disc list-inside text-sm">
                      {suggestions.clinicalAlerts.map((alert, i) => (
                        <li key={i}>{alert}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Primary Diagnosis */}
              <div className="border rounded-lg p-3 bg-primary/5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Primary Diagnosis Suggestion
                  </p>
                  <Badge className={getConfidenceColor(suggestions.primaryDiagnosis.confidence)}>
                    {suggestions.primaryDiagnosis.confidence}% confidence
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono font-medium">
                    {suggestions.primaryDiagnosis.code}
                  </span>
                  <span className="text-sm">{suggestions.primaryDiagnosis.name}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {suggestions.primaryDiagnosis.reasoning}
                </p>
                <div className="mb-3">
                  <p className="text-xs font-medium mb-1">Supporting Evidence:</p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside">
                    {suggestions.primaryDiagnosis.supportingEvidence.map((ev, i) => (
                      <li key={i}>{ev}</li>
                    ))}
                  </ul>
                </div>
                <Button
                  size="sm"
                  onClick={() => onSelectPrimary(createDiagnosticCode(suggestions.primaryDiagnosis))}
                  className="gap-1"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Use as Primary
                </Button>
              </div>

              <Separator />

              {/* Differential Diagnoses */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Differential Diagnoses to Consider
                </p>
                <div className="space-y-2">
                  {suggestions.differentialDiagnoses.map((diff, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-3 bg-card"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">{diff.code}</span>
                          <Badge variant="outline" className={getConfidenceColor(diff.confidence)}>
                            {diff.confidence}%
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onAddDifferential(createDiagnosticCode(diff))}
                        >
                          Add
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">{diff.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{diff.reasoning}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Cultural Formulation */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Cultural Formulation
                </p>
                <p className="text-sm">{suggestions.culturalFormulation}</p>
              </div>

              {/* Additional Assessments */}
              {suggestions.additionalAssessments?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Recommended Additional Assessments
                  </p>
                  <ul className="text-sm list-disc list-inside">
                    {suggestions.additionalAssessments.map((assessment, i) => (
                      <li key={i}>{assessment}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Regenerate Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={generateSuggestions}
                disabled={isLoading}
                className="w-full gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Regenerate Suggestions
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
