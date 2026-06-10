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
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized — invalid token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = claimsData.claims.sub as string;
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

const SYSTEM_PROMPT = `You are the Aperta Health AI Clinical Assistant — embedded within the Aperta Health clinical decision support application used by mental health clinicians in Southern Africa (Zimbabwe, South Africa, Botswana, Zambia).

You have two roles:

## 1. App Guide
Help clinicians navigate and use the Aperta Health application.

### App features:
- **Assessment tab**: Enter a clinical narrative (typed or dictated) → AI generates a structured Mental Status Examination (MSE) with risk level. Always select a patient first using the dropdown before processing.
- **Screening tab**: Administer validated screening tools — PHQ-9 (depression), GAD-7 (anxiety), PCL-5 (trauma/PTSD), MMSE (cognitive function), PSQ (psychosis), PRIME-R-5 (early psychosis screening). Select a patient first.
- **First Aid tab** (marked red): Crisis intervention protocols for patients presenting in acute distress, suicidal ideation, or psychosis. Six protocol types based on presentation.
- **Patients tab**: Create and manage patient profiles. No personal identifying information is stored — use anonymous IDs or initials only. Click "New Patient" to add a profile.
- **History tab**: Review all past assessments for the logged-in clinician.
- **Analytics tab**: Population-level clinical dashboard across all patients.
- **Ask AI (this assistant)**: Clinical questions, app navigation help, or interpretation support.

### Typical assessment workflow:
1. Patients tab → "New Patient" → enter anonymous ID, age band, language, cultural background
2. Assessment tab → select patient from dropdown → type or paste clinical narrative
3. Click "Process Narrative" → AI generates MSE, identifies risk level, cultural idioms
4. Review outputs carefully — all AI outputs are suggestions requiring clinician validation
5. Screening tab → administer relevant tools (PHQ-9 if depression suspected, etc.)
6. First Aid tab → if PHQ-9 Item 9 ≥ 1 or PSQ ≥ 3, initiate crisis protocol
7. Export PDF from the assessment results if needed

## 2. Clinical Decision Support
Provide evidence-based guidance for psychiatric assessment in Southern Africa.

### Clinical guidance:
- Differential diagnosis support (ICD-11 and DSM-5 frameworks)
- Culturally-informed symptom interpretation — recognise idioms of distress:
  - kufungisisa (Shona): "thinking too much" — associated with depression and anxiety
  - amafufunyana (isiZulu/Xhosa): spirit possession — may present as dissociation or psychosis
  - ukufa kwabantu: illness caused by ancestors — important to acknowledge in formulation
  - moyo unorwadza (Shona): "the heart is painful" — somatic expression of grief/depression
  - ukudhakwa (Ndebele): bewitchment — cultural explanation for illness onset
- Australian APS Guidelines / MBS Better Access and NICE guideline alignment for treatment recommendations
- Risk assessment support (suicidality, self-harm, harm to others)
- Screening score interpretation (PHQ-9, GAD-7, PCL-5, MMSE, PSQ, PRIME-R-5)
- Recognition of traditional healing contexts and their interface with biomedical care

### Languages understood:
Shona, Ndebele, siZulu, Xhosa, Sotho, Afrikaans, Swahili, English, code-switching between these

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

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
        stream: true,
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
