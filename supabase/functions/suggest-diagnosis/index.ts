import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authResult = await enforceDiagnosticRole(req);
    if (authResult instanceof Response) return authResult;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const { screeningData, mseFindings, patientContext, framework }: DiagnosticRequest = await req.json();

    const frameworkInstructions = framework === 'ICD-10'
      ? `Use ICD-10-AM (Australian Modification) Chapter V codes exclusively.`
      : framework === 'ICD-11'
      ? `Use ICD-11 diagnostic codes exclusively (e.g., 6A70 MDD, 6B41 Complex PTSD).`
      : `Use DSM-5-TR diagnostic codes exclusively.`;

    const frameworkLabel = framework === 'DSM-5' ? 'DSM-5-TR' : framework;

    const systemPrompt = `You are an expert psychiatric diagnostic consultant for Australian CALD / refugee mental-health.
    Use ${frameworkLabel} diagnostic criteria exclusively.
    ${frameworkInstructions}

    CULTURAL CONTEXT: Recognise idioms like ḍayqa ṣadr (Arabic), jigaram khun (Dari), suy nghĩ nhiều (Vietnamese).
    Apply the Social and Emotional Wellbeing (SEWB) framework for Indigenous patients.

    CRITICAL: You must return your response as a valid JSON object with the following structure:
    {
      "primaryDiagnosis": { "code": "", "name": "", "confidence": 0, "supportingEvidence": [], "reasoning": "" },
      "differentialDiagnoses": [{ "code": "", "name": "", "confidence": 0, "supportingEvidence": [], "reasoning": "" }],
      "culturalFormulation": "",
      "clinicalAlerts": [],
      "additionalAssessments": []
    }`;

    const clinicalSummary = buildClinicalSummary(screeningData, mseFindings, patientContext);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
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

    const result = {
      ...suggestions,
      framework: frameworkLabel,
      generatedAt: new Date().toISOString(),
      disclaimer: 'AI-generated suggestion requiring clinical review. The final diagnosis is the responsibility of the treating clinician.',
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