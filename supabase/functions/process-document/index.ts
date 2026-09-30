import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { loadAIConfig, AIConfigError } from "../_shared/ai-registry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const WORD_TYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI service is not configured" }, 500);

    const { document, fileName, mimeType } = await req.json();
    if (!document || typeof document !== "string") return json({ error: "No document data provided" }, 400);

    if (WORD_TYPES.includes(mimeType)) {
      return json({ error: "Word documents (.doc/.docx) cannot be processed directly. Please save as PDF or paste the text into the narrative field." }, 422);
    }
    const isPDF = mimeType === "application/pdf";
    if (!isPDF && !IMAGE_TYPES.includes(mimeType)) {
      return json({ error: `Unsupported file type: ${mimeType}. Please upload a PDF, image, or plain text file.` }, 422);
    }

    let config;
    try { config = await loadAIConfig("process-document"); } catch (e) {
      if (e instanceof AIConfigError) return json({ error: e.message }, 503);
      throw e;
    }

    const dataUrl = `data:${mimeType};base64,${document}`;
    const filePart = isPDF
      ? { type: "file", file: { filename: fileName || "document.pdf", file_data: dataUrl } }
      : { type: "image_url", image_url: { url: dataUrl } };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: config.systemPrompt },
          { role: "user", content: [filePart, { type: "text", text: `Extract all text content from this document (${fileName}).` }] },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Document AI error:", response.status, errorText);
      const status = [402, 403, 429].includes(response.status) ? response.status : 500;
      return json({ error: `Document processing failed (${response.status})` }, status);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    return json({ text, fileName, provenance: config.provenance });
  } catch (error) {
    console.error("Error processing document:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
