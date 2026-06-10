// FHIR R4 system URI for LOINC — used in Observation.code.coding[].system
export const LOINC_SYSTEM = 'http://loinc.org';

// LOINC codes for each screening instrument
// Used when writing FHIR Observation resources to MongoDB / exporting to EHR
// Panel code  → Observation that groups item-level responses
// Score code  → Observation that records the total score value
// Verify all codes at https://loinc.org/search before production use
export const SCREENING_INSTRUMENTS = {
  PHQ9: {
    id:           'PHQ-9',
    name:         'Patient Health Questionnaire-9',
    loincPanel:   '44249-1',   // PHQ-9 quick depression assessment panel
    loincScore:   '44261-6',   // PHQ-9 total score
    loincItem9:   '44260-8',   // Item 9 — suicidal ideation (triggers crisis protocol)
    maxScore:     27,
  },
  GAD7: {
    id:           'GAD-7',
    name:         'Generalized Anxiety Disorder 7-item scale',
    loincPanel:   '69737-5',   // GAD-7 panel
    loincScore:   '70274-6',   // GAD-7 total score
    maxScore:     21,
  },
  PCL5: {
    id:           'PCL-5',
    name:         'PTSD Checklist for DSM-5',
    loincPanel:   '71969-0',   // PCL-5 with Life Events Checklist panel
    loincScore:   '96843-5',   // PCL-5 total score — verify against LOINC browser
    maxScore:     80,
  },
  MMSE: {
    id:           'MMSE',
    name:         'Mini-Mental State Examination',
    loincPanel:   '72106-8',   // MMSE panel
    loincScore:   '72107-6',   // MMSE total score — verify against LOINC browser
    maxScore:     30,
  },
  PSQ: {
    id:           'PSQ',
    name:         'Psychosis Screening Questionnaire',
    loincPanel:   null,        // No widely-adopted LOINC code — pending LOINC submission
    loincScore:   null,
    maxScore:     6,
  },
  PRIMER5: {
    id:           'PRIME-R-5',
    name:         'PRIME Screen Revised 5-item',
    loincPanel:   null,        // No widely-adopted LOINC code — pending LOINC submission
    loincScore:   null,
    maxScore:     25,
  },
} as const;

export type ScreeningInstrumentKey = keyof typeof SCREENING_INSTRUMENTS;

// Build a minimal FHIR R4 Observation for a screening score
// Full Observation (with item-level responses) should be built in the edge function
export function toFHIRScoreObservation(
  instrument: ScreeningInstrumentKey,
  result: { totalScore: number; severityLevel: string },
  patientId: string,
  encounterId: string,
) {
  const tool = SCREENING_INSTRUMENTS[instrument];
  const coding = tool.loincScore
    ? [{ system: LOINC_SYSTEM, code: tool.loincScore, display: `${tool.name} total score` }]
    : [{ system: 'http://aperta_health.app/fhir/screening', code: tool.id, display: `${tool.name} total score` }];

  return {
    resourceType: 'Observation',
    status: 'preliminary',   // clinician must approve → becomes 'final'
    category: [{
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'survey' }],
    }],
    code: { coding, text: `${tool.name} total score` },
    subject:   { reference: `Patient/${patientId}` },
    encounter: { reference: `Encounter/${encounterId}` },
    valueInteger: result.totalScore,
    interpretation: [{
      coding: [{ system: 'http://aperta_health.app/fhir/severity', code: result.severityLevel }],
      text: result.severityLevel,
    }],
    note: [{ text: 'AI-generated suggestion requiring clinical review' }],
  };
}

export interface ScoringResult {
  totalScore: number;
  severityLevel: string;
  interpretation: string;
  alerts?: string[];
}

