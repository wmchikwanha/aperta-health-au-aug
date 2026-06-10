// ICD-11 and DSM-5 Diagnostic Codes for Psychiatric Conditions
// Focused on conditions common in Southern African psychiatric practice

// FHIR R4 system URIs for each coding framework
// Used in FHIR Coding.system when building DiagnosticReport / Condition resources
export const FHIR_CODING_SYSTEMS = {
  'ICD-11': 'http://id.who.int/icd/release/11/mms',
  'ICD-10': 'http://hl7.org/fhir/sid/icd-10',
  'DSM-5':  'https://www.psychiatry.org/psychiatrists/practice/dsm',
} as const;

// FHIR R4 Coding datatype — used inside CodeableConcept.coding[]
export interface FHIRCoding {
  system: string;   // terminology system URI
  code: string;     // the code value
  display: string;  // human-readable label
}

export interface DiagnosticCode {
  code: string;
  name: string;
  category: string;
  framework: 'ICD-11' | 'ICD-10' | 'DSM-5';
  description?: string;
  specifiers?: string[];
}

// Convert a DiagnosticCode to a FHIR R4 Coding object
export function toFHIRCoding(dc: DiagnosticCode): FHIRCoding {
  return {
    system:  FHIR_CODING_SYSTEMS[dc.framework],
    code:    dc.code,
    display: dc.name,
  };
}

// Build a FHIR R4 CodeableConcept from one or more DiagnosticCodes
export function toFHIRCodeableConcept(
  codes: DiagnosticCode[],
  text?: string
): { coding: FHIRCoding[]; text: string } {
  return {
    coding: codes.map(toFHIRCoding),
    text:   text ?? codes[0]?.name ?? '',
  };
}

