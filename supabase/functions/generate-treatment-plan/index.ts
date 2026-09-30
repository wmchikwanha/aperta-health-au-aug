import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { containsMedicationDosage, normalizeCalculatedScores, selectMHGAPModule } from "../_shared/clinical-rules.ts";
import { loadAIConfig, AIConfigError, logConfidence } from "../_shared/ai-registry.ts";

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
            { role: "user", content: clinicalSummary },
          ],
          response_format: { type: "json_object" },
        }),
      });
      return r;
    }

    let aiResponse = await callModel(config.model);
    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: `AI Gateway error: ${aiResponse.status}` }), {
        status: aiResponse.status === 429 || aiResponse.status === 402 ? aiResponse.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let aiData = await aiResponse.json();
    let content = aiData?.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI returned empty response");

    let treatmentPlan: any;
    try {
      treatmentPlan = typeof content === "string" ? JSON.parse(content) : content;
    } catch (e) {
      console.error("Failed to parse AI JSON:", content);
      throw new Error("AI returned invalid JSON");
    }
    if (containsMedicationDosage(treatmentPlan)) {
      return new Response(JSON.stringify({ error: "Treatment plan rejected because medication dosage content was detected. Please regenerate." }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const confidence = typeof treatmentPlan?.confidence === "number" ? treatmentPlan.confidence : null;
    await logConfidence({ function_name: "generate-treatment-plan", clinician_id: user.id, raw_confidence: confidence, patient_id: patientId ?? null, language_of_input: languageOfInput ?? null, provenance: config.provenance });
    return new Response(
      JSON.stringify({
        treatmentPlan,
        confidence,
        provenance: config.provenance,
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
