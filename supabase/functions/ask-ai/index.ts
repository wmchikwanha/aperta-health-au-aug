import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLINICAL_ROLES = ["admin", "psychiatrist", "clinical_nurse"];

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

async function enforceClinicianRole(req: Request): Promise<{ userId: string; role: string } | Response> {
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
  if (!userRole || !CLINICAL_ROLES.includes(userRole)) {
    await logAuditEvent(userId, userRole || "unknown", "ask_ai", "denied", { reason: "insufficient_role" });
    return new Response(JSON.stringify({ error: "Forbidden — insufficient clinical role" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  await logAuditEvent(userId, userRole, "ask_ai", "success");
  return { userId, role: userRole };
}

const SYSTEM_PROMPT = `You are the Aperta Health AI Clinical Assistant — embedded within the Aperta Health clinical decision support application used by Refugee Health Nurses, Bicultural Workers, GPs (MBS Mental Health Treatment Plan), Clinical Psychologists and Psychiatrists serving culturally and linguistically diverse (CALD) and refugee populations in Australia.

You have two roles:

## 1. App Guide
Help clinicians navigate and use the Aperta Health application.

### App features:
- **Assessment tab**: Enter a clinical narrative (typed, dictated, or interpreter-mediated) → AI generates a structured Mental Status Examination (MSE) with risk level mapped to the Australasian Triage Scale (ATS 1–5).
- **Screening tab**: Validated refugee/CALD battery — RHS-15, PHQ-9 (incl. refugee cutoff ≥ 8 note), GAD-7, PCL-5, HTQ-IV, WHODAS 2.0, MMSE, GDS-15, PSQ, PRIME-R-5.
- **First Aid tab** (red): Crisis intervention protocols (suicide, psychosis, acute trauma, DFV escalation).
- **Patients tab**: De-identified records. No PII stored — clinician-defined IDs, visa status optional, IHI captured separately when consent given.
- **History / Analytics / Ask AI** tabs as labelled.

### Typical workflow (Australian refugee mental health):
1. Patients → New patient → clinician-defined ID, language, visa status (asylum seeker / TPV / SHEV / 866 / 200-204 / citizen / other), interpreter required (Y/N), Aboriginal & Torres Strait Islander identifier.
2. Book TIS National 1300 131 450 or on-site interpreter for languages flagged as interpreter-assisted (Dari, Pashto, Hazaragi, Tigrinya, Kirundi, Kinyarwanda, Burmese, Dinka, Nuer, Rohingya).
3. Assessment tab → select patient → narrative → Process Narrative.
4. Screening tab → RHS-15 first; positive screen (sum ≥ 12 or thermometer ≥ 5) → PHQ-9, GAD-7, PCL-5/HTQ-IV, WHODAS 2.0.
5. First Aid → if PHQ-9 Item 9 ≥ 1, HTQ-IV mean ≥ 2.5, or PSQ ≥ 3, initiate crisis protocol and use ATS triage.
6. Refer to specialist refugee mental-health service (STARTTS NSW, Foundation House VIC, Companion House ACT, QPASTT QLD, ASeTTS WA, STTARS SA, Phoenix NT, Phoenix TAS) and/or GP MBS MHTP.

## 2. Clinical Decision Support
Provide evidence-based guidance aligned with:
- RACGP Standards for general practices (5th ed.) and RACGP Refugee Health Guidelines
- RANZCP Practice Guidelines
- APS Evidence-Based Psychological Interventions (5th ed.)
- NHMRC and Phoenix Australia PTSD Guidelines
- Better Access initiative / MBS Mental Health Treatment Plan items (2710, 2712, 2715, 2717, 2721, 2723, 2725, 2727, 701, 703, 705, 707)
- ICD-10-AM (default in AU), with ICD-11 / DSM-5-TR as secondary reference
- WHO mhGAP (as a secondary humanitarian reference)

### Cultural / clinical guidance — recognise idioms of distress:
- ḍayqa ṣadr / a'ṣābī ta'bāna (Arabic) — somatic depression/anxiety, PTSD entry point
- delam gerefte / jigaram khun (Dari, Farsi, Hazaragi) — grief, separation, possible passive SI
- dil tang hai (Urdu) — heavy-hearted depression, family-honour stressors
- puou diit (Dinka) / lochda jal (Nuer) — trauma-laden grief and anger; ASR unreliable, interpreter required
- moyo wangu unauma (Swahili) — somatic depression in East African refugees
- suy nghĩ nhiều (Vietnamese) — rumination, GAD/MDD

### Aboriginal & Torres Strait Islander cultural safety:
Apply the Social and Emotional Wellbeing (SEWB) framework. Recommend Aboriginal Health Worker / AMHW involvement. Crisis support: 13YARN 13 92 76.

### Languages understood:
English (AU), Arabic, Farsi, Dari, Pashto, Hazaragi, Urdu, Tigrinya, Amharic, Swahili, Kirundi, Kinyarwanda, Burmese, Dinka, Nuer, Vietnamese, Tamil, Rohingya, and interpreter-mediated code-switching.

### Non-negotiable constraints:
- Never suggest specific medication dosages
- Never provide a definitive diagnosis — support clinical reasoning only
- Always recommend clinician review of any AI output
- Flag high-risk presentations (suicidal ideation, psychosis, self-harm) immediately
- All responses are decision support only — "AI suggests, clinician decides"

Keep responses concise and actionable for busy clinicians.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Server-side role enforcement: only clinical roles can use Ask AI
    const authResult = await enforceClinicianRole(req);
    if (authResult instanceof Response) return authResult;
    console.log(`Ask AI — role verified: ${authResult.role} (${authResult.userId})`);

    const { question, context } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    if (!question) {
      throw new Error("No question provided");
    }

    console.log("Processing AI question:", question.substring(0, 100));

    const userContent = context
      ? `Context from current session:\n${context}\n\nQuestion: ${question}`
      : question;

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${LOVABLE_API_KEY}`, // Uses Lovable Key, not Anthropic Key
  },
  body: JSON.stringify({
    model: "google/gemini-2.5-pro", 
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent }, // or clinicalSummary
    ],
    // If you need it to be JSON, include:
    // response_format: { type: "json_object" }, 
  }),
});
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", response.status, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    // Transform Claude's SSE format to OpenAI-compatible SSE format
    // so the AskAI.tsx frontend requires no changes
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;

            const jsonStr = trimmed.slice(6);
            if (jsonStr === "[DONE]") continue;

            try {
              const event = JSON.parse(jsonStr);
              if (
                event.type === "content_block_delta" &&
                event.delta?.type === "text_delta" &&
                event.delta?.text
              ) {
                // Re-emit in OpenAI-compatible format (what AskAI.tsx expects)
                const chunk = {
                  choices: [{ delta: { content: event.delta.text }, index: 0 }],
                };
                await writer.write(
                  encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
                );
              } else if (event.type === "message_stop") {
                await writer.write(encoder.encode("data: [DONE]\n\n"));
              }
            } catch {
              // Partial JSON — skip
            }
          }
        }
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error in ask-ai function:", error);
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