export const ICD11_CODES: DiagnosticCode[] = [
  // Mood Disorders
  { code: '6A70', name: 'Single episode depressive disorder, mild', category: 'Mood Disorders', framework: 'ICD-11', description: 'Single depressive episode with mild symptoms' },
  { code: '6A71', name: 'Single episode depressive disorder, moderate', category: 'Mood Disorders', framework: 'ICD-11', description: 'Single depressive episode with moderate symptoms' },
  { code: '6A72', name: 'Single episode depressive disorder, severe', category: 'Mood Disorders', framework: 'ICD-11', description: 'Single depressive episode with severe symptoms' },
  { code: '6A73', name: 'Recurrent depressive disorder, current episode mild', category: 'Mood Disorders', framework: 'ICD-11' },
  { code: '6A74', name: 'Recurrent depressive disorder, current episode moderate', category: 'Mood Disorders', framework: 'ICD-11' },
  { code: '6A75', name: 'Recurrent depressive disorder, current episode severe', category: 'Mood Disorders', framework: 'ICD-11' },
  { code: '6A60', name: 'Bipolar type I disorder, current episode manic', category: 'Mood Disorders', framework: 'ICD-11' },
  { code: '6A61', name: 'Bipolar type I disorder, current episode depressive', category: 'Mood Disorders', framework: 'ICD-11' },
  { code: '6A62', name: 'Bipolar type II disorder', category: 'Mood Disorders', framework: 'ICD-11' },
  { code: '6A80', name: 'Dysthymic disorder', category: 'Mood Disorders', framework: 'ICD-11' },
  
  // Anxiety Disorders
  { code: '6B00', name: 'Generalised anxiety disorder', category: 'Anxiety Disorders', framework: 'ICD-11', description: 'Persistent, excessive worry about multiple areas' },
  { code: '6B01', name: 'Panic disorder', category: 'Anxiety Disorders', framework: 'ICD-11' },
  { code: '6B02', name: 'Agoraphobia', category: 'Anxiety Disorders', framework: 'ICD-11' },
  { code: '6B03', name: 'Specific phobia', category: 'Anxiety Disorders', framework: 'ICD-11' },
  { code: '6B04', name: 'Social anxiety disorder', category: 'Anxiety Disorders', framework: 'ICD-11' },
  { code: '6B05', name: 'Separation anxiety disorder', category: 'Anxiety Disorders', framework: 'ICD-11' },
  
  // Stress-Related Disorders
  { code: '6B40', name: 'Post-traumatic stress disorder', category: 'Stress-Related Disorders', framework: 'ICD-11', description: 'Disorder following exposure to traumatic event(s)' },
  { code: '6B41', name: 'Complex post-traumatic stress disorder', category: 'Stress-Related Disorders', framework: 'ICD-11', description: 'PTSD with additional features from prolonged trauma' },
  { code: '6B42', name: 'Prolonged grief disorder', category: 'Stress-Related Disorders', framework: 'ICD-11' },
  { code: '6B43', name: 'Adjustment disorder', category: 'Stress-Related Disorders', framework: 'ICD-11' },
  { code: '6B44', name: 'Reactive attachment disorder', category: 'Stress-Related Disorders', framework: 'ICD-11' },
  
  // Schizophrenia Spectrum
  { code: '6A20', name: 'Schizophrenia', category: 'Schizophrenia Spectrum', framework: 'ICD-11', description: 'Characterized by disturbances in thinking, perception, and behavior' },
  { code: '6A21', name: 'Schizoaffective disorder', category: 'Schizophrenia Spectrum', framework: 'ICD-11' },
  { code: '6A22', name: 'Schizotypal disorder', category: 'Schizophrenia Spectrum', framework: 'ICD-11' },
  { code: '6A23', name: 'Acute and transient psychotic disorder', category: 'Schizophrenia Spectrum', framework: 'ICD-11' },
  { code: '6A24', name: 'Delusional disorder', category: 'Schizophrenia Spectrum', framework: 'ICD-11' },
  
  // Substance Use Disorders
  { code: '6C40', name: 'Alcohol dependence', category: 'Substance Use Disorders', framework: 'ICD-11' },
  { code: '6C41', name: 'Cannabis dependence', category: 'Substance Use Disorders', framework: 'ICD-11' },
  { code: '6C42', name: 'Opioid dependence', category: 'Substance Use Disorders', framework: 'ICD-11' },
  { code: '6C43', name: 'Sedative, hypnotic or anxiolytic dependence', category: 'Substance Use Disorders', framework: 'ICD-11' },
  { code: '6C44', name: 'Cocaine dependence', category: 'Substance Use Disorders', framework: 'ICD-11' },
  { code: '6C45', name: 'Stimulant dependence (including amphetamines)', category: 'Substance Use Disorders', framework: 'ICD-11' },
  
  // Neurocognitive Disorders
  { code: '6D80', name: 'Dementia due to Alzheimer disease', category: 'Neurocognitive Disorders', framework: 'ICD-11' },
  { code: '6D81', name: 'Dementia due to cerebrovascular disease', category: 'Neurocognitive Disorders', framework: 'ICD-11' },
  { code: '6D82', name: 'Dementia due to HIV', category: 'Neurocognitive Disorders', framework: 'ICD-11', description: 'Particularly relevant in Southern African context' },
  { code: '6D83', name: 'Mild neurocognitive disorder', category: 'Neurocognitive Disorders', framework: 'ICD-11' },
  
  // OCD and Related
  { code: '6B20', name: 'Obsessive-compulsive disorder', category: 'OCD and Related', framework: 'ICD-11' },
  { code: '6B21', name: 'Body dysmorphic disorder', category: 'OCD and Related', framework: 'ICD-11' },
  { code: '6B22', name: 'Hoarding disorder', category: 'OCD and Related', framework: 'ICD-11' },
  
  // Personality Disorders
  { code: '6D10', name: 'Personality disorder, mild', category: 'Personality Disorders', framework: 'ICD-11' },
  { code: '6D11', name: 'Personality disorder, moderate', category: 'Personality Disorders', framework: 'ICD-11' },
  { code: '6D12', name: 'Personality disorder, severe', category: 'Personality Disorders', framework: 'ICD-11' },
  
  // Eating Disorders
  { code: '6B80', name: 'Anorexia nervosa', category: 'Eating Disorders', framework: 'ICD-11' },
  { code: '6B81', name: 'Bulimia nervosa', category: 'Eating Disorders', framework: 'ICD-11' },
  { code: '6B82', name: 'Binge eating disorder', category: 'Eating Disorders', framework: 'ICD-11' },
];

