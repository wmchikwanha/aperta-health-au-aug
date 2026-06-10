/**
 * Aperta Health Cultural Idioms of Distress Library — Australian CALD / Refugee
 *
 * Canonical source for culturally-grounded clinical interpretation of idioms
 * of distress encountered in Australian refugee and CALD mental health settings.
 *
 * Used by:
 *  - process-narrative system prompt (AI clinical interpretation)
 *  - ask-ai system prompt (clinical consultation support)
 *  - Frontend cultural context panel
 *
 * Sources:
 *  - Foundation House (VFST) Cultural Considerations in Refugee Mental Health
 *  - STARTTS clinical guidelines
 *  - DSM-5 Cultural Concepts of Distress
 *  - Kirmayer et al., Cultural Formulation Interview (CFI)
 *
 * VALIDATION REQUIRED: All entries should be reviewed by a bicultural worker
 * and refugee health clinician panel before clinical deployment.
 *
 * Last updated: June 2026
 */

export type ValidationStatus = "unvalidated" | "provisional" | "panel_reviewed" | "validated";
export type ClinicalLikelihood = "primary" | "secondary" | "rule_out" | "cultural_only";

export interface ClinicalInterpretation {
  interpretation: string;
  icd10_codes?: string[];   // ICD-10-AM (Australian Modification) — default in AU
  icd11_codes?: string[];   // ICD-11
  dsm5_codes?: string[];    // DSM-5
  likelihood: ClinicalLikelihood;
}

export interface CulturalIdiom {
  id: string;
  idiom: string;
  language_code: string;             // BCP-47: ar, prs, ps, ur, din, nus, sw, vi, ti
  language_name: string;
  literal_translation: string;
  cultural_meaning: string;
  clinical_interpretations: ClinicalInterpretation[];
  crisis_indicator: boolean;
  do_not_pathologize: string | null;
  clinical_probe: string | null;
  clinical_notes: string;
  related_idioms: string[];
  validation_status: ValidationStatus;
  validated_by?: string;
  notes_for_panel?: string;
}

