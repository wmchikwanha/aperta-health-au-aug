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
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized — invalid token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = claimsData.claims.sub as string;
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const userRole = roles?.[0]?.role;
  if (!userRole || !DIAGNOSTIC_ROLES.includes(userRole)) {
    await logAuditEvent(userId, userRole || "unknown", "generate_treatment_plan", "denied", { reason: "insufficient_role" });
    return new Response(JSON.stringify({ error: "Forbidden — only psychiatrists and admins can generate treatment plans" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  await logAuditEvent(userId, userRole, "generate_treatment_plan", "success");
  return { userId, role: userRole };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Server-side role enforcement: only psychiatrists and admins can generate treatment plans
    const authResult = await enforceDiagnosticRole(req);
    if (authResult instanceof Response) return authResult;
    console.log(`Role verified: ${authResult.role} (${authResult.userId})`);

    const { screeningData, mseFindings, patientContext } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const clinicalContext = buildClinicalContext(screeningData, mseFindings, patientContext);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        system: `You are a psychiatric clinical decision support system providing evidence-based treatment recommendations for Southern African mental health contexts. You support clinicians in Zimbabwe, South Africa, Botswana, and Zambia.

CRITICAL CONSTRAINTS:
- "AI suggests, clinician decides" — all recommendations require professional clinical review
- Never suggest specific medication dosages — only medication classes and general principles
- Never make a definitive treatment decision — support clinical reasoning only
- Flag high-risk presentations for immediate escalation
- All outputs are prefixed: "AI-generated suggestion requiring clinical review"

BREVITY REQUIREMENT:
- Maximum 3 items per array field
- Each text field: 1–2 sentences only
- Omit fields that do not apply to this specific presentation

CLINICAL FRAMEWORK:
1. WHO mhGAP guidelines — primary reference for all recommendations
2. NICE guidelines — secondary reference
3. Stepped-care model — least intensive effective intervention first
4. Resource-aware — consider medication availability and specialist access in Southern African settings
5. Culturally sensitive — acknowledge traditional healing contexts and family/community systems

CULTURAL CONTEXT:
- Traditional healers (n'anga, sangoma) play important roles — acknowledge, do not dismiss
- Family and community involvement in care decisions is often appropriate and expected
- Stigma around mental health is significant — psychoeducation framing matters
- kufungisisa (Shona): "thinking too much" — depression/anxiety, commonly reported
- moyo unorwadza (Shona): "the heart is painful" — somatic expression of grief
- amafufunyana (Zulu/Xhosa): spirit possession — ICD-11 6B63, culturally appropriate explanation

STRUCTURE: Provide primary interventions, psychosocial interventions, pharmacological considerations (class only, no dosages), monitoring plan, and referral criteria.`,
        messages: [{ role: 'user', content: clinicalContext }],
        tools: [
          {
            name: 'generate_treatment_plan',
            description: 'Generate structured evidence-based treatment recommendations',
            input_schema: {
              type: 'object',
              properties: {
                primary_interventions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      intervention: { type: 'string' },
                      rationale: { type: 'string' },
                      evidence_base: { type: 'string', description: 'WHO mhGAP, NICE, or other guideline citation' },
                      priority: { type: 'string', enum: ['urgent', 'high', 'moderate', 'low'] }
                    },
                    required: ['intervention', 'rationale', 'evidence_base', 'priority']
                  }
                },
                psychosocial_interventions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      therapy_type: { type: 'string' },
                      description: { type: 'string' },
                      target_symptoms: { type: 'array', items: { type: 'string' } },
                      session_frequency: { type: 'string' },
                      evidence_level: { type: 'string' }
                    },
                    required: ['therapy_type', 'description', 'target_symptoms']
                  }
                },
                pharmacological_considerations: {
                  type: 'object',
                  properties: {
                    indicated: { type: 'boolean' },
                    medication_classes: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          class: { type: 'string', description: 'Medication class only — no specific drugs or dosages' },
                          rationale: { type: 'string' },
                          monitoring_requirements: { type: 'string' },
                          cultural_considerations: { type: 'string' }
                        }
                      }
                    },
                    contraindications_to_assess: { type: 'array', items: { type: 'string' } }
                  }
                },
                monitoring_plan: {
                  type: 'object',
                  properties: {
                    follow_up_frequency: { type: 'string' },
                    outcome_measures: { type: 'array', items: { type: 'string' } },
                    red_flags: { type: 'array', items: { type: 'string' } },
                    review_timeline: { type: 'string' }
                  }
                },
                referral_criteria: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      trigger: { type: 'string' },
                      specialist_type: { type: 'string' },
                      urgency: { type: 'string', enum: ['immediate', 'urgent', 'routine'] }
                    }
                  }
                },
                cultural_adaptations: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific cultural considerations for this patient context'
                },
                patient_education_points: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: [
                'primary_interventions',
                'psychosocial_interventions',
                'monitoring_plan',
                'referral_criteria'
              ]
            }
          }
        ],
        tool_choice: { type: 'tool', name: 'generate_treatment_plan' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Claude response received, stop_reason:', data.stop_reason);

    if (data.stop_reason === 'max_tokens') {
      console.error('Treatment plan response truncated — max_tokens reached');
      throw new Error('Treatment plan generation failed: response was truncated before completion. This indicates the input is too large or the model hit the token limit.');
    }

    // Extract tool use result from Claude's response format
    const toolUseBlock = data.content?.find((block: { type: string }) => block.type === 'tool_use');
    if (!toolUseBlock || toolUseBlock.name !== 'generate_treatment_plan') {
      throw new Error('No treatment plan generated — invalid response format');
    }

    const treatmentPlan = toolUseBlock.input;

    console.log('Treatment plan generated successfully');

    return new Response(
      JSON.stringify({ treatmentPlan }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating treatment plan:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate treatment plan' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildClinicalContext(screeningData: any[], mseFindings: any, patientContext: any): string {
  let context = 'CLINICAL ASSESSMENT SUMMARY — please generate evidence-based treatment recommendations:\n\n';

  if (patientContext) {
    context += '## Patient Context\n';
    context += `- Age band: ${patientContext.age_band || patientContext.age || 'Not specified'}\n`;
    context += `- Gender: ${patientContext.gender || 'Not specified'}\n`;
    context += `- Cultural background: ${patientContext.cultural_background || 'Not specified'}\n`;
    context += `- Language preference: ${patientContext.language_preference || 'Not specified'}\n\n`;
  }

  if (screeningData && screeningData.length > 0) {
    context += '## Screening Assessment Results\n';
    screeningData.forEach(screening => {
      context += `- ${screening.tool_type}: Score ${screening.total_score} — ${screening.severity_level} (${screening.interpretation})\n`;
    });
    context += '\n';
  }

  if (mseFindings) {
    context += '## Mental State Examination Findings\n';
    if (mseFindings.appearance) context += `- Appearance/Behaviour: ${mseFindings.appearance}\n`;
    if (mseFindings.speech) context += `- Speech/Thought: ${mseFindings.speech}\n`;
    if (mseFindings.mood) context += `- Mood/Affect: ${mseFindings.mood}\n`;
    if (mseFindings.perception) context += `- Perception: ${mseFindings.perception}\n`;
    if (mseFindings.risk) context += `- Risk: ${mseFindings.risk}\n`;
    if (mseFindings.clinical_impressions) context += `- Clinical Impressions: ${mseFindings.clinical_impressions}\n`;
    context += '\n';
  }

  context += 'Generate WHO mhGAP-aligned treatment recommendations for this presentation.';
  return context;
}
