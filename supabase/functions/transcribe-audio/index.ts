import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, languageCode = "en-US" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!audio) {
      throw new Error("No audio data provided");
    }

    console.log("Processing audio transcription with Gemini via Lovable AI...");
    console.log("Language code:", languageCode);
    console.log("Audio data length:", audio.length);

    // Extract base language for prompt
    const language = languageCode.split('-')[0];
    const languageHint = language !== 'en' ? ` The audio may be in ${languageCode}.` : '';

    // Use Gemini's multimodal capabilities for audio transcription
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: [
            { 
              type: "text", 
              text: `Transcribe this audio recording accurately and completely. Output ONLY the transcription text with no additional commentary, labels, or formatting.${languageHint}` 
            },
            { 
              type: "input_audio", 
              input_audio: {
                data: audio,
                format: "webm"
              }
            }
          ]
        }]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI transcription error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      
      if (response.status === 402) {
        throw new Error("Payment required. Please add credits to your Lovable workspace.");
      }
      
      throw new Error(`Transcription failed: ${errorText}`);
    }

    const result = await response.json();
    console.log("Transcription response received");

    // Extract transcription from chat completion response
    const transcribedText = result.choices?.[0]?.message?.content;
    
    if (!transcribedText) {
      console.warn("No transcript found in response:", JSON.stringify(result));
      throw new Error("No speech detected in audio");
    }

    console.log("Transcription successful, length:", transcribedText.length);

    return new Response(JSON.stringify({ text: transcribedText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in transcribe-audio function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
