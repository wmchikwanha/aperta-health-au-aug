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
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized — invalid token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = userData.user.id;
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
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
  appearance?: string;
  behavior?: string;
  speech?: string;
  mood?: string;
  affect?: string;
  thought_process?: string;
  thought_content?: string;
  perceptions?: string;
  cognition?: string;
  insight?: string;
  judgment?: string;
  risk_assessment?: string;
}

interface DiagnosticRequest {
  screeningData: ScreeningData;
  mseFindings: MSEFindings;
  patientContext?: {
    age?: number;
    gender?: string;
    culturalBackground?: string;
    presentingComplaint?: string;
  };
  framework: 'ICD-10' | 'ICD-11' | 'DSM-5';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Server-side role enforcement: only psychiatrists and admins can access diagnostics
    const authResult = await enforceDiagnosticRole(req);
    if (authResult instanceof Response) return authResult;
    console.log(`Role verified: ${authResult.role} (${authResult.userId})`);

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const { screeningData, mseFindings, patientContext, framework }: DiagnosticRequest = await req.json();

    console.log('Generating diagnostic suggestions for framework:', framework);

    const frameworkInstructions = framework === 'ICD-10'
      ? `Use ICD-10-AM (Australian Modification) Chapter V codes exclusively (e.g., F32.0 mild depressive episode, F41.1 GAD, F20 schizophrenia, F43.1 PTSD, F43.2 adjustment disorder).
Use the ICD-10-AM F-code system. Do NOT use ICD-11 or DSM-5 codes.
ICD-10-AM is the default classification used in Australian public mental-health services and AIHW reporting.
Follow ICD-10-AM naming conventions.`
      : framework === 'ICD-11'
      ? `Use ICD-11 diagnostic codes exclusively (e.g., 6A70 MDD single episode, 6B00 GAD, 6A20 schizophrenia, 6B40 PTSD, 6B41 Complex PTSD, 6B42 Prolonged Grief).
Use the ICD-11 alphanumeric coding system. Do NOT use DSM-5 or ICD-10 codes.
Reference ICD-11-specific features: dimensional personality disorders, Complex PTSD (6B41), Prolonged Grief Disorder (6B42), 6B63 possession trance disorder.
Follow WHO classification naming conventions.`
      : `Use DSM-5-TR diagnostic codes exclusively (e.g., 300.02 GAD, 296.xx MDD, 309.81 PTSD, 309.0 adjustment disorder).
Use DSM-5-TR numeric coding and specifiers. Do NOT use ICD-11 or ICD-10 codes.
Reference DSM-5-TR-specific features: severity specifiers, course specifiers, Prolonged Grief Disorder (309.89), categorical personality disorders.
Follow APA classification naming conventions.`;

    const systemPrompt = `You are an expert psychiatric diagnostic consultant for the Aperta Health clinical decision support system, assisting Psychiatrists, Clinical Psychologists, GPs (MHTP), Refugee Health Nurses and Bicultural Workers in Australian CALD / refugee mental-health settings.

You use ${framework} diagnostic criteria exclusively.
${frameworkInstructions}

CRITICAL CONSTRAINTS:
- "AI suggests, clinician decides" — all suggestions require professional clinical review
- Never provide a definitive diagnosis — support clinical reasoning only
- Never suggest specific medication dosages
- Flag high-risk presentations immediately (suicidal ideation, psychosis, self-harm, acute DFV) and reference Australian crisis pathways: 000, Lifeline 13 11 14, 13YARN 13 92 76, 1800RESPECT 1800 737 732
- Confidence percentages reflect evidence match to ${framework} criteria only

CULTURAL CONTEXT — Australian CALD / refugee idioms of distress to recognise:
- ḍayqa ṣadr / a'ṣābī ta'bāna (Arabic): somatic depression, anxiety, PTSD entry point
- delam gerefte / jigaram khun (Dari, Farsi, Hazaragi): grief, separation, possible passive SI
- dil tang hai (Urdu): heavy-hearted depression with family-honour pressures
- puou diit (Dinka) / lochda jal (Nuer): trauma-laden grief and anger; interpreter required
- moyo wangu unauma (Swahili): somatic depression in East African refugees
- suy nghĩ nhiều (Vietnamese): rumination, GAD/MDD
- For Aboriginal & Torres Strait Islander patients, apply the Social and Emotional Wellbeing (SEWB) framework and avoid pathologising spiritual or kinship-grief experiences

Consider Complex PTSD (ICD-11 6B41) and Prolonged Grief Disorder (ICD-11 6B42 / DSM-5-TR 309.89) prominently in refugee presentations with cumulative trauma and family loss.

All AI outputs are suggestions prefixed: "AI-generated suggestion requiring clinical review."`;