const idioms: CulturalIdiom[] = [
  // ===== Arabic =====
  {
    id: "ar_dayqa_sadr",
    idiom: "ضيقة صدر (ḍayqa ṣadr)",
    language_code: "ar",
    language_name: "Arabic",
    literal_translation: "tightness of the chest",
    cultural_meaning:
      "Somatic expression of psychological distress — a sense of suffocating worry, grief or oppression. Common across Arabic-speaking refugee communities (Syrian, Iraqi, Palestinian, Sudanese).",
    clinical_interpretations: [
      { interpretation: "Major Depressive Disorder", icd10_codes: ["F32", "F33"], likelihood: "primary" },
      { interpretation: "Generalised Anxiety Disorder", icd10_codes: ["F41.1"], likelihood: "primary" },
      { interpretation: "PTSD — hyperarousal/somatic", icd10_codes: ["F43.1"], likelihood: "secondary" },
    ],
    crisis_indicator: false,
    do_not_pathologize:
      "Somatic language is the culturally sanctioned mode of distress disclosure. Do not dismiss as 'just physical'.",
    clinical_probe: null,
    clinical_notes:
      "Ask about sleep, appetite, intrusive memories, and trauma exposure before psychiatric labelling. Cardiac referral may already have ruled out organic cause — check.",
    related_idioms: ["fa_delam_gerefte", "ur_dil_tang"],
    validation_status: "provisional",
  },
  {
    id: "ar_asabi",
    idiom: "أعصابي تعبانة (a‘ṣābī ta‘bāna)",
    language_code: "ar",
    language_name: "Arabic",
    literal_translation: "my nerves are tired",
    cultural_meaning:
      "Generalised exhaustion, irritability, and emotional dysregulation attributed to 'nerves'. Often the entry-point complaint for depression or PTSD.",
    clinical_interpretations: [
      { interpretation: "Depression", icd10_codes: ["F32"], likelihood: "primary" },
      { interpretation: "PTSD", icd10_codes: ["F43.1"], likelihood: "primary" },
      { interpretation: "Adjustment disorder", icd10_codes: ["F43.2"], likelihood: "secondary" },
    ],
    crisis_indicator: false,
    do_not_pathologize: null,
    clinical_probe: null,
    clinical_notes:
      "Probe for trauma history, sleep, intrusive memories. Many patients present this way after detention, war exposure, or torture.",
    related_idioms: ["fa_a‘sab"],
    validation_status: "provisional",
  },

  // ===== Dari / Farsi =====
  {
    id: "fa_delam_gerefte",
    idiom: "دلم گرفته (delam gerefte)",
    language_code: "fa",
    language_name: "Farsi / Dari",
    literal_translation: "my heart is heavy / squeezed",
    cultural_meaning:
      "Sadness, grief, hopelessness, or homesickness (gharibi). Frequently used by Afghan and Iranian patients including Hazara and Dari speakers.",
    clinical_interpretations: [
      { interpretation: "Major Depressive Disorder", icd10_codes: ["F32", "F33"], likelihood: "primary" },
      { interpretation: "Prolonged grief / adjustment disorder", icd10_codes: ["F43.2"], likelihood: "secondary" },
      { interpretation: "PTSD with depressive features", icd10_codes: ["F43.1"], likelihood: "secondary" },
    ],
    crisis_indicator: false,
    do_not_pathologize:
      "Often a normal grief response to family separation or visa precarity. Probe duration and functional impact.",
    clinical_probe: null,
    clinical_notes:
      "Ask about separation from family in country of origin, asylum-process stress (visa status, IMA pathway), and sleep.",
    related_idioms: ["ar_dayqa_sadr", "ur_dil_tang"],
    validation_status: "provisional",
  },
  {
    id: "fa_jigar_khun",
    idiom: "جگرم خون است (jigaram khun ast)",
    language_code: "fa",
    language_name: "Farsi / Dari",
    literal_translation: "my liver is bleeding",
    cultural_meaning:
      "Profound grief, often associated with loss of a child, relative, or homeland. The liver in Persian metaphor is the seat of deep love and grief.",
    clinical_interpretations: [
      { interpretation: "Prolonged grief disorder", icd11_codes: ["6B42"], likelihood: "primary" },
      { interpretation: "Major Depressive Disorder", icd10_codes: ["F32"], likelihood: "primary" },
    ],
    crisis_indicator: true,
    do_not_pathologize:
      "Strong grief idiom — do not over-pathologise, but always screen for suicidal ideation given depth of expressed pain.",
    clinical_probe: "Are you having any thoughts of harming yourself or not wanting to wake up?",
    clinical_notes:
      "Often expressed by Hazara and Afghan refugees with high trauma burden. Validate cultural depth of the metaphor.",
    related_idioms: ["fa_delam_gerefte"],
    validation_status: "provisional",
  },

  // ===== Urdu =====
  {
    id: "ur_dil_tang",
    idiom: "دل تنگ ہے (dil tang hai)",
    language_code: "ur",
    language_name: "Urdu",
    literal_translation: "the heart is constricted",
    cultural_meaning:
      "Heavy-heartedness, low mood, longing. Used by Urdu-speaking Pakistani and Indian patients including Rohingya speakers fluent in Urdu.",
    clinical_interpretations: [
      { interpretation: "Depression", icd10_codes: ["F32"], likelihood: "primary" },
      { interpretation: "Adjustment disorder", icd10_codes: ["F43.2"], likelihood: "secondary" },
    ],
    crisis_indicator: false,
    do_not_pathologize: null,
    clinical_probe: null,
    clinical_notes: "Often layered with family obligation and izzat (honour) pressures.",
    related_idioms: ["fa_delam_gerefte", "ar_dayqa_sadr"],
    validation_status: "provisional",
  },

  // ===== Dinka / Nuer (South Sudan) =====
  {
    id: "din_puou_diit",
    idiom: "puou diit",
    language_code: "din",
    language_name: "Dinka",
    literal_translation: "the heart is big / swollen",
    cultural_meaning:
      "Anger mixed with grief — a sense of injustice and pent-up emotion. Frequent in South Sudanese refugees with war and resettlement trauma.",
    clinical_interpretations: [
      { interpretation: "PTSD", icd10_codes: ["F43.1"], likelihood: "primary" },
      { interpretation: "Major Depressive Disorder with anger features", icd10_codes: ["F32"], likelihood: "secondary" },
    ],
    crisis_indicator: false,
    do_not_pathologize:
      "Anger expression is culturally normative for grief in Dinka and Nuer contexts. Assess function and safety, not the affect itself.",
    clinical_probe: null,
    clinical_notes:
      "Use bicultural worker. ASR unreliable for Dinka — rely on interpreter-mediated narrative.",
    related_idioms: ["nus_lochda_jal"],
    validation_status: "unvalidated",
    notes_for_panel: "Confirm orthography and meaning with Dinka bicultural worker.",
  },
  {
    id: "nus_lochda_jal",
    idiom: "lochda jal",
    language_code: "nus",
    language_name: "Nuer",
    literal_translation: "my heart is tired / wandering",
    cultural_meaning:
      "Distress, sorrow, intrusive thoughts. Used by Nuer-speaking South Sudanese, often relating to displacement and family loss.",
    clinical_interpretations: [
      { interpretation: "Depression", icd10_codes: ["F32"], likelihood: "primary" },
      { interpretation: "PTSD", icd10_codes: ["F43.1"], likelihood: "primary" },
    ],
    crisis_indicator: false,
    do_not_pathologize: null,
    clinical_probe: null,
    clinical_notes: "Bicultural worker essential. Interpreter-mediated session strongly recommended.",
    related_idioms: ["din_puou_diit"],
    validation_status: "unvalidated",
  },

  // ===== Swahili =====
  {
    id: "sw_moyo_unauma",
    idiom: "moyo wangu unauma",
    language_code: "sw",
    language_name: "Swahili",
    literal_translation: "my heart is hurting",
    cultural_meaning:
      "Emotional pain, grief, or somatised depression. Used by East African refugees (Burundian, Rwandan, Congolese, Tanzanian).",
    clinical_interpretations: [
      { interpretation: "Major Depressive Disorder", icd10_codes: ["F32"], likelihood: "primary" },
      { interpretation: "Prolonged grief", icd11_codes: ["6B42"], likelihood: "secondary" },
    ],
    crisis_indicator: false,
    do_not_pathologize: null,
    clinical_probe: null,
    clinical_notes: "Exclude organic cardiac complaints; refugees often present somatically in primary care first.",
    related_idioms: ["ar_dayqa_sadr"],
    validation_status: "provisional",
  },

  // ===== Vietnamese =====
  {
    id: "vi_suy_nghi_nhieu",
    idiom: "suy nghĩ nhiều",
    language_code: "vi",
    language_name: "Vietnamese",
    literal_translation: "thinking too much",
    cultural_meaning:
      "Rumination, worry, sleeplessness. Widely used across Vietnamese communities (including post-1975 refugees and family-reunion arrivals).",
    clinical_interpretations: [
      { interpretation: "Major Depressive Disorder", icd10_codes: ["F32", "F33"], likelihood: "primary" },
      { interpretation: "Generalised Anxiety Disorder", icd10_codes: ["F41.1"], likelihood: "primary" },
    ],
    crisis_indicator: false,
    do_not_pathologize: null,
    clinical_probe: null,
    clinical_notes:
      "Functions as a culturally recognised illness category, not just a symptom. Acknowledge the term before probing further.",
    related_idioms: [],
    validation_status: "provisional",
  },
];