export const scoreGAD7 = (responses: number[]): ScoringResult => {
  const totalScore = responses.reduce((sum, val) => sum + val, 0);
  
  let severityLevel = '';
  let interpretation = '';
  
  if (totalScore <= 4) {
    severityLevel = 'Minimal';
    interpretation = 'Minimal anxiety. Continue monitoring.';
  } else if (totalScore <= 9) {
    severityLevel = 'Mild';
    interpretation = 'Mild anxiety. Watchful waiting recommended. Consider lifestyle interventions.';
  } else if (totalScore <= 14) {
    severityLevel = 'Moderate';
    interpretation = 'Moderate anxiety. Treatment plan recommended. Consider psychotherapy or pharmacotherapy.';
  } else {
    severityLevel = 'Severe';
    interpretation = 'Severe anxiety. Active treatment warranted. Recommend psychiatric evaluation and intervention.';
  }
  
  return { totalScore, severityLevel, interpretation };
};

export const scorePHQ9 = (responses: number[]): ScoringResult => {
  const totalScore = responses.reduce((sum, val) => sum + val, 0);
  const alerts: string[] = [];
  
  // Check for suicidality (question 9)
  if (responses[8] >= 1) {
    alerts.push('SUICIDALITY ALERT: Patient endorsed thoughts of self-harm or suicide. Immediate safety assessment required.');
  }
  
  let severityLevel = '';
  let interpretation = '';
  
  if (totalScore <= 4) {
    severityLevel = 'Minimal';
    interpretation = 'Minimal depression. No treatment required, continue monitoring.';
  } else if (totalScore <= 9) {
    severityLevel = 'Mild';
    interpretation = 'Mild depression. Watchful waiting. Consider psychotherapy if symptoms persist.';
  } else if (totalScore <= 14) {
    severityLevel = 'Moderate';
    interpretation = 'Moderate depression. Treatment plan recommended. Psychotherapy and/or antidepressant medication.';
  } else if (totalScore <= 19) {
    severityLevel = 'Moderately Severe';
    interpretation = 'Moderately severe depression. Active treatment required. Psychotherapy and antidepressant medication recommended.';
  } else {
    severityLevel = 'Severe';
    interpretation = 'Severe depression. Immediate intervention required. Consider intensive treatment options and close monitoring.';
  }
  
  return { totalScore, severityLevel, interpretation, alerts: alerts.length > 0 ? alerts : undefined };
};

export const scorePCL5 = (responses: number[]): ScoringResult => {
  const totalScore = responses.reduce((sum, val) => sum + val, 0);
  const alerts: string[] = [];
  
  // Check DSM-5 cluster criteria
  const clusterB = responses.slice(0, 5).filter(r => r >= 2).length >= 1; // Items 1-5: ≥1 scored ≥2
  const clusterC = responses.slice(5, 7).filter(r => r >= 2).length >= 1; // Items 6-7: ≥1 scored ≥2
  const clusterD = responses.slice(7, 14).filter(r => r >= 2).length >= 2; // Items 8-14: ≥2 scored ≥2
  const clusterE = responses.slice(14, 20).filter(r => r >= 2).length >= 2; // Items 15-20: ≥2 scored ≥2
  
  const meetsDSMCriteria = clusterB && clusterC && clusterD && clusterE;
  
  let severityLevel = '';
  let interpretation = '';
  
  if (totalScore >= 31 && meetsDSMCriteria) {
    severityLevel = 'Provisional PTSD Diagnosis';
    interpretation = 'Total score ≥31 AND meets DSM-5 symptom cluster criteria. Provisional PTSD diagnosis. Comprehensive psychiatric evaluation recommended.';
    alerts.push('Patient meets provisional criteria for PTSD diagnosis.');
  } else if (totalScore >= 31) {
    severityLevel = 'High Symptoms';
    interpretation = 'High PTSD symptom severity but does not meet all DSM-5 cluster criteria. Further assessment recommended.';
  } else if (totalScore >= 21) {
    severityLevel = 'Moderate';
    interpretation = 'Moderate PTSD symptoms. Consider trauma-focused psychotherapy.';
  } else {
    severityLevel = 'Low';
    interpretation = 'Low PTSD symptom severity. Continue monitoring if trauma exposure present.';
  }
  
  return { totalScore, severityLevel, interpretation, alerts: alerts.length > 0 ? alerts : undefined };
};