    const clinicalSummary = buildClinicalSummary(screeningData, mseFindings, patientContext);

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        stream: true,
        system: systemPrompt,
        messages: [{ role: 'user', content: clinicalSummary }],
        tools: [
          {
            name: 'suggest_diagnoses',
            description: 'Provide structured diagnostic suggestions based on clinical evidence',
            input_schema: {
              type: 'object',
              properties: {
                primaryDiagnosis: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', description: `${framework} diagnostic code` },
                    name: { type: 'string', description: 'Full diagnosis name' },
                    confidence: { type: 'number', description: 'Confidence percentage (0-100)' },
                    supportingEvidence: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Clinical findings supporting this diagnosis'
                    },
                    reasoning: { type: 'string', description: 'Brief clinical reasoning' }
                  },
                  required: ['code', 'name', 'confidence', 'supportingEvidence', 'reasoning']
                },
                differentialDiagnoses: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      code: { type: 'string' },
                      name: { type: 'string' },
                      confidence: { type: 'number' },
                      supportingEvidence: { type: 'array', items: { type: 'string' } },
                      reasoning: { type: 'string' }
                    },
                    required: ['code', 'name', 'confidence', 'supportingEvidence', 'reasoning']
                  },
                  description: 'Alternative diagnoses to consider'
                },
                culturalFormulation: {
                  type: 'string',
                  description: 'Cultural considerations relevant to diagnosis in Australian CALD / refugee mental-health context (pre-migration trauma, displacement, visa precarity, somatic idioms, ATSI SEWB framing where applicable)'
                },
                clinicalAlerts: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Important clinical alerts (risk factors, urgent considerations)'
                },
                additionalAssessments: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Recommended additional assessments or investigations'
                }
              },
              required: ['primaryDiagnosis', 'differentialDiagnoses', 'culturalFormulation', 'clinicalAlerts']
            }
          }
        ],
        tool_choice: { type: 'tool', name: 'suggest_diagnoses' }
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('Claude API error:', claudeResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Claude API error: ${claudeResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Commit to streaming
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      const reader = claudeResponse.body!.getReader();
      const decoder = new TextDecoder();
      let evtBuffer = '';
      let jsonBuffer = '';  // accumulates input_json_delta fragments for tool use
      let tokenCount = 0;
      let stopReason = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          evtBuffer += decoder.decode(value, { stream: true });
          const lines = evtBuffer.split('\n');
          evtBuffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;

            const jsonStr = trimmed.slice(6);
            if (jsonStr === '[DONE]') continue;

            try {
              const event = JSON.parse(jsonStr);

              if (
                event.type === 'content_block_delta' &&
                event.delta?.type === 'input_json_delta' &&
                event.delta?.partial_json
              ) {
                jsonBuffer += event.delta.partial_json;
                tokenCount++;
                if (tokenCount % 15 === 0) {
                  await writer.write(encoder.encode(
                    `data: ${JSON.stringify({ tokens: tokenCount })}\n\n`
                  ));
                }
              } else if (event.type === 'message_delta' && event.delta?.stop_reason) {
                stopReason = event.delta.stop_reason;
              }
            } catch { /* skip malformed SSE events */ }
          }
        }

        // All tool input received — parse and validate
        if (stopReason === 'max_tokens') {
          throw new Error('AI response was truncated (max_tokens reached). Please try again.');
        }
        const suggestions = JSON.parse(jsonBuffer);
        if (!suggestions.primaryDiagnosis || !suggestions.differentialDiagnoses) {
          throw new Error('Invalid AI response format — missing required diagnostic fields');
        }

        const result = {
          ...suggestions,
          framework,
          generatedAt: new Date().toISOString(),
          disclaimer: 'AI-generated suggestion requiring clinical review. The final diagnosis is the responsibility of the treating clinician.',
        };

        console.log('Diagnostic suggestions generated successfully, tokens:', tokenCount);
        await writer.write(encoder.encode(`data: ${JSON.stringify({ result })}\n\n`));
        await writer.write(encoder.encode('data: [DONE]\n\n'));
      } catch (error) {
        console.error('Streaming error in suggest-diagnosis:', error);
        const msg = error instanceof Error ? error.message : 'Unknown error';
        await writer.write(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        await writer.write(encoder.encode('data: [DONE]\n\n'));
      } finally {
        writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in suggest-diagnosis:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildClinicalSummary(
  screeningData: ScreeningData,
  mseFindings: MSEFindings,
  patientContext?: DiagnosticRequest['patientContext']
): string {
  let summary = 'Please analyse the following clinical data and provide diagnostic suggestions:\n\n';

  if (patientContext) {
    summary += '## Patient Context\n';
    if (patientContext.age) summary += `- Age: ${patientContext.age}\n`;
    if (patientContext.gender) summary += `- Gender: ${patientContext.gender}\n`;
    if (patientContext.culturalBackground) summary += `- Cultural Background: ${patientContext.culturalBackground}\n`;
    if (patientContext.presentingComplaint) summary += `- Presenting Complaint: ${patientContext.presentingComplaint}\n`;
    summary += '\n';
  }

  summary += '## Screening Tool Results\n';
  if (screeningData.PHQ9) summary += `- PHQ-9 (Depression): Score ${screeningData.PHQ9.score}/27 — ${screeningData.PHQ9.severity}\n`;
  if (screeningData.GAD7) summary += `- GAD-7 (Anxiety): Score ${screeningData.GAD7.score}/21 — ${screeningData.GAD7.severity}\n`;
  if (screeningData.PCL5) summary += `- PCL-5 (PTSD): Score ${screeningData.PCL5.score}/80 — ${screeningData.PCL5.severity}\n`;
  if (screeningData.MMSE) summary += `- MMSE (Cognitive): Score ${screeningData.MMSE.score}/30 — ${screeningData.MMSE.interpretation}\n`;
  if (screeningData.PSQ) summary += `- PSQ (Psychosis): Score ${screeningData.PSQ.score}/5 — Positive screens: ${screeningData.PSQ.positiveScreens.join(', ') || 'None'}\n`;
  if (screeningData.PRIMER5) summary += `- PRIME-R-5 (Prodromal Psychosis): Score ${screeningData.PRIMER5.score}/30 — ${screeningData.PRIMER5.riskLevel}\n`;

  summary += '\n## Mental State Examination Findings\n';
  if (mseFindings.appearance) summary += `- Appearance: ${mseFindings.appearance}\n`;
  if (mseFindings.behavior) summary += `- Behaviour: ${mseFindings.behavior}\n`;
  if (mseFindings.speech) summary += `- Speech: ${mseFindings.speech}\n`;
  if (mseFindings.mood) summary += `- Mood: ${mseFindings.mood}\n`;
  if (mseFindings.affect) summary += `- Affect: ${mseFindings.affect}\n`;
  if (mseFindings.thought_process) summary += `- Thought Process: ${mseFindings.thought_process}\n`;
  if (mseFindings.thought_content) summary += `- Thought Content: ${mseFindings.thought_content}\n`;
  if (mseFindings.perceptions) summary += `- Perceptions: ${mseFindings.perceptions}\n`;
  if (mseFindings.cognition) summary += `- Cognition: ${mseFindings.cognition}\n`;
  if (mseFindings.insight) summary += `- Insight: ${mseFindings.insight}\n`;
  if (mseFindings.judgment) summary += `- Judgment: ${mseFindings.judgment}\n`;
  if (mseFindings.risk_assessment) summary += `- Risk Assessment: ${mseFindings.risk_assessment}\n`;

  summary += '\nProvide structured diagnostic suggestions based on this clinical information.';

  return summary;
}
