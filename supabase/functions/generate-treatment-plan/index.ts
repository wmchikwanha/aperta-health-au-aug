import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { containsMedicationDosage, normalizeCalculatedScores, selectMHGAPModule } from "../_shared/clinical-rules.ts";
import { loadAIConfig, AIConfigError, logConfidence } from "../_shared/ai-registry.ts";
import { guardInput, wrapUserContent } from "../_shared/input-guard.ts";
import { callWithValidation, logInference, SCHEMAS, FAIL_SAFE_MESSAGE, findCulturalFlags, loadDoNotPathologise } from "../_shared/output-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildClinicalContext(screeningData: any[], mseFindings: any, patientContext: any, calculatedScores: Record<string, unknown>, mhgapModule: ReturnType<typeof selectMHGAPModule>): string {
  let context = "CLINICAL ASSESSMENT SUMMARY — generate an evidence-based treatment plan.\n\n";

  if (patientContext) {
    context += "## Patient Context\n";
    context += `- Age band: ${patientContext.age_band || patientContext.age || "Not specified"}\n`;
    context += `- Gender: ${patientContext.gender || "Not specified"}\n`;
    context += `- Cultural background: ${patientContext.cultural_background || "Not specified"}\n`;
    context += `- Language preference: ${patientContext.language_preference || "Not specified"}\n\n`;
  }

  if (screeningData && screeningData.length > 0) {
    context += "## Screening Results\n";
    screeningData.forEach((s) => {
      context += `- ${s.tool_type}: ${s.total_score} — ${s.severity_level} (${s.interpretation})\n`;
    });
    context += "\n";
  }

  if (mseFindings) {
    context += "## Mental State Examination\n";
    for (const [k, v] of Object.entries(mseFindings)) {
      if (v) context += `- ${k}: ${v}\n`;
    }
    context += "\n";
  }
  context += `## Locked deterministic inputs\n- Calculated scores: ${JSON.stringify(calculatedScores)}\n- mhGAP module: ${mhgapModule.moduleCode} — ${mhgapModule.moduleName}\n- Required interventions: ${mhgapModule.interventions.join("; ")}\n\n`;

  return context;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader ?? "" } } },
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { screeningData, mseFindings, patientContext, calculatedScores: submittedScores, diagnosticCategory, severity, patientId, languageOfInput } = await req.json();
    const { data: roleRows } = await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!).from("user_roles").select("role").eq("user_id", user.id);
    if (!roleRows?.some((r: any) => ["admin", "psychiatrist", "clinical_nurse"].includes(r.role))) {
      return new Response(JSON.stringify({ error: "Forbidden — clinician role required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    let config;
    try { config = await loadAIConfig("generate-treatment-plan"); } catch (e) { if (e instanceof AIConfigError) return new Response(JSON.stringify({ error: e.message }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }); throw e; }
    const calculatedScores = normalizeCalculatedScores(submittedScores);
    const mhgapModule = selectMHGAPModule(String(diagnosticCategory ?? "distress"), String(severity ?? "unspecified"));
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `${config.systemPrompt}

RUNTIME: Produce an evidence-based treatment-plan draft aligned with RANZCP / APS / Phoenix Australia / RACGP Refugee Health, MBS Better Access, and the locked deterministic mhGAP module supplied below.
Do not change or infer calculated scores or the mhGAP module. Never prescribe, repeat, or suggest medication dosages. Medication classes only. Always frame outputs as AI-generated decision support requiring clinician review.

Return ONLY a valid JSON object with this exact shape:
{
  "primary_interventions": [{"intervention": "", "rationale": "", "evidence_base": "", "priority": "urgent|high|moderate|low"}],
  "psychosocial_interventions": [{"therapy_type": "", "description": "", "target_symptoms": [], "session_frequency": "", "evidence_level": ""}],
  "pharmacological_considerations": {"indicated": false, "medication_classes": [{"class": "", "rationale": "", "monitoring_requirements": "", "cultural_considerations": ""}], "contraindications_to_assess": []},
  "monitoring_plan": {"follow_up_frequency": "", "outcome_measures": [], "red_flags": [], "review_timeline": ""},
  "referral_criteria": [{"trigger": "", "specialist_type": "", "urgency": "immediate|urgent|routine"}],
  "cultural_adaptations": [],
  "patient_education_points": [],
  "confidence": 0.0
}`;

    const clinicalSummary = buildClinicalContext(screeningData, mseFindings, patientContext, calculatedScores, mhgapModule);

    const guard = guardInput(clinicalSummary, 30000);
    async function callModel(model: string) {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: wrapUserContent(guard.text, "clinical_summary") },
          ],
          response_format: { type: "json_object" },
        }),
      });
      return r;
    }

    const outcome = await callWithValidation<any>(() => callModel(config.model), SCHEMAS["generate-treatment-plan"], undefined, (p: any) => p?.treatmentPlan ?? p);
    const base = { function_name: "generate-treatment-plan", actor_id: user.id, model_id: config.provenance.model_id, prompt_template_id: config.provenance.prompt_template_id, attempts: outcome.attempts, injection_patterns: guard.detections, pii: guard.pii, input_chars: clinicalSummary.length };
    if (outcome.gatewayStatus) return new Response(JSON.stringify({ error: `AI Gateway error: ${outcome.gatewayStatus}` }), { status: outcome.gatewayStatus, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!outcome.ok) {
      await logInference({ ...base, schema_valid: false, dosage_blocked: outcome.dosageBlocked, failure_reason: outcome.reason });
      await logConfidence({ function_name: "generate-treatment-plan", clinician_id: user.id, raw_confidence: null, patient_id: patientId ?? null, language_of_input: languageOfInput ?? null, provenance: config.provenance, error: true });
      return new Response(JSON.stringify({ error: FAIL_SAFE_MESSAGE, failSafe: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const treatmentPlan = outcome.value;
    const culturalFlags = findCulturalFlags(clinicalSummary, JSON.stringify(treatmentPlan), await loadDoNotPathologise());
    await logInference({ ...base, schema_valid: true, cultural_flags: culturalFlags });

    const confidence = typeof treatmentPlan?.confidence === "number" ? treatmentPlan.confidence : null;
    await logConfidence({ function_name: "generate-treatment-plan", clinician_id: user.id, raw_confidence: confidence, patient_id: patientId ?? null, language_of_input: languageOfInput ?? null, provenance: config.provenance });
    return new Response(
      JSON.stringify({
        treatmentPlan,
        confidence,
        provenance: config.provenance,
        safety: { pii_scrubbed: guard.pii, injection_detected: guard.detections.length > 0, injection_patterns: guard.detections, cultural_flags: culturalFlags },
        calculatedScores,
        mhgapModule,
        generatedAt: new Date().toISOString(),
        disclaimer: "AI-generated suggestion requiring clinical review.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("generate-treatment-plan error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