export const scoreMMSE = (responses: number[]): ScoringResult => {
  const totalScore = responses.reduce((sum, val) => sum + val, 0);
  
  let severityLevel = '';
  let interpretation = '';
  
  if (totalScore >= 24) {
    severityLevel = 'Normal';
    interpretation = 'No cognitive impairment detected. Cognitive functioning within normal limits.';
  } else if (totalScore >= 18) {
    severityLevel = 'Mild Impairment';
    interpretation = 'Mild cognitive impairment. Further neuropsychological assessment recommended. Consider reversible causes.';
  } else {
    severityLevel = 'Severe Impairment';
    interpretation = 'Severe cognitive impairment. Comprehensive neurological evaluation required. Consider dementia workup.';
  }
  
  return { totalScore, severityLevel, interpretation };
};

export const scorePSQ = (responses: { question: string; endorsed: boolean }[]): ScoringResult => {
  const positiveScreens = responses.filter(r => r.endorsed).length;
  const alerts: string[] = [];
  
  let severityLevel = '';
  let interpretation = '';
  
  if (positiveScreens === 0) {
    severityLevel = 'Negative Screen';
    interpretation = 'No psychotic symptoms endorsed. Negative screen for psychosis.';
  } else if (positiveScreens === 1) {
    severityLevel = 'Positive Screen - Single Item';
    interpretation = 'Single positive response. Consider further assessment for psychotic symptoms.';
    alerts.push('Positive screen for psychotic symptoms. Clinical interview recommended.');
  } else {
    severityLevel = 'Positive Screen - Multiple Items';
    interpretation = 'Multiple positive responses. Urgent psychiatric evaluation for psychosis required.';
    alerts.push('URGENT: Multiple psychotic symptoms endorsed. Immediate psychiatric assessment required.');
  }
  
  return { 
    totalScore: positiveScreens, 
    severityLevel, 
    interpretation, 
    alerts: alerts.length > 0 ? alerts : undefined 
  };
};

export const scorePRIMER5 = (responses: number[]): ScoringResult => {
  const totalScore = responses.reduce((sum, val) => sum + val, 0);
  const alerts: string[] = [];
  
  // Check for individual items scoring ≥4 (clinically significant)
  const highRiskItems = responses
    .map((score, index) => ({ score, item: index + 1 }))
    .filter(item => item.score >= 4);
  
  if (highRiskItems.length > 0) {
    const itemNumbers = highRiskItems.map(i => i.item).join(", ");
    alerts.push(`Clinically significant scores (≥4) on item(s): ${itemNumbers}. These specific prodromal symptoms warrant detailed clinical evaluation.`);
  }
  
  let severityLevel = '';
  let interpretation = '';
  
  if (totalScore < 6) {
    severityLevel = 'Low Risk';
    interpretation = 'Low prodromal symptoms. No immediate psychosis risk concern. Continue routine monitoring if clinically indicated.';
  } else if (totalScore < 10) {
    severityLevel = 'Moderate Risk';
    interpretation = 'Moderate prodromal symptoms present. Consider follow-up assessment and monitor for symptom progression. May benefit from psychoeducation and stress management.';
  } else if (totalScore < 18) {
    severityLevel = 'High Risk';
    interpretation = 'High prodromal symptom severity (score ≥10). Further clinical evaluation recommended. Consider referral to specialized early psychosis intervention service.';
    alerts.push('Total score ≥10 indicates need for comprehensive psychosis risk assessment.');
  } else {
    severityLevel = 'Very High Risk';
    interpretation = 'Very high prodromal symptom severity. Urgent comprehensive psychiatric evaluation required. Strong consideration for early intervention program referral and close monitoring.';
    alerts.push('URGENT: Very high prodromal psychosis risk. Immediate specialist evaluation recommended.');
  }
  
  return { totalScore, severityLevel, interpretation, alerts: alerts.length > 0 ? alerts : undefined };
};
