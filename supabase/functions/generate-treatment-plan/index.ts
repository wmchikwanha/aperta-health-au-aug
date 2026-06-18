import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildClinicalContext(screeningData: any[], mseFindings: any, patientContext: any): string {
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

    const { screeningData, mseFindings, patientContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an expert clinical strategist for Australian CALD / refugee mental-health.
Produce an evidence-based treatment plan aligned with RANZCP / APS / Phoenix Australia / RACGP Refugee Health and the MBS Better Access pathway.
Never prescribe specific medication dosages. Always frame outputs as decision support requiring clinician review.

Return ONLY a valid JSON object with this exact shape:
{
  "primary_interventions": [{"intervention": "", "rationale": "", "evidence_base": "", "priority": "urgent|high|moderate|low"}],
  "psychosocial_interventions": [{"therapy_type": "", "description": "", "target_symptoms": [], "session_frequency": "", "evidence_level": ""}],
  "pharmacological_considerations": {"indicated": false, "medication_classes": [{"class": "", "rationale": "", "monitoring_requirements": "", "cultural_considerations": ""}], "contraindications_to_assess": []},
  "monitoring_plan": {"follow_up_frequency": "", "outcome_measures": [], "red_flags": [], "review_timeline": ""},
  "referral_criteria": [{"trigger": "", "specialist_type": "", "urgency": "immediate|urgent|routine"}],
  "cultural_adaptations": [],
  "patient_education_points": []
}`;

    const clinicalSummary = buildClinicalContext(screeningData, mseFindings, patientContext);

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

    let aiResponse = await callModel("google/gemini-2.5-flash");
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
    if (!content) {
      console.warn("Flash returned empty content, retrying with gemini-2.5-pro");
      const retry = await callModel("google/gemini-2.5-pro");
      if (retry.ok) {
        aiData = await retry.json();
        content = aiData?.choices?.[0]?.message?.content;
      }
    }
    if (!content) throw new Error("AI returned empty response");

    let treatmentPlan: any;
    try {
      treatmentPlan = typeof content === "string" ? JSON.parse(content) : content;
    } catch (e) {
      console.error("Failed to parse AI JSON:", content);
      throw new Error("AI returned invalid JSON");
    }

    return new Response(
      JSON.stringify({
        treatmentPlan,
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
