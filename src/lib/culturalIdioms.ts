/**
 * Nzwisiso Cultural Idioms of Distress Library
 *
 * This is the canonical source for culturally-grounded clinical interpretation
 * of Southern African idioms of distress. It is used in:
 *  - process-narrative system prompt (for AI clinical interpretation)
 *  - ask-ai system prompt (for clinical consultation support)
 *  - Frontend display (cultural context panel in assessment results)
 *
 * VALIDATION REQUIRED: All entries must be reviewed by the psychiatrist
 * validation panel before clinical deployment. Validation status is tracked
 * per entry. Target: Cohen's kappa ≥ 0.70 on panel consensus.
 *
 * To add/edit idioms: update this file, then regenerate the prompt section
 * (run generateIdiomsPromptSection()) and paste into the edge function system prompt.
 *
 * Last updated: March 2026
 * Pending validation: All entries marked "unvalidated" or "provisional"
 */

export type ValidationStatus = "unvalidated" | "provisional" | "panel_reviewed" | "validated";
export type ClinicalLikelihood = "primary" | "secondary" | "rule_out" | "cultural_only";

export interface ClinicalInterpretation {
  interpretation: string;
  icd11_codes?: string[];   // ICD-11 codes for FHIR mapping
  icd10_codes?: string[];   // ICD-10 codes (higher regional penetration)
  likelihood: ClinicalLikelihood;
}

export interface CulturalIdiom {
  id: string;                        // Unique identifier for cross-referencing
  idiom: string;                     // Phrase in original language
  language_code: string;             // BCP-47 code: sn, nd, zu, xh, st, af, sw
  language_name: string;             // Human-readable language name
  literal_translation: string;       // Word-for-word English translation
  cultural_meaning: string;          // What it means within its cultural context
  clinical_interpretations: ClinicalInterpretation[];
  crisis_indicator: boolean;         // True = always assess for acute risk
  do_not_pathologize: string | null; // Explicit warning where cultural normalcy applies
  clinical_probe: string | null;     // Suggested probe question if crisis_indicator is true
  clinical_notes: string;            // Nuanced guidance for clinician
  related_idioms: string[];          // IDs of conceptually related idioms
  validation_status: ValidationStatus;
  validated_by?: string;
  notes_for_panel?: string;          // Questions/issues for the validation panel
}

// =============================================================================
// SHONA (sn) — Zimbabwe primary language
// =============================================================================