export const DSM5_CODES: DiagnosticCode[] = [
  // Depressive Disorders
  { code: '296.21', name: 'Major Depressive Disorder, Single Episode, Mild', category: 'Depressive Disorders', framework: 'DSM-5' },
  { code: '296.22', name: 'Major Depressive Disorder, Single Episode, Moderate', category: 'Depressive Disorders', framework: 'DSM-5' },
  { code: '296.23', name: 'Major Depressive Disorder, Single Episode, Severe', category: 'Depressive Disorders', framework: 'DSM-5' },
  { code: '296.31', name: 'Major Depressive Disorder, Recurrent, Mild', category: 'Depressive Disorders', framework: 'DSM-5' },
  { code: '296.32', name: 'Major Depressive Disorder, Recurrent, Moderate', category: 'Depressive Disorders', framework: 'DSM-5' },
  { code: '296.33', name: 'Major Depressive Disorder, Recurrent, Severe', category: 'Depressive Disorders', framework: 'DSM-5' },
  { code: '300.4', name: 'Persistent Depressive Disorder (Dysthymia)', category: 'Depressive Disorders', framework: 'DSM-5' },
  
  // Bipolar Disorders
  { code: '296.41', name: 'Bipolar I Disorder, Current Episode Manic, Mild', category: 'Bipolar Disorders', framework: 'DSM-5' },
  { code: '296.42', name: 'Bipolar I Disorder, Current Episode Manic, Moderate', category: 'Bipolar Disorders', framework: 'DSM-5' },
  { code: '296.43', name: 'Bipolar I Disorder, Current Episode Manic, Severe', category: 'Bipolar Disorders', framework: 'DSM-5' },
  { code: '296.51', name: 'Bipolar I Disorder, Current Episode Depressed, Mild', category: 'Bipolar Disorders', framework: 'DSM-5' },
  { code: '296.52', name: 'Bipolar I Disorder, Current Episode Depressed, Moderate', category: 'Bipolar Disorders', framework: 'DSM-5' },
  { code: '296.53', name: 'Bipolar I Disorder, Current Episode Depressed, Severe', category: 'Bipolar Disorders', framework: 'DSM-5' },
  { code: '296.89', name: 'Bipolar II Disorder', category: 'Bipolar Disorders', framework: 'DSM-5' },
  
  // Anxiety Disorders
  { code: '300.02', name: 'Generalized Anxiety Disorder', category: 'Anxiety Disorders', framework: 'DSM-5' },
  { code: '300.01', name: 'Panic Disorder', category: 'Anxiety Disorders', framework: 'DSM-5' },
  { code: '300.22', name: 'Agoraphobia', category: 'Anxiety Disorders', framework: 'DSM-5' },
  { code: '300.29', name: 'Specific Phobia', category: 'Anxiety Disorders', framework: 'DSM-5' },
  { code: '300.23', name: 'Social Anxiety Disorder', category: 'Anxiety Disorders', framework: 'DSM-5' },
  
  // Trauma and Stressor-Related
  { code: '309.81', name: 'Posttraumatic Stress Disorder', category: 'Trauma and Stressor-Related', framework: 'DSM-5' },
  { code: '308.3', name: 'Acute Stress Disorder', category: 'Trauma and Stressor-Related', framework: 'DSM-5' },
  { code: '309.0', name: 'Adjustment Disorder with Depressed Mood', category: 'Trauma and Stressor-Related', framework: 'DSM-5' },
  { code: '309.24', name: 'Adjustment Disorder with Anxiety', category: 'Trauma and Stressor-Related', framework: 'DSM-5' },
  { code: '309.28', name: 'Adjustment Disorder with Mixed Anxiety and Depressed Mood', category: 'Trauma and Stressor-Related', framework: 'DSM-5' },
  
  // Schizophrenia Spectrum
  { code: '295.90', name: 'Schizophrenia', category: 'Schizophrenia Spectrum', framework: 'DSM-5' },
  { code: '295.70', name: 'Schizoaffective Disorder', category: 'Schizophrenia Spectrum', framework: 'DSM-5' },
  { code: '301.22', name: 'Schizotypal Personality Disorder', category: 'Schizophrenia Spectrum', framework: 'DSM-5' },
  { code: '297.1', name: 'Delusional Disorder', category: 'Schizophrenia Spectrum', framework: 'DSM-5' },
  { code: '298.8', name: 'Brief Psychotic Disorder', category: 'Schizophrenia Spectrum', framework: 'DSM-5' },
  
  // Substance-Related Disorders
  { code: '303.90', name: 'Alcohol Use Disorder, Severe', category: 'Substance-Related Disorders', framework: 'DSM-5' },
  { code: '305.00', name: 'Alcohol Use Disorder, Mild', category: 'Substance-Related Disorders', framework: 'DSM-5' },
  { code: '304.30', name: 'Cannabis Use Disorder', category: 'Substance-Related Disorders', framework: 'DSM-5' },
  { code: '304.00', name: 'Opioid Use Disorder', category: 'Substance-Related Disorders', framework: 'DSM-5' },
  
  // Neurocognitive Disorders
  { code: '331.0', name: 'Major Neurocognitive Disorder Due to Alzheimer Disease', category: 'Neurocognitive Disorders', framework: 'DSM-5' },
  { code: '290.40', name: 'Major Vascular Neurocognitive Disorder', category: 'Neurocognitive Disorders', framework: 'DSM-5' },
  { code: '294.11', name: 'Major Neurocognitive Disorder Due to HIV Infection', category: 'Neurocognitive Disorders', framework: 'DSM-5' },
  { code: '331.83', name: 'Mild Neurocognitive Disorder', category: 'Neurocognitive Disorders', framework: 'DSM-5' },
  
  // OCD
  { code: '300.3', name: 'Obsessive-Compulsive Disorder', category: 'Obsessive-Compulsive Disorders', framework: 'DSM-5' },
  { code: '300.7', name: 'Body Dysmorphic Disorder', category: 'Obsessive-Compulsive Disorders', framework: 'DSM-5' },
  { code: '300.3', name: 'Hoarding Disorder', category: 'Obsessive-Compulsive Disorders', framework: 'DSM-5' },
  
  // Personality Disorders
  { code: '301.83', name: 'Borderline Personality Disorder', category: 'Personality Disorders', framework: 'DSM-5' },
  { code: '301.81', name: 'Narcissistic Personality Disorder', category: 'Personality Disorders', framework: 'DSM-5' },
  { code: '301.7', name: 'Antisocial Personality Disorder', category: 'Personality Disorders', framework: 'DSM-5' },
  { code: '301.82', name: 'Avoidant Personality Disorder', category: 'Personality Disorders', framework: 'DSM-5' },
  { code: '301.6', name: 'Dependent Personality Disorder', category: 'Personality Disorders', framework: 'DSM-5' },
  
  // Eating Disorders
  { code: '307.1', name: 'Anorexia Nervosa', category: 'Eating Disorders', framework: 'DSM-5' },
  { code: '307.51', name: 'Bulimia Nervosa', category: 'Eating Disorders', framework: 'DSM-5' },
  { code: '307.51', name: 'Binge-Eating Disorder', category: 'Eating Disorders', framework: 'DSM-5' },
];

