import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { loadAIConfig, AIConfigError } from "../_shared/ai-registry.ts";
import { guardInput, wrapUserContent } from "../_shared/input-guard.ts";
import { logInference } from "../_shared/output-guard.ts";
import { containsMedicationDosage } from "../_shared/clinical-rules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const qGuard = guardInput(String(question), 8000);
    const cGuard = guardInput(typeof context === "string" ? context : context ? JSON.stringify(context) : "", 20000);
    const detections = [...new Set([...qGuard.detections, ...cGuard.detections])];
    const userContent = (cGuard.text ? `Context from current session:\n${wrapUserContent(cGuard.text, "session_context")}\n\n` : "") + `Question:\n${wrapUserContent(qGuard.text, "clinician_question")}`;

    let config;
    try { config = await loadAIConfig("ask-ai"); } catch (e) {
      if (e instanceof AIConfigError) return new Response(JSON.stringify({ error: e.message }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw e;
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: config.systemPrompt },
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

    // Stream through a dosage filter: if a dose appears, cut the answer off with a safe message.
    const SAFE = "\n\n[Response stopped: medication dosage content is blocked. AI suggestion unavailable, clinical review required.]";
    let fullText = "";
    let blocked = false;
    let buffer = "";
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const transform = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        if (blocked) return;
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (t.startsWith("data: ") && t !== "data: [DONE]") {
            try { fullText += JSON.parse(t.slice(6))?.choices?.[0]?.delta?.content ?? ""; } catch { /* partial */ }
          }
          if (containsMedicationDosage(fullText)) {
            blocked = true;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: SAFE } }] })}\n\ndata: [DONE]\n\n`));
            controller.terminate();
            return;
          }
          controller.enqueue(encoder.encode(line + "\n"));
        }
      },
      flush(controller) {
        if (!blocked && buffer) controller.enqueue(encoder.encode(buffer));
        logInference({ function_name: "ask-ai", actor_id: user.id, model_id: config.provenance.model_id, prompt_template_id: config.provenance.prompt_template_id, schema_valid: !blocked, dosage_blocked: blocked, injection_patterns: detections, pii: { count: qGuard.pii.count + cGuard.pii.count, types: [...new Set([...qGuard.pii.types, ...cGuard.pii.types])] }, failure_reason: blocked ? "medication dosage detected" : null, input_chars: String(question).length });
      },
    });
    if (detections.length) logInference({ function_name: "ask-ai", actor_id: user.id, model_id: config.provenance.model_id, schema_valid: true, injection_patterns: detections });
    return new Response(aiResponse.body!.pipeThrough(transform), {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Aperta-Model": config.provenance.model_id, "X-Aperta-Prompt-Version": config.provenance.prompt_template_version, "X-Aperta-Injection": detections.length ? "detected" : "none", "Access-Control-Expose-Headers": "X-Aperta-Model, X-Aperta-Prompt-Version, X-Aperta-Injection" },
    });
  } catch (error) {
    console.error("ask-ai error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