const shonaIdioms: CulturalIdiom[] = [
  {
    id: "sn_kufungisisa",
    idiom: "kufungisisa",
    language_code: "sn",
    language_name: "Shona",
    literal_translation: "thinking too much",
    cultural_meaning:
      "Persistent, uncontrollable rumination. The 'too much' framing signals that the person recognises the thinking as excessive and distressing, not merely reflective.",
    clinical_interpretations: [
      { interpretation: "Major Depressive Disorder — rumination cluster", icd11_codes: ["6A70"], icd10_codes: ["F32", "F33"], likelihood: "primary" },
      { interpretation: "Generalised Anxiety Disorder — worry cognition", icd11_codes: ["6B00"], icd10_codes: ["F41.1"], likelihood: "primary" },
      { interpretation: "Obsessive-Compulsive Disorder — intrusive thoughts", icd11_codes: ["6B20"], icd10_codes: ["F42"], likelihood: "secondary" },
      { interpretation: "PTSD — intrusive re-experiencing", icd11_codes: ["6B40"], icd10_codes: ["F43.1"], likelihood: "secondary" },
    ],
    crisis_indicator: false,
    do_not_pathologize:
      "Considered a named illness category in Shona communities, not merely a symptom descriptor. Validate the term before probing for clinical features.",
    clinical_probe: null,
    clinical_notes:
      "Well-documented in Zimbabwean ethnopsychiatric literature (Patel et al., 1997). Strongly associated with depression and anxiety in PHC settings. Distinguish from normal reflective thinking by duration, loss of control, and functional impairment.",
    related_idioms: ["zu_ukucabanga", "xh_ukucinga", "st_ho_nahana", "af_kopseerkry", "sw_kufikiria"],
    validation_status: "provisional",
    notes_for_panel: "Well-researched — Patel et al. 1997. Confirm ICD-11 primary mappings.",
  },
  {
    id: "sn_moyo_unorwadza",
    idiom: "moyo unorwadza",
    language_code: "sn",
    language_name: "Shona",
    literal_translation: "the heart is paining / the heart hurts",
    cultural_meaning:
      "Somatic expression of profound emotional distress. 'Moyo' (heart) is the seat of emotion in Shona thought — distinct from the physical heart. Paining of the heart communicates deep sadness or grief.",
    clinical_interpretations: [
      { interpretation: "Major Depressive Disorder — somatic cluster", icd11_codes: ["6A70"], icd10_codes: ["F32", "F33"], likelihood: "primary" },
      { interpretation: "Prolonged Grief Disorder", icd11_codes: ["6B42"], icd10_codes: ["F43.21"], likelihood: "primary" },
      { interpretation: "Persistent Depressive Disorder (Dysthymia)", icd11_codes: ["6A71"], icd10_codes: ["F34.1"], likelihood: "secondary" },
      { interpretation: "Somatic symptom disorder — cardiac focus", icd11_codes: ["6C20"], icd10_codes: ["F45.1"], likelihood: "rule_out" },
    ],
    crisis_indicator: false,
    do_not_pathologize:
      "Somatic idioms of distress are normative communication across Southern Africa. The somatic framing does not indicate somatisation disorder — it is culturally appropriate affect expression.",
    clinical_probe: null,
    clinical_notes:
      "Distinguish from actual cardiac symptoms through history. If used alongside other depressive idioms (kufungisisa, kutambudzika), raises clinical index of suspicion for MDD significantly.",
    related_idioms: ["zu_inhliziyo", "xh_intliziyo", "st_pelo_bohloko", "af_hartseer", "sw_moyo_unauma"],
    validation_status: "unvalidated",
    notes_for_panel: "Is cardiac chest pain adequately ruled out in the MSE? What medical exclusion threshold is appropriate?",
  },
  {
    id: "sn_kunzwisa_tsitsi",
    idiom: "kunzwisa tsitsi",
    language_code: "sn",
    language_name: "Shona",
    literal_translation: "to cause others to feel compassion / to evoke pity",
    cultural_meaning:
      "Expresses personal suffering through its relational/social effect rather than directly. The speaker frames their distress in terms of how it affects those around them — 'I am suffering so much that I make others feel pity.' This is a socially-mediated idiom: distress is communicated via its impact on community.",
    clinical_interpretations: [
      { interpretation: "Major Depressive Disorder — guilt and worthlessness cluster", icd11_codes: ["6A70"], icd10_codes: ["F32", "F33"], likelihood: "primary" },
      { interpretation: "Prolonged Grief Disorder", icd11_codes: ["6B42"], icd10_codes: ["F43.21"], likelihood: "primary" },
      { interpretation: "Passive suicidal ideation — burden narrative (see clinical notes)", icd11_codes: ["6A70.6"], icd10_codes: ["F32.3"], likelihood: "secondary" },
      { interpretation: "Social anxiety with shame component", icd11_codes: ["6B04"], icd10_codes: ["F40.1"], likelihood: "rule_out" },
    ],
    crisis_indicator: true,
    do_not_pathologize:
      "This is a culturally valid and common expression of suffering. It does NOT automatically indicate suicidal ideation. The social framing of distress is normative in Shona culture.",
    clinical_probe:
      "If paired with themes of worthlessness, social withdrawal, or being a burden: 'Unofunga here kuti mhuri yako ingadai yakanaka zviri nani kana usipo?' (Do you ever feel your family would be better off without you?) This is a culturally safer probe for passive SI than direct 'do you want to die?' questions.",
    clinical_notes:
      "CRITICAL NUANCE: In Shona cultural context, passive suicidal ideation is often expressed through social guilt and burden narratives rather than direct statements of wanting to die. 'Kunzwisa tsitsi' combined with social withdrawal, persistent low mood, and expressions of worthlessness should raise the index of suspicion for passive SI and trigger PHQ-9 Item 9 assessment. The relational framing means the clinician must probe relationally — ask about being a burden, not about wanting to die.",
    related_idioms: ["sn_kutambudzika", "sn_moyo_unorwadza"],
    validation_status: "unvalidated",
    notes_for_panel:
      "KEY VALIDATION QUESTION: Does this idiom map to passive SI in clinical practice in Zimbabwe? Is the burden-narrative link to SI empirically supported or clinical intuition? Request panel input from Zimbabwe psychiatrists specifically.",
  },
  {
    id: "sn_kutambudzika",
    idiom: "kutambudzika",
    language_code: "sn",
    language_name: "Shona",
    literal_translation: "to suffer / to be troubled / to be afflicted",
    cultural_meaning:
      "General idiom of distress used across many contexts. Implies active ongoing suffering rather than a static state. Often used to open a disclosure of distress.",
    clinical_interpretations: [
      { interpretation: "Depressive disorders — general distress", icd11_codes: ["6A70", "6A71"], icd10_codes: ["F32", "F33", "F34.1"], likelihood: "primary" },
      { interpretation: "Anxiety disorders", icd11_codes: ["6B00"], icd10_codes: ["F41"], likelihood: "secondary" },
      { interpretation: "Adjustment disorder", icd11_codes: ["6B43"], icd10_codes: ["F43.2"], likelihood: "secondary" },
    ],
    crisis_indicator: false,
    do_not_pathologize: "Broad term — context is essential. May describe normal life hardship, not clinical distress.",
    clinical_probe: null,
    clinical_notes:
      "Serves as an invitation to further disclosure. Follow up with open-ended questions about the nature and duration of the suffering before applying clinical interpretation.",
    related_idioms: ["sn_kunzwisa_tsitsi", "sn_moyo_unorwadza"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
  {
    id: "sn_kusagadzikana",
    idiom: "kusagadzikana",
    language_code: "sn",
    language_name: "Shona",
    literal_translation: "being unsettled / inability to settle / restlessness",
    cultural_meaning:
      "Describes a state of internal and/or behavioural restlessness — inability to find peace or stillness. Both psychomotor and psychological dimensions are implied.",
    clinical_interpretations: [
      { interpretation: "Generalised Anxiety Disorder — psychomotor component", icd11_codes: ["6B00"], icd10_codes: ["F41.1"], likelihood: "primary" },
      { interpretation: "Manic or hypomanic episode — psychomotor agitation", icd11_codes: ["6A60", "6A61"], icd10_codes: ["F30", "F31"], likelihood: "secondary" },
      { interpretation: "Akathisia (medication-induced) — rule out if on antipsychotics", icd11_codes: ["5C85.00"], icd10_codes: ["G25.7"], likelihood: "rule_out" },
      { interpretation: "PTSD — hyperarousal cluster", icd11_codes: ["6B40"], icd10_codes: ["F43.1"], likelihood: "secondary" },
    ],
    crisis_indicator: false,
    do_not_pathologize: null,
    clinical_probe: null,
    clinical_notes:
      "If the patient is on antipsychotic medication, rule out akathisia before attributing to primary anxiety or mood disorder.",
    related_idioms: ["sn_kufungisisa"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
  {
    id: "sn_kupenga",
    idiom: "kupenga",
    language_code: "sn",
    language_name: "Shona",
    literal_translation: "to go mad / to lose one's mind",
    cultural_meaning:
      "Lay term for severe mental disturbance. Highly stigmatised. Patients rarely use it about themselves — more commonly used by family or community members describing someone else.",
    clinical_interpretations: [
      { interpretation: "Psychotic disorder — schizophrenia, first episode or relapse", icd11_codes: ["6A20"], icd10_codes: ["F20"], likelihood: "primary" },
      { interpretation: "Bipolar disorder with psychotic features", icd11_codes: ["6A60"], icd10_codes: ["F31.5"], likelihood: "secondary" },
      { interpretation: "Severe MDD with psychotic features", icd11_codes: ["6A70.3"], icd10_codes: ["F32.3"], likelihood: "secondary" },
      { interpretation: "Substance-induced psychotic disorder", icd11_codes: ["6C40.20"], icd10_codes: ["F19.5"], likelihood: "rule_out" },
    ],
    crisis_indicator: false,
    do_not_pathologize:
      "Used colloquially for any socially disruptive behaviour — does not always indicate psychotic illness. Assess carefully before accepting this framing.",
    clinical_probe: null,
    clinical_notes:
      "When used by a family member: probe specific behavioural observations rather than accepting the kupenga label at face value. Temporal onset and precipitants are critical differentiators.",
    related_idioms: ["nd_ukuhlanya", "af_mal", "sw_kichaa"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
  {
    id: "sn_mhepo",
    idiom: "mhepo / madamombe",
    language_code: "sn",
    language_name: "Shona",
    literal_translation: "wind / spiritual wind",
    cultural_meaning:
      "Supernatural attribution of symptoms — illness caused by spiritual forces, ancestral displeasure, or witchcraft. Not merely metaphorical; the patient or family genuinely believes this is the cause.",
    clinical_interpretations: [
      { interpretation: "Psychotic disorder — auditory or visual hallucinations with spiritual content", icd11_codes: ["6A20"], icd10_codes: ["F20"], likelihood: "secondary" },
      { interpretation: "Dissociative disorder", icd11_codes: ["6B60"], icd10_codes: ["F44"], likelihood: "secondary" },
      { interpretation: "Culture-bound syndrome — spiritual causation attribution", likelihood: "cultural_only" },
    ],
    crisis_indicator: false,
    do_not_pathologize:
      "IMPORTANT: Spiritual causation attribution is normative and does not indicate psychotic illness. In Shona communities, a person seeking traditional healing for mhepo alongside biomedical care is engaging in appropriate health-seeking behaviour. Do NOT pathologize spiritual explanatory models.",
    clinical_probe: null,
    clinical_notes:
      "Key clinical question: Does the patient have insight into the difference between the spiritual explanation and their actual experiences? If auditory phenomena are present, assess form and content carefully. If the patient believes ancestors are communicating important messages, this alone is not psychosis.",
    related_idioms: ["zu_isinyama", "xh_amafufunyana", "nd_ukufa_kwabantu"],
    validation_status: "unvalidated",
    notes_for_panel: "Where is the threshold between culturally normative spirit belief and clinical psychosis? Panel guidance critical.",
  },
];

// =============================================================================
// NDEBELE (nd) — Zimbabwe, South Africa (Northern Cape, Mpumalanga)
// =============================================================================

const ndebeleIdioms: CulturalIdiom[] = [
  {
    id: "nd_ukufa_kwabantu",
    idiom: "ukufa kwabantu",
    language_code: "nd",
    language_name: "Ndebele",
    literal_translation: "illness of the people / African illness",
    cultural_meaning:
      "Culture-bound illness category encompassing illnesses understood as caused by ancestral displeasure, social conflict, or ritual imbalance. Not a single disease entity — a framework for explaining illness onset.",
    clinical_interpretations: [
      { interpretation: "Somatoform / Medically unexplained symptoms", icd11_codes: ["6C20"], icd10_codes: ["F45"], likelihood: "primary" },
      { interpretation: "Psychotic disorder with cultural content", icd11_codes: ["6A20"], icd10_codes: ["F20"], likelihood: "secondary" },
      { interpretation: "Dissociative disorder", icd11_codes: ["6B60"], icd10_codes: ["F44"], likelihood: "secondary" },
      { interpretation: "Culture-bound explanatory model — no clinical pathology", likelihood: "cultural_only" },
    ],
    crisis_indicator: false,
    do_not_pathologize:
      "This is a culturally legitimate illness framework, not a symptom of psychosis. Many patients with ukufa kwabantu have concurrent biomedical conditions that have been misattributed. Engage with the cultural explanation respectfully while conducting full clinical assessment.",
    clinical_probe: null,
    clinical_notes:
      "Family involvement and traditional healer consultation is common. Ask which traditional treatments have been tried. This affects both the clinical history and the therapeutic alliance.",
    related_idioms: ["sn_mhepo", "zu_isinyama", "xh_amafufunyana"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
  {
    id: "nd_ukuhlanya",
    idiom: "ukuhlanya",
    language_code: "nd",
    language_name: "Ndebele",
    literal_translation: "madness",
    cultural_meaning:
      "Stigmatised lay term for severe mental disturbance. Carries significant social stigma.",
    clinical_interpretations: [
      { interpretation: "Psychotic disorder", icd11_codes: ["6A20"], icd10_codes: ["F20"], likelihood: "primary" },
      { interpretation: "Severe mood disorder with psychotic features", icd11_codes: ["6A60", "6A70"], icd10_codes: ["F31", "F32"], likelihood: "secondary" },
    ],
    crisis_indicator: false,
    do_not_pathologize:
      "Highly stigmatised — patients rarely self-apply this label. When used, it signals that others perceive significant behavioural disturbance.",
    clinical_probe: null,
    clinical_notes:
      "Use of this term by family may indicate the patient's behaviour is significantly disrupting family and social function. Prioritise functional assessment.",
    related_idioms: ["sn_kupenga", "af_mal", "sw_kichaa"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
  {
    id: "nd_amafufunyana",
    idiom: "amafufunyana",
    language_code: "nd",
    language_name: "Ndebele",
    literal_translation: "spirit possession (malevolent spirits)",
    cultural_meaning:
      "Sudden onset of agitation, shouting, altered behaviour attributed to possession by multiple malevolent spirits. Distinct from ukuthwasa (the ancestral calling, which is considered a positive/developmental spiritual process).",
    clinical_interpretations: [
      { interpretation: "Dissociative disorder — possession trance", icd11_codes: ["6B63"], icd10_codes: ["F44.3"], likelihood: "primary" },
      { interpretation: "Acute psychotic disorder", icd11_codes: ["6A23"], icd10_codes: ["F23"], likelihood: "secondary" },
      { interpretation: "Bipolar disorder — manic episode with psychotic features", icd11_codes: ["6A60.3"], icd10_codes: ["F30.2"], likelihood: "secondary" },
    ],
    crisis_indicator: false,
    do_not_pathologize:
      "Possession trance disorders are listed in ICD-11 as culture-related dissociative disorders. Do not assume psychosis without full assessment. The clinical presentation can be indistinguishable from psychosis without careful contextual evaluation.",
    clinical_probe: null,
    clinical_notes:
      "Key differentiator from psychosis: amafufunyana episodes are typically acute, contextually triggered, and often remit with traditional intervention. If onset was gradual, chronic, and progressive, consider primary psychotic disorder. Collaboration with traditional healer may be appropriate.",
    related_idioms: ["nd_ukufa_kwabantu", "zu_ukuthwasa"],
    validation_status: "unvalidated",
    notes_for_panel: "ICD-11 possession trance classification — does this adequately capture amafufunyana presentations in the Zimbabwean/SA context? Panel input required.",
  },
];

// =============================================================================
// isiZULU (zu) — South Africa, Zimbabwe diaspora
// =============================================================================

const zuluIdioms: CulturalIdiom[] = [
  {
    id: "zu_ukuthwasa",
    idiom: "ukuthwasa",
    language_code: "zu",
    language_name: "isiZulu",
    literal_translation: "to emerge / to come out (the ancestral calling)",
    cultural_meaning:
      "The process of being called by ancestors to become a traditional healer (sangoma). May involve auditory and visual experiences of ancestors, behavioural changes, and withdrawal. Considered a developmental spiritual process, not illness, within the cultural framework.",
    clinical_interpretations: [
      { interpretation: "Culture-bound spiritual development — NOT pathological by default", likelihood: "cultural_only" },
      { interpretation: "Psychotic disorder — ONLY if distressing to patient AND rejected as spiritual by their community", icd11_codes: ["6A20"], icd10_codes: ["F20"], likelihood: "rule_out" },
    ],
    crisis_indicator: false,
    do_not_pathologize:
      "CRITICAL: Ukuthwasa is a recognised developmental cultural process. Hallucinations and altered behaviour in this context are NOT psychosis unless the patient and their community do NOT accept them as ukuthwasa and the presentation is distressing/disabling. Misdiagnosis as schizophrenia causes significant harm.",
    clinical_probe:
      "Ask: 'Do you and your family understand this as ukuthwasa?' If yes, and the person is not in distress: provide culturally sensitive support, not antipsychotics.",
    clinical_notes:
      "The key clinical distinction is: (1) Does the patient interpret the experiences as ukuthwasa? (2) Does the community agree? (3) Is there significant distress or functional impairment beyond what is expected in the ukuthwasa process? If all three are no, treat as cultural process. If any are yes, full psychiatric assessment warranted.",
    related_idioms: ["xh_ithwasa", "nd_amafufunyana"],
    validation_status: "unvalidated",
    notes_for_panel:
      "URGENT VALIDATION: What are the clinical criteria that distinguish ukuthwasa from schizophrenia? This distinction has major treatment implications. Request input from ethnopsychiatry experts.",
  },
  {
    id: "zu_inhliziyo",
    idiom: "inhliziyo ebuhlungu",
    language_code: "zu",
    language_name: "isiZulu",
    literal_translation: "painful heart",
    cultural_meaning:
      "Somatic expression of emotional pain, grief, or distress. Parallel to moyo unorwadza in Shona.",
    clinical_interpretations: [
      { interpretation: "Major Depressive Disorder — somatic cluster", icd11_codes: ["6A70"], icd10_codes: ["F32", "F33"], likelihood: "primary" },
      { interpretation: "Prolonged Grief Disorder", icd11_codes: ["6B42"], icd10_codes: ["F43.21"], likelihood: "primary" },
    ],
    crisis_indicator: false,
    do_not_pathologize: "Somatic idioms of distress are normative — the framing does not indicate somatoform disorder.",
    clinical_probe: null,
    clinical_notes: "Assess duration and functional impairment. If present for >2 weeks with neurovegetative features, MDD assessment is indicated.",
    related_idioms: ["sn_moyo_unorwadza", "xh_intliziyo", "st_pelo_bohloko", "af_hartseer"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
  {
    id: "zu_ukucabanga",
    idiom: "ukucabanga kakhulu",
    language_code: "zu",
    language_name: "isiZulu",
    literal_translation: "thinking too much",
    cultural_meaning: "Persistent, distressing rumination. Parallel to kufungisisa in Shona.",
    clinical_interpretations: [
      { interpretation: "Major Depressive Disorder — rumination", icd11_codes: ["6A70"], icd10_codes: ["F32", "F33"], likelihood: "primary" },
      { interpretation: "Generalised Anxiety Disorder", icd11_codes: ["6B00"], icd10_codes: ["F41.1"], likelihood: "primary" },
    ],
    crisis_indicator: false,
    do_not_pathologize: null,
    clinical_probe: null,
    clinical_notes: "Functionally equivalent to kufungisisa. See notes for sn_kufungisisa.",
    related_idioms: ["sn_kufungisisa", "xh_ukucinga", "st_ho_nahana", "af_kopseerkry"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
  {
    id: "zu_isinyama",
    idiom: "isinyama",
    language_code: "zu",
    language_name: "isiZulu",
    literal_translation: "spiritual darkness / pollution / shadow",
    cultural_meaning:
      "Cultural concept of spiritual contamination causing misfortune, illness, or behavioural change. Often attributed to broken taboos, contact with death, or witchcraft.",
    clinical_interpretations: [
      { interpretation: "Culture-bound explanatory model — may co-exist with clinical pathology", likelihood: "cultural_only" },
      { interpretation: "Depression — when used to explain persistent low mood", icd11_codes: ["6A70"], icd10_codes: ["F32"], likelihood: "secondary" },
    ],
    crisis_indicator: false,
    do_not_pathologize:
      "Spiritual pollution attribution is a normative explanatory model — does not indicate psychotic disorder. Traditional cleansing rituals are culturally appropriate responses.",
    clinical_probe: null,
    clinical_notes:
      "Engage with the patient's explanatory model. If there is an underlying clinical condition, treatment engagement is improved when the spiritual model is acknowledged alongside biomedical treatment.",
    related_idioms: ["sn_mhepo", "nd_ukufa_kwabantu"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
];

// =============================================================================
// isiXHOSA (xh) — South Africa (Eastern Cape, Western Cape)
// =============================================================================

const xhosaIdioms: CulturalIdiom[] = [
  {
    id: "xh_ithwasa",
    idiom: "ithwasa / ukuthwasa",
    language_code: "xh",
    language_name: "isiXhosa",
    literal_translation: "the ancestral calling (to become a healer)",
    cultural_meaning: "Identical concept to Zulu ukuthwasa — the calling to become a sangoma/traditional healer.",
    clinical_interpretations: [
      { interpretation: "Culture-bound spiritual development — NOT pathological by default", likelihood: "cultural_only" },
      { interpretation: "Psychotic disorder — ONLY if distressing and community-rejected", icd11_codes: ["6A20"], icd10_codes: ["F20"], likelihood: "rule_out" },
    ],
    crisis_indicator: false,
    do_not_pathologize: "See zu_ukuthwasa — identical guidance applies.",
    clinical_probe: "Ask: 'Do you and your family understand this as ithwasa?'",
    clinical_notes: "See zu_ukuthwasa for full clinical notes.",
    related_idioms: ["zu_ukuthwasa"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
  {
    id: "xh_amafufunyana",
    idiom: "amafufunyana",
    language_code: "xh",
    language_name: "isiXhosa",
    literal_translation: "spirit possession (malevolent)",
    cultural_meaning: "Identical to Ndebele amafufunyana — malevolent spirit possession with agitation.",
    clinical_interpretations: [
      { interpretation: "Dissociative disorder — possession trance", icd11_codes: ["6B63"], icd10_codes: ["F44.3"], likelihood: "primary" },
      { interpretation: "Acute psychotic disorder", icd11_codes: ["6A23"], icd10_codes: ["F23"], likelihood: "secondary" },
    ],
    crisis_indicator: false,
    do_not_pathologize: "See nd_amafufunyana — identical guidance applies.",
    clinical_probe: null,
    clinical_notes: "See nd_amafufunyana for full clinical notes.",
    related_idioms: ["nd_amafufunyana"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
  {
    id: "xh_intliziyo",
    idiom: "intliziyo ibuhlungu",
    language_code: "xh",
    language_name: "isiXhosa",
    literal_translation: "painful heart",
    cultural_meaning: "Somatic expression of grief, sadness, or emotional distress.",
    clinical_interpretations: [
      { interpretation: "Major Depressive Disorder — somatic cluster", icd11_codes: ["6A70"], icd10_codes: ["F32", "F33"], likelihood: "primary" },
      { interpretation: "Prolonged Grief Disorder", icd11_codes: ["6B42"], icd10_codes: ["F43.21"], likelihood: "primary" },
    ],
    crisis_indicator: false,
    do_not_pathologize: "Somatic idioms are normative affect expression.",
    clinical_probe: null,
    clinical_notes: "See sn_moyo_unorwadza for full notes.",
    related_idioms: ["sn_moyo_unorwadza", "zu_inhliziyo", "st_pelo_bohloko", "af_hartseer"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
];

// =============================================================================
// SESOTHO (st) — South Africa (Free State, Lesotho), Botswana (Setswana variant)
// =============================================================================

const sesothoIdioms: CulturalIdiom[] = [
  {
    id: "st_ho_nahana",
    idiom: "ho nahana haholo",
    language_code: "st",
    language_name: "Sesotho",
    literal_translation: "thinking too much",
    cultural_meaning: "Persistent, distressing rumination. Parallel to kufungisisa in Shona.",
    clinical_interpretations: [
      { interpretation: "Major Depressive Disorder", icd11_codes: ["6A70"], icd10_codes: ["F32", "F33"], likelihood: "primary" },
      { interpretation: "Generalised Anxiety Disorder", icd11_codes: ["6B00"], icd10_codes: ["F41.1"], likelihood: "primary" },
    ],
    crisis_indicator: false,
    do_not_pathologize: null,
    clinical_probe: null,
    clinical_notes: "Functionally equivalent to kufungisisa. See sn_kufungisisa notes.",
    related_idioms: ["sn_kufungisisa", "zu_ukucabanga"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
  {
    id: "st_pelo_bohloko",
    idiom: "pelo e bohloko",
    language_code: "st",
    language_name: "Sesotho",
    literal_translation: "painful heart",
    cultural_meaning: "Somatic expression of grief and emotional distress. Parallel idiom family across all Southern African languages.",
    clinical_interpretations: [
      { interpretation: "Major Depressive Disorder", icd11_codes: ["6A70"], icd10_codes: ["F32", "F33"], likelihood: "primary" },
      { interpretation: "Prolonged Grief Disorder", icd11_codes: ["6B42"], icd10_codes: ["F43.21"], likelihood: "primary" },
    ],
    crisis_indicator: false,
    do_not_pathologize: "Somatic idioms are normative affect expression.",
    clinical_probe: null,
    clinical_notes: "See sn_moyo_unorwadza for full notes.",
    related_idioms: ["sn_moyo_unorwadza", "zu_inhliziyo", "xh_intliziyo", "af_hartseer"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
  {
    id: "st_seriti",
    idiom: "seriti se silafetse",
    language_code: "st",
    language_name: "Sesotho",
    literal_translation: "dignity/spirit has been polluted",
    cultural_meaning:
      "Spiritual pollution of the self — a state of ritual impurity, shame, or ancestral disconnection causing distress.",
    clinical_interpretations: [
      { interpretation: "Culture-bound explanatory model", likelihood: "cultural_only" },
      { interpretation: "Depression with prominent shame and worthlessness", icd11_codes: ["6A70"], icd10_codes: ["F32"], likelihood: "secondary" },
    ],
    crisis_indicator: false,
    do_not_pathologize:
      "Spiritual impurity is a normative explanatory model in Sotho communities. May co-exist with clinical pathology.",
    clinical_probe: null,
    clinical_notes: "Engage respectfully with the spiritual explanatory model. Parallel to isinyama in Zulu.",
    related_idioms: ["zu_isinyama", "sn_mhepo"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
];

// =============================================================================
// AFRIKAANS (af) — South Africa, Namibia
// =============================================================================

const afrikaansIdioms: CulturalIdiom[] = [
  {
    id: "af_hartseer",
    idiom: "hartseer",
    language_code: "af",
    language_name: "Afrikaans",
    literal_translation: "heartsore / heart-pain",
    cultural_meaning:
      "Deep, heart-centred sadness or grief. More intense and persistent than ordinary sadness — implies an enduring, heavy emotional burden.",
    clinical_interpretations: [
      { interpretation: "Major Depressive Disorder", icd11_codes: ["6A70"], icd10_codes: ["F32", "F33"], likelihood: "primary" },
      { interpretation: "Prolonged Grief Disorder", icd11_codes: ["6B42"], icd10_codes: ["F43.21"], likelihood: "primary" },
      { interpretation: "Persistent Depressive Disorder (Dysthymia)", icd11_codes: ["6A71"], icd10_codes: ["F34.1"], likelihood: "secondary" },
    ],
    crisis_indicator: false,
    do_not_pathologize: null,
    clinical_probe: null,
    clinical_notes:
      "Among the clearest Afrikaans depressive markers. Duration and functional impairment are the key differentiators from normal grief.",
    related_idioms: ["sn_moyo_unorwadza", "zu_inhliziyo", "xh_intliziyo", "st_pelo_bohloko"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
  {
    id: "af_moedeloos",
    idiom: "moedeloos",
    language_code: "af",
    language_name: "Afrikaans",
    literal_translation: "despondent / without courage / spiritless",
    cultural_meaning:
      "A state of hopelessness — the spirit or will to continue has drained away.",
    clinical_interpretations: [
      { interpretation: "Major Depressive Disorder — hopelessness cluster", icd11_codes: ["6A70"], icd10_codes: ["F32", "F33"], likelihood: "primary" },
    ],
    crisis_indicator: true,
    do_not_pathologize: null,
    clinical_probe:
      "If moedeloos is paired with social withdrawal or expressions of worthlessness: 'Is jy al so moedeloos dat jy nie meer wil leef nie?' (Are you so despondent that you don't want to live anymore?)",
    clinical_notes:
      "Hopelessness is one of the strongest predictors of suicidal intent across cultures. Moedeloos in combination with other depressive features warrants explicit SI assessment.",
    related_idioms: ["af_hartseer", "af_moeg_vir_lewe"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
  {
    id: "af_moeg_vir_lewe",
    idiom: "ek is moeg vir die lewe",
    language_code: "af",
    language_name: "Afrikaans",
    literal_translation: "I am tired of life",
    cultural_meaning:
      "Direct expression of profound weariness with existence. In Afrikaans cultural context, this is a common indirect way to communicate passive suicidal ideation.",
    clinical_interpretations: [
      { interpretation: "Passive suicidal ideation — IMMEDIATE ASSESSMENT REQUIRED", icd11_codes: ["6A70.6"], icd10_codes: ["F32.3"], likelihood: "primary" },
      { interpretation: "Major Depressive Disorder — severe", icd11_codes: ["6A70"], icd10_codes: ["F32.2", "F32.3"], likelihood: "primary" },
    ],
    crisis_indicator: true,
    do_not_pathologize: null,
    clinical_probe:
      "'Bedoel jy dat jy soms dink jy wil nie meer leef nie?' (Do you mean that you sometimes think you don't want to live anymore?) — Do NOT dismiss this as a figure of speech.",
    clinical_notes:
      "RED ALERT TRIGGER: 'Moeg vir die lewe' is a well-recognised indirect suicidal ideation expression in Afrikaans communities. It must NEVER be treated as a figure of speech. Always probe explicitly. PHQ-9 Item 9 must be formally assessed.",
    related_idioms: ["af_moedeloos", "af_hartseer"],
    validation_status: "provisional",
    notes_for_panel: "Panel: is this a firm red alert trigger in clinical practice? Confirm threshold for formal SI assessment.",
  },
  {
    id: "af_kopseerkry",
    idiom: "kopseerkry",
    language_code: "af",
    language_name: "Afrikaans",
    literal_translation: "getting a headache (from it / from overthinking)",
    cultural_meaning:
      "Cognitive and somatic expression of anxiety — the mental burden is physically felt as head pain.",
    clinical_interpretations: [
      { interpretation: "Generalised Anxiety Disorder — cognitive and somatic cluster", icd11_codes: ["6B00"], icd10_codes: ["F41.1"], likelihood: "primary" },
      { interpretation: "Somatic symptom disorder — cephalgia", icd11_codes: ["6C20"], icd10_codes: ["F45.1"], likelihood: "secondary" },
    ],
    crisis_indicator: false,
    do_not_pathologize: "Somatic presentation of psychological distress is normative.",
    clinical_probe: null,
    clinical_notes: "Rule out primary headache disorder. If recurrent and contextually triggered by stress, anxiety disorder is more likely.",
    related_idioms: ["sn_kufungisisa", "zu_ukucabanga"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
  {
    id: "af_mal",
    idiom: "mal",
    language_code: "af",
    language_name: "Afrikaans",
    literal_translation: "mad / crazy",
    cultural_meaning: "Lay term for any severe mental disturbance. Highly stigmatised.",
    clinical_interpretations: [
      { interpretation: "Psychotic disorder", icd11_codes: ["6A20"], icd10_codes: ["F20"], likelihood: "primary" },
      { interpretation: "Severe mood disorder with psychotic features", icd11_codes: ["6A60", "6A70"], icd10_codes: ["F31", "F32"], likelihood: "secondary" },
    ],
    crisis_indicator: false,
    do_not_pathologize: "Lay term — assess behavioural observations rather than the label itself.",
    clinical_probe: null,
    clinical_notes: "See sn_kupenga notes — same clinical approach applies.",
    related_idioms: ["sn_kupenga", "nd_ukuhlanya", "sw_kichaa"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
];

// =============================================================================
// SWAHILI (sw) — Tanzania, Kenya, East Africa diaspora
// =============================================================================

const swahiliIdioms: CulturalIdiom[] = [
  {
    id: "sw_kufikiria",
    idiom: "kufikiria sana",
    language_code: "sw",
    language_name: "Swahili",
    literal_translation: "thinking too much",
    cultural_meaning: "Persistent rumination. Same idiom family as kufungisisa (Shona).",
    clinical_interpretations: [
      { interpretation: "Major Depressive Disorder", icd11_codes: ["6A70"], icd10_codes: ["F32", "F33"], likelihood: "primary" },
      { interpretation: "Generalised Anxiety Disorder", icd11_codes: ["6B00"], icd10_codes: ["F41.1"], likelihood: "primary" },
    ],
    crisis_indicator: false,
    do_not_pathologize: null,
    clinical_probe: null,
    clinical_notes: "See sn_kufungisisa notes.",
    related_idioms: ["sn_kufungisisa", "zu_ukucabanga"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
  {
    id: "sw_moyo_unauma",
    idiom: "moyo unauma",
    language_code: "sw",
    language_name: "Swahili",
    literal_translation: "the heart is paining",
    cultural_meaning: "Somatic expression of emotional pain. Same idiom family as moyo unorwadza (Shona).",
    clinical_interpretations: [
      { interpretation: "Major Depressive Disorder — somatic cluster", icd11_codes: ["6A70"], icd10_codes: ["F32", "F33"], likelihood: "primary" },
      { interpretation: "Prolonged Grief Disorder", icd11_codes: ["6B42"], icd10_codes: ["F43.21"], likelihood: "primary" },
    ],
    crisis_indicator: false,
    do_not_pathologize: "Somatic idioms are normative.",
    clinical_probe: null,
    clinical_notes: "See sn_moyo_unorwadza notes.",
    related_idioms: ["sn_moyo_unorwadza", "zu_inhliziyo"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
  {
    id: "sw_msongo",
    idiom: "msongo wa mawazo",
    language_code: "sw",
    language_name: "Swahili",
    literal_translation: "stress / pressure of thoughts",
    cultural_meaning:
      "Cognitive overload — thoughts pressing in, overwhelming the person. Captures both anxiety and depressive rumination.",
    clinical_interpretations: [
      { interpretation: "Generalised Anxiety Disorder", icd11_codes: ["6B00"], icd10_codes: ["F41.1"], likelihood: "primary" },
      { interpretation: "Major Depressive Disorder — cognitive cluster", icd11_codes: ["6A70"], icd10_codes: ["F32"], likelihood: "primary" },
      { interpretation: "PTSD — intrusion cluster", icd11_codes: ["6B40"], icd10_codes: ["F43.1"], likelihood: "secondary" },
    ],
    crisis_indicator: false,
    do_not_pathologize: null,
    clinical_probe: null,
    clinical_notes: "Particularly useful entry point — patients often find this idiom easier to disclose than direct questions about mood.",
    related_idioms: ["sn_kufungisisa", "af_kopseerkry"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
  {
    id: "sw_pepo",
    idiom: "pepo",
    language_code: "sw",
    language_name: "Swahili",
    literal_translation: "spirit (possession by spirits)",
    cultural_meaning:
      "Spirit possession — similar to amafufunyana in Southern Africa. Can be benevolent (ancestral guidance) or malevolent (causing illness).",
    clinical_interpretations: [
      { interpretation: "Dissociative disorder — possession trance", icd11_codes: ["6B63"], icd10_codes: ["F44.3"], likelihood: "primary" },
      { interpretation: "Psychotic disorder — rule out", icd11_codes: ["6A20"], icd10_codes: ["F20"], likelihood: "rule_out" },
    ],
    crisis_indicator: false,
    do_not_pathologize:
      "Spirit possession is a widespread, normative belief system in East Africa. The ICD-11 recognises trance and possession disorders as distinct from psychosis.",
    clinical_probe: null,
    clinical_notes: "See nd_amafufunyana for clinical differentiation guidance.",
    related_idioms: ["nd_amafufunyana", "sn_mhepo"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
  {
    id: "sw_kichaa",
    idiom: "kichaa",
    language_code: "sw",
    language_name: "Swahili",
    literal_translation: "madness / insanity",
    cultural_meaning: "Stigmatised lay term for severe mental disturbance.",
    clinical_interpretations: [
      { interpretation: "Psychotic disorder", icd11_codes: ["6A20"], icd10_codes: ["F20"], likelihood: "primary" },
    ],
    crisis_indicator: false,
    do_not_pathologize: "Lay term — assess behavioural observations.",
    clinical_probe: null,
    clinical_notes: "See sn_kupenga notes.",
    related_idioms: ["sn_kupenga", "nd_ukuhlanya", "af_mal"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
];

// =============================================================================
// FRENCH (fr) — Democratic Republic of Congo
// =============================================================================

const frenchIdioms: CulturalIdiom[] = [
  {
    id: "fr_trop_penser",
    idiom: "trop penser",
    language_code: "fr",
    language_name: "French",
    literal_translation: "thinking too much",
    cultural_meaning:
      "Francophone equivalent of kufungisisa — persistent, uncontrollable rumination recognised by the speaker as excessive and distressing. Widely used in DRC primary care settings.",
    clinical_interpretations: [
      { interpretation: "Major Depressive Disorder — rumination cluster", icd11_codes: ["6A70"], icd10_codes: ["F32", "F33"], likelihood: "primary" },
      { interpretation: "Generalised Anxiety Disorder — worry cognition", icd11_codes: ["6B00"], icd10_codes: ["F41.1"], likelihood: "primary" },
      { interpretation: "PTSD — intrusive re-experiencing", icd11_codes: ["6B40"], icd10_codes: ["F43.1"], likelihood: "secondary" },
    ],
    crisis_indicator: false,
    do_not_pathologize:
      "Reflective thinking is culturally valued — the 'trop' (too much) qualifier signals the pathological threshold. Validate the distinction.",
    clinical_probe: null,
    clinical_notes:
      "Functionally equivalent to Shona 'kufungisisa'. In DRC conflict-affected populations, co-occurrence with PTSD symptoms is common. Assess trauma history.",
    related_idioms: ["sn_kufungisisa", "sw_kufikiria"],
    validation_status: "unvalidated",
    notes_for_panel: "Confirm mapping consistency with kufungisisa. DRC-specific trauma context may shift primary likelihood toward PTSD.",
  },
  {
    id: "fr_coeur_brise",
    idiom: "cœur brisé / le cœur me fait mal",
    language_code: "fr",
    language_name: "French",
    literal_translation: "broken heart / my heart hurts me",
    cultural_meaning:
      "Somatic expression of profound emotional pain. In Congolese French, the heart (cœur) is the seat of emotion — pain in the heart communicates deep sadness, loss, or grief rather than cardiac pathology.",
    clinical_interpretations: [
      { interpretation: "Major Depressive Disorder — somatic cluster", icd11_codes: ["6A70"], icd10_codes: ["F32", "F33"], likelihood: "primary" },
      { interpretation: "Prolonged Grief Disorder", icd11_codes: ["6B42"], icd10_codes: ["F43.21"], likelihood: "primary" },
      { interpretation: "Somatic symptom disorder — cardiac focus", icd11_codes: ["6C20"], icd10_codes: ["F45.1"], likelihood: "rule_out" },
    ],
    crisis_indicator: false,
    do_not_pathologize:
      "Somatic idioms of distress are normative in Congolese culture. The somatic framing does not indicate somatisation disorder.",
    clinical_probe: null,
    clinical_notes:
      "Distinguish from actual cardiac symptoms. In DRC populations affected by conflict, this expression commonly accompanies bereavement from violent loss.",
    related_idioms: ["sn_moyo_unorwadza", "af_hartseer", "sw_moyo_unauma"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
  {
    id: "fr_corps_fatigue",
    idiom: "le corps est fatigué",
    language_code: "fr",
    language_name: "French",
    literal_translation: "the body is tired",
    cultural_meaning:
      "Somatic expression of exhaustion that encompasses both physical and psychological depletion. Commonly used in DRC to describe a state where the entire person — body and spirit — is depleted, often from chronic stress, poverty, or conflict exposure.",
    clinical_interpretations: [
      { interpretation: "Major Depressive Disorder — fatigue and anergia", icd11_codes: ["6A70"], icd10_codes: ["F32", "F33"], likelihood: "primary" },
      { interpretation: "Chronic PTSD — exhaustion and hyperarousal burnout", icd11_codes: ["6B40"], icd10_codes: ["F43.1"], likelihood: "secondary" },
      { interpretation: "Neurasthenia / chronic fatigue", icd11_codes: ["8E49"], icd10_codes: ["F48.0"], likelihood: "secondary" },
    ],
    crisis_indicator: false,
    do_not_pathologize:
      "In contexts of extreme poverty and conflict, bodily exhaustion may be an accurate description of physical reality rather than a psychiatric symptom.",
    clinical_probe: null,
    clinical_notes:
      "Assess whether fatigue is proportionate to circumstances. If disproportionate — persisting despite rest, accompanied by anhedonia and sleep disturbance — clinical depression is more likely.",
    related_idioms: ["sn_kutambudzika"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
  {
    id: "fr_esprit_trouble",
    idiom: "l'esprit est troublé / esprit dérangé",
    language_code: "fr",
    language_name: "French",
    literal_translation: "the mind is troubled / mind is disturbed",
    cultural_meaning:
      "General idiom indicating psychological disturbance. 'Esprit troublé' is milder (anxiety, confusion), while 'esprit dérangé' implies more severe disturbance approaching what others might call madness.",
    clinical_interpretations: [
      { interpretation: "Generalised Anxiety Disorder", icd11_codes: ["6B00"], icd10_codes: ["F41.1"], likelihood: "primary" },
      { interpretation: "Psychotic disorder (if 'dérangé')", icd11_codes: ["6A20"], icd10_codes: ["F20"], likelihood: "secondary" },
      { interpretation: "Adjustment disorder", icd11_codes: ["6B43"], icd10_codes: ["F43.2"], likelihood: "secondary" },
    ],
    crisis_indicator: false,
    do_not_pathologize: null,
    clinical_probe: null,
    clinical_notes:
      "The severity gradient between 'troublé' and 'dérangé' is clinically significant. 'Dérangé' carries stigma similar to 'kupenga' (Shona) or 'kichaa' (Swahili).",
    related_idioms: ["sn_kupenga", "sw_kichaa", "nd_ukuhlanya"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
  {
    id: "fr_envoutement",
    idiom: "envoûtement / être envoûté",
    language_code: "fr",
    language_name: "French",
    literal_translation: "bewitchment / to be bewitched",
    cultural_meaning:
      "Supernatural attribution of illness — symptoms believed to be caused by sorcery or spiritual attack. Very common explanatory model in DRC across all socioeconomic levels.",
    clinical_interpretations: [
      { interpretation: "Dissociative disorder — possession trance", icd11_codes: ["6B63"], icd10_codes: ["F44.3"], likelihood: "primary" },
      { interpretation: "Psychotic disorder with persecutory content", icd11_codes: ["6A20"], icd10_codes: ["F20"], likelihood: "secondary" },
      { interpretation: "Culture-bound explanatory model — no clinical pathology", likelihood: "cultural_only" },
    ],
    crisis_indicator: false,
    do_not_pathologize:
      "Spiritual causation beliefs are normative across DRC. Belief in sorcery is not delusional — it is a culturally coherent explanatory framework. Do NOT equate with persecutory delusions without careful assessment.",
    clinical_probe: null,
    clinical_notes:
      "Key differentiator: persecutory delusions involve personally targeted threat from identifiable agents with evidence of formal thought disorder. Envoûtement beliefs exist within a shared cultural worldview and do not constitute delusions per se.",
    related_idioms: ["sn_mhepo", "sw_pepo"],
    validation_status: "unvalidated",
    notes_for_panel: "Critical threshold question: when does culturally normative sorcery belief become clinical paranoia? Panel guidance needed.",
  },
];

// =============================================================================
// PORTUGUESE (pt) — Mozambique, Angola
// =============================================================================

const portugueseIdioms: CulturalIdiom[] = [
  {
    id: "pt_pensar_demais",
    idiom: "pensar demais",
    language_code: "pt",
    language_name: "Portuguese",
    literal_translation: "thinking too much",
    cultural_meaning:
      "Portuguese equivalent of kufungisisa / trop penser — excessive rumination recognised as pathological by the speaker. Common in Mozambican and Angolan primary care presentations.",
    clinical_interpretations: [
      { interpretation: "Major Depressive Disorder — rumination cluster", icd11_codes: ["6A70"], icd10_codes: ["F32", "F33"], likelihood: "primary" },
      { interpretation: "Generalised Anxiety Disorder — worry cognition", icd11_codes: ["6B00"], icd10_codes: ["F41.1"], likelihood: "primary" },
      { interpretation: "PTSD — intrusive re-experiencing", icd11_codes: ["6B40"], icd10_codes: ["F43.1"], likelihood: "secondary" },
    ],
    crisis_indicator: false,
    do_not_pathologize:
      "Reflective thinking is valued — the 'demais' qualifier signals the pathological threshold.",
    clinical_probe: null,
    clinical_notes:
      "Functionally equivalent to Shona 'kufungisisa'. In Mozambique, post-conflict and post-cyclone trauma populations frequently present with this idiom alongside PTSD features.",
    related_idioms: ["sn_kufungisisa", "fr_trop_penser", "sw_kufikiria"],
    validation_status: "unvalidated",
    notes_for_panel: "Confirm mapping consistency with kufungisisa. Mozambique/Angola-specific context.",
  },
  {
    id: "pt_coracao_doi",
    idiom: "o coração dói / dor no coração",
    language_code: "pt",
    language_name: "Portuguese",
    literal_translation: "the heart hurts / pain in the heart",
    cultural_meaning:
      "Somatic expression of emotional suffering. In Mozambican and Angolan Portuguese, heart pain communicates grief, loss, and deep sadness — the heart as seat of emotion.",
    clinical_interpretations: [
      { interpretation: "Major Depressive Disorder — somatic cluster", icd11_codes: ["6A70"], icd10_codes: ["F32", "F33"], likelihood: "primary" },
      { interpretation: "Prolonged Grief Disorder", icd11_codes: ["6B42"], icd10_codes: ["F43.21"], likelihood: "primary" },
      { interpretation: "Somatic symptom disorder — cardiac focus", icd11_codes: ["6C20"], icd10_codes: ["F45.1"], likelihood: "rule_out" },
    ],
    crisis_indicator: false,
    do_not_pathologize:
      "Somatic idioms of distress are normative. The somatic framing is culturally appropriate affect expression, not somatisation disorder.",
    clinical_probe: null,
    clinical_notes:
      "Distinguish from actual cardiac symptoms through history. Common in bereavement presentations.",
    related_idioms: ["sn_moyo_unorwadza", "fr_coeur_brise", "af_hartseer"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
  {
    id: "pt_nervos",
    idiom: "nervos / ataque de nervos",
    language_code: "pt",
    language_name: "Portuguese",
    literal_translation: "nerves / attack of nerves",
    cultural_meaning:
      "Widely used across Lusophone Africa to describe episodes of acute distress — trembling, crying, feeling out of control, sometimes with somatic symptoms (chest tightness, dizziness). Not the same as a panic attack, though features overlap.",
    clinical_interpretations: [
      { interpretation: "Panic Disorder", icd11_codes: ["6B01"], icd10_codes: ["F41.0"], likelihood: "primary" },
      { interpretation: "Generalised Anxiety Disorder", icd11_codes: ["6B00"], icd10_codes: ["F41.1"], likelihood: "primary" },
      { interpretation: "Dissociative episode", icd11_codes: ["6B60"], icd10_codes: ["F44"], likelihood: "secondary" },
      { interpretation: "PTSD — hyperarousal cluster", icd11_codes: ["6B40"], icd10_codes: ["F43.1"], likelihood: "secondary" },
    ],
    crisis_indicator: false,
    do_not_pathologize:
      "'Nervos' is a culturally sanctioned way to express distress and seek help. It does not automatically map to clinical anxiety disorders.",
    clinical_probe: null,
    clinical_notes:
      "Ataque de nervos is well-documented in Latin American and Lusophone psychiatric literature. In Mozambique/Angola, assess for trauma history as the underlying driver. The episode itself may be dissociative.",
    related_idioms: ["af_senuagtig", "sn_kusagadzikana"],
    validation_status: "unvalidated",
    notes_for_panel: "Well-documented idiom in Lusophone psychiatry. Confirm regional applicability to Mozambique/Angola.",
  },
  {
    id: "pt_corpo_cansado",
    idiom: "o corpo está cansado",
    language_code: "pt",
    language_name: "Portuguese",
    literal_translation: "the body is tired",
    cultural_meaning:
      "Somatic expression of total depletion — physical and psychological. In Mozambique, commonly used by women and elderly patients to describe a state of resignation and exhaustion from chronic adversity.",
    clinical_interpretations: [
      { interpretation: "Major Depressive Disorder — fatigue and anergia", icd11_codes: ["6A70"], icd10_codes: ["F32", "F33"], likelihood: "primary" },
      { interpretation: "Chronic PTSD — exhaustion", icd11_codes: ["6B40"], icd10_codes: ["F43.1"], likelihood: "secondary" },
      { interpretation: "Neurasthenia / chronic fatigue", icd11_codes: ["8E49"], icd10_codes: ["F48.0"], likelihood: "secondary" },
    ],
    crisis_indicator: false,
    do_not_pathologize:
      "May reflect genuine physical exhaustion from poverty, labour, or illness — not necessarily psychiatric.",
    clinical_probe: null,
    clinical_notes:
      "Parallel to French 'le corps est fatigué'. Assess proportionality of fatigue to circumstances.",
    related_idioms: ["fr_corps_fatigue", "sn_kutambudzika"],
    validation_status: "unvalidated",
    notes_for_panel: null,
  },
  {
    id: "pt_feiticaria",
    idiom: "feitiçaria / estar enfeitiçado",
    language_code: "pt",
    language_name: "Portuguese",
    literal_translation: "witchcraft / to be bewitched",
    cultural_meaning:
      "Supernatural attribution of illness — symptoms believed caused by witchcraft or spiritual attack. Very common explanatory model across Mozambique and Angola at all socioeconomic levels.",
    clinical_interpretations: [
      { interpretation: "Dissociative disorder — possession trance", icd11_codes: ["6B63"], icd10_codes: ["F44.3"], likelihood: "primary" },
      { interpretation: "Psychotic disorder with persecutory content", icd11_codes: ["6A20"], icd10_codes: ["F20"], likelihood: "secondary" },
      { interpretation: "Culture-bound explanatory model — no clinical pathology", likelihood: "cultural_only" },
    ],
    crisis_indicator: false,
    do_not_pathologize:
      "Belief in feitiçaria is culturally normative across Lusophone Africa. It is NOT delusional — it is a coherent cultural explanatory framework shared by the community.",
    clinical_probe: null,
    clinical_notes:
      "Same differentiation principles as DRC envoûtement and Shona mhepo. Assess for formal thought disorder before attributing to psychosis.",
    related_idioms: ["fr_envoutement", "sn_mhepo", "sw_pepo"],
    validation_status: "unvalidated",
    notes_for_panel: "Same threshold question as envoûtement: when does culturally normative belief become clinical?",
  },
];

// =============================================================================
// MASTER EXPORT
// =============================================================================

export const ALL_CULTURAL_IDIOMS: CulturalIdiom[] = [
  ...shonaIdioms,
  ...ndebeleIdioms,
  ...zuluIdioms,
  ...xhosaIdioms,
  ...sesothoIdioms,
  ...afrikaansIdioms,
  ...swahiliIdioms,
  ...frenchIdioms,
  ...portugueseIdioms,
];

export const IDIOMS_BY_LANGUAGE: Record<string, CulturalIdiom[]> = {
  sn: shonaIdioms,
  nd: ndebeleIdioms,
  zu: zuluIdioms,
  xh: xhosaIdioms,
  st: sesothoIdioms,
  af: afrikaansIdioms,
  sw: swahiliIdioms,
  fr: frenchIdioms,
  pt: portugueseIdioms,
};

export const CRISIS_INDICATOR_IDIOMS = ALL_CULTURAL_IDIOMS.filter(i => i.crisis_indicator);

export const UNVALIDATED_IDIOMS = ALL_CULTURAL_IDIOMS.filter(
  i => i.validation_status === "unvalidated"
);

/**
 * Generates the idioms reference section for use in AI system prompts.
 * Copy this output into the process-narrative edge function system prompt.
 * Regenerate whenever idioms are added or updated.
 */
export function generateIdiomsPromptSection(): string {
  const languages: Record<string, string> = {
    sn: "SHONA (sn)",
    nd: "NDEBELE (nd)",
    zu: "isiZULU (zu)",
    xh: "isiXHOSA (xh)",
    st: "SESOTHO (st)",
    af: "AFRIKAANS (af)",
    sw: "SWAHILI (sw)",
    fr: "FRENCH (fr)",
    pt: "PORTUGUESE (pt)",
  };

  let output = "## CULTURAL IDIOMS OF DISTRESS REFERENCE\n\n";
  output +=
    "The following idioms require culturally-grounded clinical interpretation. " +
    "Do NOT apply Western clinical concepts directly — use the guidance below.\n\n";

  for (const [code, label] of Object.entries(languages)) {
    const idioms = IDIOMS_BY_LANGUAGE[code] ?? [];
    if (idioms.length === 0) continue;

    output += `### ${label}\n\n`;

    for (const idiom of idioms) {
      output += `**${idiom.idiom}** — "${idiom.literal_translation}"\n`;
      output += `Cultural meaning: ${idiom.cultural_meaning}\n`;

      const primary = idiom.clinical_interpretations.filter(i => i.likelihood === "primary");
      const secondary = idiom.clinical_interpretations.filter(i => i.likelihood === "secondary");
      const ruleOut = idiom.clinical_interpretations.filter(i => i.likelihood === "rule_out");

      if (primary.length) {
        output += `Primary clinical mapping: ${primary.map(i => i.interpretation).join("; ")}\n`;
      }
      if (secondary.length) {
        output += `Also consider: ${secondary.map(i => i.interpretation).join("; ")}\n`;
      }
      if (ruleOut.length) {
        output += `Rule out: ${ruleOut.map(i => i.interpretation).join("; ")}\n`;
      }
      if (idiom.do_not_pathologize) {
        output += `⚠ DO NOT PATHOLOGIZE: ${idiom.do_not_pathologize}\n`;
      }
      if (idiom.crisis_indicator && idiom.clinical_probe) {
        output += `🔴 CRISIS PROBE: ${idiom.clinical_probe}\n`;
      }
      if (idiom.clinical_notes) {
        output += `Clinical notes: ${idiom.clinical_notes}\n`;
      }
      output += "\n";
    }
  }

  return output;
}
