import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the Aperta Health AI Clinical Assistant — embedded within a clinical decision support application used by Refugee Health Nurses, Bicultural Workers, GPs (MBS Mental Health Treatment Plan), Clinical Psychologists and Psychiatrists serving CALD and refugee populations in Australia.

Provide concise, evidence-based, culturally-aware guidance aligned with RACGP Refugee Health, RANZCP, APS, Phoenix Australia PTSD Guidelines, MBS Better Access, ICD-10-AM (default in AU) and WHO mhGAP as a secondary humanitarian reference.

Non-negotiable constraints:
- Never suggest specific medication dosages
- Never provide a definitive diagnosis — support clinical reasoning only
- Always recommend clinician review of AI output
- Flag high-risk presentations (suicidal ideation, psychosis, self-harm) immediately
- "AI suggests, clinician decides"`;

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

    const body = await req.json();
    const question = body.question ?? body.message;
    const context = body.context;
    if (!question) {
      return new Response(JSON.stringify({ error: "No question provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userContent = context
      ? `Context from current session:\n${context}\n\nQuestion: ${question}`
      : question;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: `AI Gateway error: ${aiResponse.status}` }),
        {
          status: aiResponse.status === 429 || aiResponse.status === 402 ? aiResponse.status : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Lovable AI gateway already streams in OpenAI-compatible SSE format — pass through.
    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("ask-ai error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
