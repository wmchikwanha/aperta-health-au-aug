import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader! } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { patientId, clinicalSummary } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "You are an expert clinical strategist. Create a treatment plan based on the provided summary." },
          { role: "user", content: clinicalSummary }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const result = await aiResponse.json();
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
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

  context += 'Generate culturally responsive, RANZCP / APS / Phoenix Australia / RACGP Refugee Health-aligned treatment recommendations for this presentation, structured around the MBS Better Access / Mental Health Treatment Plan and Australian refugee mental-health service pathways.';
  return context;
}