// =============================================================================
// ICD-10 Chapter V (Mental and Behavioural Disorders) — F00-F99
// Higher penetration than ICD-11 in Southern African health systems
// System URI: http://hl7.org/fhir/sid/icd-10
// =============================================================================
export const ICD10_CODES: DiagnosticCode[] = [
  // Mood Disorders
  { code: 'F32.0', name: 'Depressive episode, mild', category: 'Mood Disorders', framework: 'ICD-10', description: 'Mild depressive episode — 2+ core symptoms, limited functional impact' },
  { code: 'F32.1', name: 'Depressive episode, moderate', category: 'Mood Disorders', framework: 'ICD-10', description: 'Moderate depressive episode — 2+ core symptoms with considerable functional difficulty' },
  { code: 'F32.2', name: 'Depressive episode, severe without psychotic symptoms', category: 'Mood Disorders', framework: 'ICD-10' },
  { code: 'F32.3', name: 'Depressive episode, severe with psychotic symptoms', category: 'Mood Disorders', framework: 'ICD-10' },
  { code: 'F33.0', name: 'Recurrent depressive disorder, current episode mild', category: 'Mood Disorders', framework: 'ICD-10' },
  { code: 'F33.1', name: 'Recurrent depressive disorder, current episode moderate', category: 'Mood Disorders', framework: 'ICD-10' },
  { code: 'F33.2', name: 'Recurrent depressive disorder, current episode severe without psychotic symptoms', category: 'Mood Disorders', framework: 'ICD-10' },
  { code: 'F30.1', name: 'Mania without psychotic symptoms', category: 'Mood Disorders', framework: 'ICD-10' },
  { code: 'F31.1', name: 'Bipolar affective disorder, current episode manic without psychotic symptoms', category: 'Mood Disorders', framework: 'ICD-10' },
  { code: 'F31.3', name: 'Bipolar affective disorder, current episode mild or moderate depression', category: 'Mood Disorders', framework: 'ICD-10' },
  { code: 'F31.4', name: 'Bipolar affective disorder, current episode severe depression without psychotic symptoms', category: 'Mood Disorders', framework: 'ICD-10' },
  { code: 'F34.1', name: 'Dysthymia', category: 'Mood Disorders', framework: 'ICD-10' },

  // Anxiety Disorders
  { code: 'F41.1', name: 'Generalised anxiety disorder', category: 'Anxiety Disorders', framework: 'ICD-10', description: 'Persistent, excessive anxiety not restricted to any particular situation' },
  { code: 'F41.0', name: 'Panic disorder', category: 'Anxiety Disorders', framework: 'ICD-10' },
  { code: 'F40.0', name: 'Agoraphobia', category: 'Anxiety Disorders', framework: 'ICD-10' },
  { code: 'F40.2', name: 'Specific (isolated) phobias', category: 'Anxiety Disorders', framework: 'ICD-10' },
  { code: 'F40.1', name: 'Social phobias', category: 'Anxiety Disorders', framework: 'ICD-10' },

  // Stress-Related Disorders
  { code: 'F43.1', name: 'Post-traumatic stress disorder', category: 'Stress-Related Disorders', framework: 'ICD-10', description: 'Delayed or protracted response to stressful event or situation' },
  { code: 'F43.0', name: 'Acute stress reaction', category: 'Stress-Related Disorders', framework: 'ICD-10' },
  { code: 'F43.2', name: 'Adjustment disorders', category: 'Stress-Related Disorders', framework: 'ICD-10' },

  // Schizophrenia Spectrum
  { code: 'F20',   name: 'Schizophrenia', category: 'Schizophrenia Spectrum', framework: 'ICD-10', description: 'Characterised by distortions of thinking and perception' },
  { code: 'F25',   name: 'Schizoaffective disorders', category: 'Schizophrenia Spectrum', framework: 'ICD-10' },
  { code: 'F21',   name: 'Schizotypal disorder', category: 'Schizophrenia Spectrum', framework: 'ICD-10' },
  { code: 'F23',   name: 'Acute and transient psychotic disorders', category: 'Schizophrenia Spectrum', framework: 'ICD-10' },
  { code: 'F22',   name: 'Persistent delusional disorders', category: 'Schizophrenia Spectrum', framework: 'ICD-10' },

  // Substance Use Disorders
  { code: 'F10.2', name: 'Alcohol dependence syndrome', category: 'Substance Use Disorders', framework: 'ICD-10' },
  { code: 'F10.1', name: 'Harmful use of alcohol', category: 'Substance Use Disorders', framework: 'ICD-10' },
  { code: 'F12.2', name: 'Cannabis dependence syndrome', category: 'Substance Use Disorders', framework: 'ICD-10' },
  { code: 'F11.2', name: 'Opioid dependence syndrome', category: 'Substance Use Disorders', framework: 'ICD-10' },
  { code: 'F13.2', name: 'Sedative/hypnotic dependence syndrome', category: 'Substance Use Disorders', framework: 'ICD-10' },
  { code: 'F14.2', name: 'Cocaine dependence syndrome', category: 'Substance Use Disorders', framework: 'ICD-10' },
  { code: 'F15.2', name: 'Stimulant dependence syndrome', category: 'Substance Use Disorders', framework: 'ICD-10' },

  // Neurocognitive Disorders
  { code: 'F00',   name: 'Dementia in Alzheimer disease', category: 'Neurocognitive Disorders', framework: 'ICD-10' },
  { code: 'F01',   name: 'Vascular dementia', category: 'Neurocognitive Disorders', framework: 'ICD-10' },
  { code: 'F02.4', name: 'Dementia in HIV disease', category: 'Neurocognitive Disorders', framework: 'ICD-10', description: 'Particularly relevant in Southern African context' },
  { code: 'F06.7', name: 'Mild cognitive disorder', category: 'Neurocognitive Disorders', framework: 'ICD-10' },

  // OCD and Related
  { code: 'F42',   name: 'Obsessive-compulsive disorder', category: 'OCD and Related', framework: 'ICD-10' },
  { code: 'F45.2', name: 'Hypochondriacal disorder (incl. body dysmorphic)', category: 'OCD and Related', framework: 'ICD-10' },

  // Personality Disorders
  { code: 'F60.3', name: 'Emotionally unstable personality disorder', category: 'Personality Disorders', framework: 'ICD-10', description: 'Includes borderline type — impulsivity, unstable affect and relationships' },
  { code: 'F60.2', name: 'Dissocial personality disorder', category: 'Personality Disorders', framework: 'ICD-10' },
  { code: 'F60.6', name: 'Anxious (avoidant) personality disorder', category: 'Personality Disorders', framework: 'ICD-10' },
  { code: 'F60.7', name: 'Dependent personality disorder', category: 'Personality Disorders', framework: 'ICD-10' },

  // Eating Disorders
  { code: 'F50.0', name: 'Anorexia nervosa', category: 'Eating Disorders', framework: 'ICD-10' },
  { code: 'F50.2', name: 'Bulimia nervosa', category: 'Eating Disorders', framework: 'ICD-10' },
  { code: 'F50.8', name: 'Other eating disorders (incl. binge eating)', category: 'Eating Disorders', framework: 'ICD-10' },
];

