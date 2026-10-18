import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { loadAIConfig, AIConfigError } from "../_shared/ai-registry.ts";
import { guardInput } from "../_shared/input-guard.ts";
import { logInference } from "../_shared/output-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { audio, languageCode = "en-US" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI service is not configured" }, 500);
    if (!audio || typeof audio !== "string") return json({ error: "No audio data provided" }, 400);
    if (audio.length > 15_000_000) return json({ error: "Audio chunk too large" }, 413);

    let config;
    try { config = await loadAIConfig("transcribe-audio"); } catch (e) {
      if (e instanceof AIConfigError) return json({ error: e.message }, 503);
      throw e;
    }

    const languageHint = !String(languageCode).startsWith("en") ? ` The audio may be in ${languageCode}.` : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: config.systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: `Transcribe this audio recording accurately and completely.${languageHint}` },
              { type: "input_audio", input_audio: { data: audio, format: "webm" } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Transcription error:", response.status, errorText);
      if (response.status === 429) return json({ error: "Rate limit exceeded. Please try again in a moment." }, 429);
      if (response.status === 402) return json({ error: "AI credits exhausted. Please add credits to your workspace." }, 402);
      return json({ error: `Transcription failed (${response.status})` }, response.status === 403 ? 403 : 500);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    let text = "", translation = "", detectedLanguage = languageCode;
    try {
      const parsed = JSON.parse(content || "{}");
      text = parsed.text || "";
      translation = parsed.translation || "";
      detectedLanguage = parsed.detectedLanguage || languageCode;
    } catch {
      text = content || "";
    }
    if (!text) return json({ error: "No speech detected in audio" }, 422);

    // Transcripts are later fed to other AI functions; neutralise spoken injection attempts here too.
    const tGuard = guardInput(text, 60000);
    const trGuard = guardInput(translation, 60000);
    const detections = [...new Set([...tGuard.detections, ...trGuard.detections])];
    if (detections.length) await logInference({ function_name: "transcribe-audio", model_id: config.provenance.model_id, schema_valid: true, injection_patterns: detections });
    return json({ text: tGuard.text, translation: trGuard.text, detectedLanguage, provenance: config.provenance, safety: { injection_detected: detections.length > 0, injection_patterns: detections } });
  } catch (error) {
    console.error("Error in transcribe-audio function:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
