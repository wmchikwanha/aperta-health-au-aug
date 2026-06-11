/**
 * Curated sample CALD narratives for partner FHIR integration testing.
 * No PII. All identifiers are pseudonymous.
 */

export interface SampleNarrative {
  id: string;
  label: string;
  language: string;          // BCP-47
  languageDisplay: string;
  countryOfBirth: string;    // ISO 3166-1 alpha-2
  countryOfBirthDisplay: string;
  visaStatus: string;        // visa subclass (AU)
  ageBand: string;
  gender: "male" | "female" | "other" | "unknown";
  presenting: string;        // brief presenting complaint
  narrative: string;         // anonymised vignette
  mse: string;               // mental state examination paragraph
  screenings: Array<{
    instrument: "PHQ9" | "GAD7" | "PCL5";
    totalScore: number;
    severityLevel: string;
    interpretation: string;
  }>;
  provisionalDiagnosis: {
    icd10AmCode: string;
    display: string;
  };
  riskLevel: "low" | "moderate" | "high";
  riskFlags: string[];
}

export const SAMPLE_NARRATIVES: SampleNarrative[] = [
  {
    id: "narr-ar-ptsd",
    label: "Arabic-speaking refugee — PTSD (Syria)",
    language: "ar",
    languageDisplay: "Arabic",
    countryOfBirth: "SY",
    countryOfBirthDisplay: "Syrian Arab Republic",
    visaStatus: "200",
    ageBand: "30-39",
    gender: "male",
    presenting: "Sleep disturbance, intrusive memories, hypervigilance after resettlement.",
    narrative:
      "Patient resettled in Australia 14 months ago via the offshore humanitarian programme. Reports recurrent nightmares of detention, hyperarousal in crowded spaces (Footscray market), startle response to door slams. Avoids news media. Describes 'qalbi maksoor' (broken heart) when speaking of family still in country of origin. Sleep <4h/night. Denies SI/HI.",
    mse:
      "Appearance: tidy, appropriate dress. Behaviour: psychomotor tension, scanning environment. Speech: soft, fluent Arabic via TIS interpreter. Mood: 'tired, heavy'. Affect: constricted, congruent. Thought: linear, trauma-preoccupied. No perceptual disturbance. Cognition grossly intact. Insight and judgement preserved.",
    screenings: [
      { instrument: "PCL5", totalScore: 52, severityLevel: "Provisional PTSD Diagnosis", interpretation: "Meets DSM-5 cluster criteria; trauma-focused therapy indicated." },
      { instrument: "PHQ9", totalScore: 14, severityLevel: "Moderate", interpretation: "Moderate depressive symptoms secondary to PTSD." },
      { instrument: "GAD7", totalScore: 13, severityLevel: "Moderate", interpretation: "Moderate generalised anxiety." },
    ],
    provisionalDiagnosis: { icd10AmCode: "F43.1", display: "Post-traumatic stress disorder" },
    riskLevel: "moderate",
    riskFlags: ["Resettlement stress", "Family separation", "Sleep deprivation"],
  },
  {
    id: "narr-prs-adolescent",
    label: "Dari-speaking adolescent — depressive episode (Afghanistan)",
    language: "prs",
    languageDisplay: "Dari",
    countryOfBirth: "AF",
    countryOfBirthDisplay: "Afghanistan",
    visaStatus: "866",
    ageBand: "15-17",
    gender: "female",
    presenting: "Withdrawal, academic decline, somatic complaints at high school.",
    narrative:
      "17-year-old in Year 11, arrived 2 years ago on protection visa. Bicultural worker referral via school chaplain. Reports 'dilam tang ast' (heart is tight), persistent fatigue, loss of interest in friends from local Hazara community. Two episodes of self-harm (superficial cutting) in past month. No active SI but endorses passive death wishes 'sometimes I wish I would just not wake up'.",
    mse:
      "Appearance: school uniform, downcast gaze. Behaviour: cooperative, minimal eye contact. Speech: slow, low volume via female Dari interpreter. Mood: 'numb'. Affect: blunted, reactive briefly when discussing younger sibling. Thought: hopelessness re: future, no formal thought disorder. Passive SI without plan or intent. Insight partial. Safety plan initiated.",
    screenings: [
      { instrument: "PHQ9", totalScore: 19, severityLevel: "Moderately Severe", interpretation: "Item 9 endorsed at 1 — passive ideation. Safety plan completed." },
      { instrument: "GAD7", totalScore: 11, severityLevel: "Moderate", interpretation: "Moderate anxiety." },
    ],
    provisionalDiagnosis: { icd10AmCode: "F32.1", display: "Moderate depressive episode" },
    riskLevel: "high",
    riskFlags: ["Passive SI", "Self-harm history", "Adolescent + minority status"],
  },
  {
    id: "narr-sw-torture",
    label: "Swahili-speaking torture survivor (DRC)",
    language: "sw",
    languageDisplay: "Swahili",
    countryOfBirth: "CD",
    countryOfBirthDisplay: "Democratic Republic of the Congo",
    visaStatus: "204",
    ageBand: "40-49",
    gender: "female",
    presenting: "Chronic pain, flashbacks, gender-based violence sequelae.",
    narrative:
      "Patient arrived as a Woman at Risk visa holder 8 months ago. Referred by Refugee Health Nurse after positive RHS-15. Reports persistent pelvic and lower back pain (medically investigated, no organic cause confirmed), flashbacks triggered by male voices, dissociative episodes lasting up to 20 minutes. STARTTS counselling commenced.",
    mse:
      "Appearance: appropriately dressed in headscarf. Behaviour: guarded, tearful when describing pre-flight events. Speech: fluent Swahili. Mood: 'hofu' (fear). Affect: anxious, briefly dissociative — grounding required. Thought: ruminative, no SI/HI. Perceptions: intrusive imagery (re-experiencing). Cognition intact. Insight good, motivated for therapy.",
    screenings: [
      { instrument: "PCL5", totalScore: 61, severityLevel: "Provisional PTSD Diagnosis", interpretation: "Severe PTSD; complex presentation with dissociation." },
      { instrument: "PHQ9", totalScore: 16, severityLevel: "Moderately Severe", interpretation: "Moderately severe depression." },
    ],
    provisionalDiagnosis: { icd10AmCode: "F43.1", display: "Post-traumatic stress disorder (complex features)" },
    riskLevel: "moderate",
    riskFlags: ["Torture/GBV survivor", "Dissociation", "Chronic pain"],
  },
  {
    id: "narr-en-ti-grief",
    label: "English/Tigrinya code-switch — prolonged grief (Eritrea)",
    language: "en",
    languageDisplay: "English with Tigrinya code-switching",
    countryOfBirth: "ER",
    countryOfBirthDisplay: "Eritrea",
    visaStatus: "851",
    ageBand: "50-59",
    gender: "male",
    presenting: "Persistent grief 18 months after death of spouse during transit.",
    narrative:
      "Patient code-switches between English and Tigrinya throughout. Reports daily yearning for late wife who died during Mediterranean crossing. Cannot dispose of her belongings. Avoids the local Eritrean Orthodox parish where they worshipped. Sleep onset insomnia. No psychotic features. Engaged with church elder informally but not formal services.",
    mse:
      "Appearance: smart casual, slightly dishevelled. Behaviour: reflective, occasionally distant. Speech: bilingual, normal rate. Mood: 'sad — hazen' (grief). Affect: appropriate, tearful. Thought: preoccupied with deceased, no SI. Insight good. Judgement intact. Cognition grossly intact (MMSE 28/30).",
    screenings: [
      { instrument: "PHQ9", totalScore: 12, severityLevel: "Moderate", interpretation: "Moderate depressive symptoms within prolonged grief context." },
      { instrument: "GAD7", totalScore: 6, severityLevel: "Mild", interpretation: "Mild anxiety." },
    ],
    provisionalDiagnosis: { icd10AmCode: "F43.21", display: "Prolonged grief disorder" },
    riskLevel: "low",
    riskFlags: ["Bereavement", "Social isolation"],
  },
];

export const getSampleNarrative = (id: string) =>
  SAMPLE_NARRATIVES.find((n) => n.id === id);
