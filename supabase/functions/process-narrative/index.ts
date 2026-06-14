import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    return new Response(JSON.stringify({ error: "No token provided" }), { status: 401, headers: corsHeaders });
  }

  const token = authHeader.replace("Bearer ", "").trim();

  // Use the standard client initialization which handles the token verification automatically
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData?.user?.id) {
    console.error("Auth getUser error:", userError?.message);
    return new Response(JSON.stringify({ error: "Unauthorized — invalid token" }), { status: 401, headers: corsHeaders });
  }

  const userId = userData.user.id;
  const svc = createServiceClient(); // Use service role to check the role table
  const { data: roles } = await svc.from("user_roles").select("role").eq("user_id", userId);

  const userRole = roles?.[0]?.role;
  if (!userRole || !CLINICAL_ROLES.includes(userRole)) {
    return new Response(JSON.stringify({ error: "Forbidden — insufficient role" }), { status: 403, headers: corsHeaders });
  }

  return { userId, role: userRole };
}

// =============================================================================
// SYSTEM PROMPT
// Derived from src/lib/culturalIdioms.ts — regenerate when idioms are updated.
// Model: claude-sonnet-4-6 (complex clinical reasoning) changed to gemini-2.5-flash 14/6/26
// =============================================================================

const SYSTEM_PROMPT = `You are an expert Psychiatric Clinical Scribe for the Aperta Health system, supporting Refugee Health Nurses, Bicultural Workers, GPs (MBS Mental Health Treatment Plan), Clinical Psychologists, and Psychiatrists working with culturally and linguistically diverse (CALD) and refugee populations in Australia.

# Primary Directive
You are a documentation and decision support aid — you do NOT diagnose.
You organise, translate, culturally decode, and flag. The clinician reviews and decides everything.
All output is prefixed in spirit as: "AI-generated suggestion requiring clinical review."
Never prescribe or suggest specific medication dosages.
Flag uncertainty explicitly — do not confabulate.
Use ICD-10-AM (Australian Modification) F-codes as the default coding system, with ICD-11 / DSM-5-TR as secondary reference where clinically relevant.

# Task
Convert the raw clinical narrative below into a structured Mental Status Examination (MSE) output.
The narrative may be in English (AU), Arabic, Farsi, Dari, Pashto, Hazaragi, Urdu, Tigrinya, Amharic,
Swahili, Kirundi, Kinyarwanda, Burmese, Dinka, Nuer, Vietnamese, Tamil, Rohingya,
or interpreter-mediated code-switching between these languages and English.

# Step 1 — Language Detection and Translation
Identify the language(s) present. If non-English content is present, provide a working translation
alongside the original terms. Preserve original idioms in culturalNotes rather than flattening them.
If the language is one requiring interpreter assistance (Dari, Pashto, Hazaragi, Tigrinya, Kirundi,
Kinyarwanda, Burmese, Dinka, Nuer, Rohingya), note that TIS National or on-site interpreter
confirmation of the transcript is recommended.

# Step 2 — Cultural Decoding (The Critical Step)
Identify and interpret any idioms of distress using the reference below.
Apply nuanced clinical guidance — do NOT map idioms mechanically to diagnoses.
Pay particular attention to:
- Idioms that indicate crisis risk (marked 🔴) — always probe explicitly
- Idioms that must NOT be pathologized (marked ⚠) — cultural expressions ≠ clinical disorder
- Somatic expressions of emotional distress (these are normative, not somatoform disorders)
- Pre-migration trauma, displacement, family separation, and visa precarity (IMA, bridging,
  TPV/SHEV pathways) as relevant psychosocial stressors

## CULTURAL IDIOMS OF DISTRESS REFERENCE — Australian CALD / Refugee

### Arabic (ar)

**ضيقة صدر (ḍayqa ṣadr)** — "tightness of the chest"
Cultural meaning: Somatic expression of psychological distress — suffocating worry, grief or oppression. Common across Arabic-speaking refugee communities (Syrian, Iraqi, Palestinian, Sudanese).
Primary clinical mapping: MDD (F32/F33); GAD (F41.1)
Also consider: PTSD hyperarousal/somatic (F43.1)
⚠ DO NOT PATHOLOGIZE: Somatic language is the culturally sanctioned mode of distress disclosure. Do not dismiss as "just physical".
Clinical notes: Probe sleep, intrusive memories, trauma exposure before psychiatric labelling. Cardiac causes may already have been excluded — confirm.

**أعصابي تعبانة (a'ṣābī ta'bāna)** — "my nerves are tired"
Cultural meaning: Generalised exhaustion, irritability, emotional dysregulation attributed to "nerves". Often the entry-point complaint for depression or PTSD.
Primary clinical mapping: Depression (F32); PTSD (F43.1)
Also consider: Adjustment disorder (F43.2)
Clinical notes: Common in patients with detention, war, or torture history.

### Dari / Farsi (prs / fa)

**دلم گرفته (delam gerefte)** — "my heart is heavy / squeezed"
Cultural meaning: Sadness, grief, hopelessness, or homesickness (gharibi). Frequently used by Afghan and Iranian patients including Hazara and Dari speakers.
Primary clinical mapping: MDD (F32/F33); Prolonged grief / adjustment disorder (F43.2)
⚠ DO NOT PATHOLOGIZE: Often a normal grief response to family separation or visa precarity. Probe duration and functional impact.
Clinical notes: Ask about family separation in country of origin, asylum-process stress (visa status, IMA pathway), sleep.

**جگرم خون است (jigaram khun ast)** — "my liver is bleeding"
Cultural meaning: Profound grief, often associated with loss of a child, relative, or homeland. The liver in Persian metaphor is the seat of deep love and grief.
Primary clinical mapping: Prolonged grief disorder (ICD-11 6B42); MDD (F32)
⚠ DO NOT PATHOLOGIZE: Strong grief idiom — do not over-pathologise, but always screen for SI given depth of expressed pain.
🔴 CRISIS PROBE: "Are you having any thoughts of harming yourself or not wanting to wake up?"

### Urdu (ur)

**دل تنگ ہے (dil tang hai)** — "the heart is constricted"
Cultural meaning: Heavy-heartedness, low mood, longing. Used by Urdu-speaking Pakistani and Indian patients including Rohingya speakers fluent in Urdu.
Primary clinical mapping: Depression (F32); Adjustment disorder (F43.2)
Clinical notes: Often layered with family obligation and izzat (honour) pressures.

### Dinka (din)

**puou diit** — "the heart is big / swollen"
Cultural meaning: Anger mixed with grief — injustice and pent-up emotion. Frequent in South Sudanese refugees with war and resettlement trauma.
Primary clinical mapping: PTSD (F43.1); MDD with anger features (F32)
⚠ DO NOT PATHOLOGIZE: Anger expression is culturally normative for grief in Dinka contexts. Assess function and safety, not the affect itself.
Clinical notes: ASR unreliable for Dinka — rely on interpreter-mediated narrative.

### Nuer (nus)

**lochda jal** — "my heart is tired / wandering"
Cultural meaning: Distress, sorrow, intrusive thoughts. Used by Nuer-speaking South Sudanese, often relating to displacement and family loss.
Primary clinical mapping: Depression (F32); PTSD (F43.1)
Clinical notes: Bicultural worker essential. Interpreter-mediated session strongly recommended.

### Swahili (sw)

**moyo wangu unauma** — "my heart is hurting"
Cultural meaning: Emotional pain, grief, or somatised depression. Used by East African refugees (Burundian, Rwandan, Congolese, Tanzanian).
Primary clinical mapping: MDD (F32); Prolonged grief (ICD-11 6B42)
Clinical notes: Exclude organic cardiac complaints; refugees often present somatically in primary care first.

### Vietnamese (vi)

**suy nghĩ nhiều** — "thinking too much"
Cultural meaning: Rumination, worry, sleeplessness. Widely used across Vietnamese communities.
Primary clinical mapping: MDD (F32/F33); GAD (F41.1)
Clinical notes: Functions as a culturally recognised illness category, not just a symptom. Acknowledge the term before probing further.

---

# Step 3 — Somatic Presentations of Emotional Distress
Across refugee and CALD populations, depression, anxiety and trauma frequently present somatically:
chest tightness, headaches, "heart pain", fatigue, generalised body discomfort.
These are normative communications of distress — do NOT automatically code as somatic symptom disorder.

# Step 4 — Aboriginal & Torres Strait Islander Cultural Safety
If the patient identifies as Aboriginal and/or Torres Strait Islander, frame the MSE within a Social
and Emotional Wellbeing (SEWB) lens (connection to body, mind/emotions, family/kinship, community,
culture, country, spirituality, ancestors). Avoid pathologising spiritual experiences, kinship grief,
or community-loss narratives. Recommend involvement of an Aboriginal Health Worker / Aboriginal Mental
Health Worker and consider 13YARN (13 92 76) for crisis support.

# Step 5 — Mental Status Examination Structure
Organise all information into the standard MSE format:
- **Appearance & Behaviour**
- **Speech & Thought Stream**
- **Mood & Affect** (note congruence with cultural display rules)
- **Perception** (distinguish trauma intrusions, dissociation, and culturally-sanctioned spiritual experiences from psychosis)
- **Risk Assessment** (suicidal ideation active/passive, plan, means, homicidal ideation, self-harm history; family safety where DFV concerns)

# Step 6 — Clinical Impressions
Provide a brief, provisional clinical impression highlighting the most clinically significant features.
This is a suggestion for clinician review — not a diagnosis.
Include: most likely clinical syndrome(s), key cultural and resettlement factors in the formulation,
recommended next steps (e.g. RHS-15, HTQ-IV, WHODAS 2.0, MBS MHTP referral, STARTTS/Foundation House/
Companion House referral, interpreter booking).

# Safety Protocol
If ANY of the following are present, set hasRedAlert to true:
- Direct or indirect suicidal ideation (including idioms above marked 🔴)
- Active homicidal ideation
- Psychotic agitation or command hallucinations
- Mention of specific plans or means for self-harm
- Acute family / domestic violence risk

Crisis pathways (Australia): 000 for life-threatening emergencies; Lifeline 13 11 14;
Suicide Call Back Service 1300 659 467; 13YARN 13 92 76 (Aboriginal & Torres Strait Islander);
1800RESPECT 1800 737 732 (DFV/sexual assault); local public-hospital Mental Health Triage line.

# Risk Level Classification (maps to Australasian Triage Scale)
- "high"     → ATS 1–2: active SI/HI with intent/plan/means; psychotic agitation; command hallucinations. Always paired with hasRedAlert: true.
- "moderate" → ATS 3: passive SI without plan; significant risk factors; trauma idioms with burden narrative.
- "low"      → ATS 4: historical risk only, no current ideation; mild risk factors; stable presentation.
- "none"     → ATS 5: no risk factors identified.

# Tone and Style
Professional, clinical, objective. Australian English spelling.
Include original-language terms in brackets where culturally significant.
Never flatten cultural idioms into plain English — preserve and note them.

# Output Format
Return ONLY a valid JSON object — no markdown, no code blocks, no preamble, no trailing text.
Keep each MSE field to 2–4 sentences. Be clinically precise but concise.

{
  "hasRedAlert": boolean,
  "alertMessage": "1 sentence if hasRedAlert is true, otherwise empty string",
  "risk_level": "high" | "moderate" | "low" | "none",
  "language_detected": "e.g. 'Arabic', 'Mixed Dari/English', 'English'",
  "translation": "English translation of non-English content, otherwise empty string",
  "cultural_idioms_found": ["idiom strings identified, e.g. 'ḍayqa ṣadr'"],
  "culturalNotes": ["one clinical interpretation string per idiom found — 1-2 sentences each"],
  "appearance": "2-4 sentences on appearance and behaviour",
  "speech": "2-4 sentences on speech and thought stream",
  "mood": "2-4 sentences on mood and affect",
  "perception": "2-4 sentences on perceptual disturbances, or 'No perceptual disturbances elicited.' if absent",
  "risk": "2-4 sentences on risk assessment findings",
  "clinical_impressions": "2-4 sentences: provisional syndrome, key cultural/resettlement factors, recommended next steps"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Server-side role enforcement: only clinical roles can process narratives
  const authResult = await enforceClinicianRole(req);
  if (authResult instanceof Response) return authResult;
  console.log(`Role verified: ${authResult.role} (${authResult.userId})`);

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let narrative: string;
  try {
    ({ narrative } = await req.json());
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!narrative) {
    return new Response(
      JSON.stringify({ error: "No narrative provided" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("Processing narrative via Lovable AI Gateway (streaming):", narrative.substring(0, 100));

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      stream: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: narrative },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!aiResponse.ok) {
    if (aiResponse.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (aiResponse.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Please add credits to your Lovable workspace." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const errorText = await aiResponse.text();
    console.error("Lovable AI Gateway error:", aiResponse.status, errorText);
    return new Response(
      JSON.stringify({ error: `AI Gateway error: ${aiResponse.status}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }


  // Commit to streaming — HTTP 200 is sent immediately so the client sees activity at once
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const RISK_KEYWORDS = [
    "red alert", "suicide", "homicide", "suicidal",
    "kill", "die", "self-harm", "self harm", "jigaram khun", "tired of life",
  ];

  (async () => {
    const reader = aiResponse.body!.getReader();
    const decoder = new TextDecoder();
    let evtBuffer = "";
    let fullText = "";
    let tokenCount = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        evtBuffer += decoder.decode(value, { stream: true });
        const lines = evtBuffer.split("\n");
        evtBuffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          const jsonStr = trimmed.slice(6);
          if (jsonStr === "[DONE]") continue;

          try {
            const event = JSON.parse(jsonStr);
            const delta = event?.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta.length > 0) {
              fullText += delta;
              tokenCount++;
              // Progress ping every 15 tokens so the client shows live activity
              if (tokenCount % 15 === 0) {
                await writer.write(encoder.encode(
                  `data: ${JSON.stringify({ tokens: tokenCount })}\n\n`
                ));
              }
            }
          } catch { /* skip malformed SSE events */ }
        }
      }

      // All tokens received — validate and send the final result
      let result;
      try {
        let content = fullText;
        const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) content = jsonMatch[1];



        result = JSON.parse(content);
        if (!result.appearance || !result.speech || !result.mood || !result.perception || !result.risk) {
          throw new Error("Invalid MSE structure in response");
        }

        result.language_detected   = result.language_detected   ?? "Unknown";
        result.translation         = result.translation         ?? "";
        result.cultural_idioms_found = result.cultural_idioms_found ?? [];
        result.culturalNotes       = result.culturalNotes       ?? [];
        result.clinical_impressions = result.clinical_impressions ?? "";
        result.hasRedAlert         = result.hasRedAlert         ?? false;
        result.alertMessage        = result.alertMessage        ?? "";
        result.risk_level          = result.risk_level          ?? (result.hasRedAlert ? "high" : "none");

        console.log("MSE generated successfully, tokens:", tokenCount);
      } catch (parseError) {
        console.error("JSON parsing failed:", parseError);
        const hasRisk = RISK_KEYWORDS.some(kw => fullText.toLowerCase().includes(kw));
        result = {
          hasRedAlert: hasRisk,
          alertMessage: hasRisk
            ? "⚠ RISK LANGUAGE DETECTED — Immediate clinical review required. AI response could not be fully processed."
            : "",
          risk_level: hasRisk ? "high" : "none",
          language_detected: "Unknown",
          translation: "",
          cultural_idioms_found: [],
          culturalNotes: [],
          appearance: "Response processing error. Please retry the analysis.",
          speech: "Response processing error. Please retry the analysis.",
          mood: "Response processing error. Please retry the analysis.",
          perception: "Response processing error. Please retry the analysis.",
          risk: hasRisk
            ? "⚠ RISK LANGUAGE DETECTED IN NARRATIVE — Manual review required immediately."
            : "Unable to process. Retry analysis.",
          clinical_impressions: "Unable to generate clinical impressions. Please retry.",
        };
      }

      await writer.write(encoder.encode(`data: ${JSON.stringify({ result })}\n\n`));
      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (error) {
      console.error("Streaming error:", error);
      const msg = error instanceof Error ? error.message : "Unknown error";
      await writer.write(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } finally {
      writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});