export const CULTURAL_IDIOMS: CulturalIdiom[] = idioms;

/** Lookup all idioms for a language code */
export function getIdiomsByLanguage(code: string): CulturalIdiom[] {
  return CULTURAL_IDIOMS.filter(i => i.language_code === code);
}

/** Get a single idiom by id */
export function getIdiomById(id: string): CulturalIdiom | undefined {
  return CULTURAL_IDIOMS.find(i => i.id === id);
}

/**
 * Build the cultural-context block injected into AI system prompts.
 * Compact format optimised for token efficiency.
 */
export function generateIdiomsPromptSection(): string {
  const lines: string[] = [
    "CULTURAL IDIOMS OF DISTRESS — Australian CALD / Refugee context.",
    "When the narrative contains any of these phrases, interpret using the cultural meaning, NOT the literal translation. Always assess for crisis indicators where flagged.",
    "",
  ];
  for (const i of CULTURAL_IDIOMS) {
    lines.push(
      `- [${i.language_name}] "${i.idiom}" (lit: ${i.literal_translation}) → ${i.cultural_meaning}` +
      (i.crisis_indicator ? " ⚠ CRISIS PROBE REQUIRED." : "") +
      (i.do_not_pathologize ? ` NOTE: ${i.do_not_pathologize}` : "")
    );
  }
  return lines.join("\n");
}