export const ALL_DIAGNOSTIC_CODES = [...ICD11_CODES, ...ICD10_CODES, ...DSM5_CODES];

export const DIAGNOSTIC_CATEGORIES = [
  'Mood Disorders',
  'Depressive Disorders',
  'Bipolar Disorders',
  'Anxiety Disorders',
  'Stress-Related Disorders',
  'Trauma and Stressor-Related',
  'Schizophrenia Spectrum',
  'Substance Use Disorders',
  'Substance-Related Disorders',
  'Neurocognitive Disorders',
  'OCD and Related',
  'Obsessive-Compulsive Disorders',
  'Personality Disorders',
  'Eating Disorders',
];

export const CONFIDENCE_LEVELS = [
  { value: 'definite', label: 'Definite', description: 'Meets full diagnostic criteria with high certainty' },
  { value: 'probable', label: 'Probable', description: 'Likely diagnosis, most criteria met' },
  { value: 'provisional', label: 'Provisional', description: 'Working diagnosis, requires further evaluation' },
  { value: 'rule_out', label: 'Rule Out', description: 'Under consideration, needs to be excluded or confirmed' },
] as const;

export const FORMULATION_STATUS = [
  { value: 'draft', label: 'Draft', description: 'Work in progress' },
  { value: 'pending_review', label: 'Pending Review', description: 'Awaiting clinical review' },
  { value: 'approved', label: 'Approved', description: 'Clinically approved diagnosis' },
  { value: 'superseded', label: 'Superseded', description: 'Replaced by newer formulation' },
] as const;

