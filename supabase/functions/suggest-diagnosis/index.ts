import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { normalizeCalculatedScores } from "../_shared/clinical-rules.ts";
import { loadAIConfig, AIConfigError, logConfidence } from "../_shared/ai-registry.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DIAGNOSTIC_ROLES = ["admin", "psychiatrist"];

function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function logAuditEvent(userId: string, role: string, action: string, outcome: string, metadata?: Record<string, unknown>) {
  try {
    const svc = createServiceClient();
    await svc.from("audit_events").insert({
      actor_id: userId,
      actor_role: role,
      action,
      resource_type: "edge_function",
      outcome,
      source: "edge_function",
      metadata: metadata ?? null,
    });
  } catch (e) {
    console.error("Audit log failed:", e);
  }
}

async function enforceDiagnosticRole(req: Request): Promise<{ userId: string; role: string } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized — no token provided" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized — invalid token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = userData.user.id;
  const svc = createServiceClient();
  const { data: roles } = await svc.from("user_roles").select("role").eq("user_id", userId);
  const userRole = roles?.[0]?.role;
  if (!userRole || !DIAGNOSTIC_ROLES.includes(userRole)) {
    await logAuditEvent(userId, userRole || "unknown", "suggest_diagnosis", "denied", { reason: "insufficient_role" });
    return new Response(JSON.stringify({ error: "Forbidden — only psychiatrists and admins can access diagnostics" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  await logAuditEvent(userId, userRole, "suggest_diagnosis", "success");
  return { userId, role: userRole };
}

interface ScreeningData {
  PHQ9?: { score: number; severity: string };
  GAD7?: { score: number; severity: string };
  PCL5?: { score: number; severity: string };
  MMSE?: { score: number; interpretation: string };
  PSQ?: { score: number; positiveScreens: string[] };
  PRIMER5?: { score: number; riskLevel: string };
}

interface MSEFindings {
  appearance?: string; behavior?: string; speech?: string; mood?: string; affect?: string;
  thought_process?: string; thought_content?: string; perceptions?: string;
  cognition?: string; insight?: string; judgment?: string; risk_assessment?: string;
}

interface DiagnosticRequest {
  screeningData: ScreeningData;
  mseFindings: MSEFindings;
  patientContext?: { age?: number; gender?: string; culturalBackground?: string; presentingComplaint?: string; };
  framework: 'ICD-10' | 'ICD-11' | 'DSM-5';
  calculatedScores?: Record<string, unknown>;
  extractedEntities?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authResult = await enforceDiagnosticRole(req);
    if (authResult instanceof Response) return authResult;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const { screeningData, mseFindings, patientContext, framework, calculatedScores: submittedScores, extractedEntities, patientId, languageOfInput }: DiagnosticRequest & { patientId?: string; languageOfInput?: string } = await req.json();
    let config;
    try { config = await loadAIConfig('suggest-diagnosis'); } catch (e) { if (e instanceof AIConfigError) return new Response(JSON.stringify({ error: e.message }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); throw e; }
    const calculatedScores = normalizeCalculatedScores(submittedScores);

    const frameworkInstructions = framework === 'ICD-10'
      ? `Use ICD-10-AM (Australian Modification) Chapter V codes exclusively.`
      : framework === 'ICD-11'
      ? `Use ICD-11 diagnostic codes exclusively (e.g., 6A70 MDD, 6B41 Complex PTSD).`
      : `Use DSM-5-TR diagnostic codes exclusively.`;

    const frameworkLabel = framework === 'DSM-5' ? 'DSM-5-TR' : framework;

    const systemPrompt = `${config.systemPrompt}

    RUNTIME FRAMEWORK: Use ${frameworkLabel} diagnostic criteria exclusively.
    ${frameworkInstructions}

    CULTURAL CONTEXT: Recognise idioms like ḍayqa ṣadr (Arabic), jigaram khun (Dari), suy nghĩ nhiều (Vietnamese).
    Apply the Social and Emotional Wellbeing (SEWB) framework for Indigenous patients.

    Scores supplied in CALCULATED SCORES are deterministic and locked. Do not rescore, alter, or invent scores. Extracted entities are unverified documentation support. Never prescribe or suggest medication dosages. Flag uncertainty rather than filling gaps. Every suggestion requires clinician review.

    CRITICAL: You must return your response as a valid JSON object with the following structure:
    {
      "primaryDiagnosis": { "code": "", "name": "", "confidence": 0, "supportingEvidence": [], "reasoning": "" },
      "differentialDiagnoses": [{ "code": "", "name": "", "confidence": 0, "supportingEvidence": [], "reasoning": "" }],
      "culturalFormulation": "",
      "clinicalAlerts": [],
      "additionalAssessments": []
    }`;

    const clinicalSummary = `${buildClinicalSummary(screeningData, mseFindings, patientContext)}\n### CALCULATED SCORES — LOCKED\n${JSON.stringify(calculatedScores)}\n### EXTRACTED ENTITIES — UNVERIFIED\n${JSON.stringify(extractedEntities ?? {})}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: clinicalSummary }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const suggestions = JSON.parse(aiData.choices[0].message.content);

    const confidence = typeof suggestions.confidence === 'number' ? suggestions.confidence : suggestions.primaryDiagnosis?.confidence ?? null;
    await logConfidence({ function_name: 'suggest-diagnosis', clinician_id: authResult.userId, raw_confidence: confidence, patient_id: patientId ?? null, language_of_input: languageOfInput ?? null, provenance: config.provenance });
    const result = {
      ...suggestions,
      confidence,
      provenance: config.provenance,
      framework: frameworkLabel,
      generatedAt: new Date().toISOString(),
      disclaimer: 'AI-generated suggestion requiring clinical review. The final diagnosis is the responsibility of the treating clinician.',
      calculatedScores,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in suggest-diagnosis:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildClinicalSummary(screeningData: ScreeningData, mseFindings: MSEFindings, patientContext?: any): string {
  let summary = '## CLINICAL DATA FOR ANALYSIS\n\n';

  if (patientContext) {
    summary += `### 1. Patient Context\n- Age: ${patientContext.age}\n- Gender: ${patientContext.gender}\n- Cultural Background: ${patientContext.culturalBackground}\n- Presenting Complaint: ${patientContext.presentingComplaint}\n\n`;
  }

  summary += `### 2. Screening Tool Results\n`;
  if (screeningData.PHQ9) summary += `- PHQ-9: ${screeningData.PHQ9.score} (${screeningData.PHQ9.severity})\n`;
  if (screeningData.GAD7) summary += `- GAD-7: ${screeningData.GAD7.score} (${screeningData.GAD7.severity})\n`;
  if (screeningData.PCL5) summary += `- PCL-5: ${screeningData.PCL5.score} (${screeningData.PCL5.severity})\n`;
  if (screeningData.MMSE) summary += `- MMSE: ${screeningData.MMSE.score} (${screeningData.MMSE.interpretation})\n`;
  summary += '\n';

  summary += `### 3. Mental State Examination (MSE)\n`;
  Object.entries(mseFindings).forEach(([key, value]) => {
    if (value) summary += `- ${key.replace('_', ' ').toUpperCase()}: ${value}\n`;
  });

  return summary;
}