// Helper function to search codes
export function searchDiagnosticCodes(
  query: string,
  framework?: 'ICD-11' | 'ICD-10' | 'DSM-5'
): DiagnosticCode[] {
  const searchTerm = query.toLowerCase();
  let codes = framework 
    ? ALL_DIAGNOSTIC_CODES.filter(c => c.framework === framework)
    : ALL_DIAGNOSTIC_CODES;
  
  return codes.filter(code => 
    code.code.toLowerCase().includes(searchTerm) ||
    code.name.toLowerCase().includes(searchTerm) ||
    code.category.toLowerCase().includes(searchTerm) ||
    (code.description?.toLowerCase().includes(searchTerm) ?? false)
  );
}

// Get codes by category
export function getCodesByCategory(
  category: string,
  framework?: 'ICD-11' | 'ICD-10' | 'DSM-5'
): DiagnosticCode[] {
  let codes = framework 
    ? ALL_DIAGNOSTIC_CODES.filter(c => c.framework === framework)
    : ALL_DIAGNOSTIC_CODES;
  
  return codes.filter(code => code.category === category);
}

// Get common diagnoses for quick selection
export function getCommonDiagnoses(framework: 'ICD-11' | 'ICD-10' | 'DSM-5'): DiagnosticCode[] {
  const commonCodes: Record<string, string[]> = {
    'ICD-11': ['6A71', '6A74', '6B00', '6B40', '6A20', '6B43'],
    'ICD-10': ['F32.1', 'F33.1', 'F41.1', 'F43.1', 'F20',  'F43.2'],
    'DSM-5':  ['296.22', '296.32', '300.02', '309.81', '295.90', '309.28'],
  };
  return ALL_DIAGNOSTIC_CODES.filter(
    code => code.framework === framework && commonCodes[framework].includes(code.code)
  );
}
