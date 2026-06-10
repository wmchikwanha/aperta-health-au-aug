// Mental Health First Aid Crisis Protocols
// Based on Australian APS Guidelines / MBS Better Access and adapted for Southern African context

export interface CrisisProtocol {
  id: string;
  name: string;
  description: string;
  severityIndicators: string[];
  immediateActions: string[];
  safetySteps: string[];
  communicationTips: string[];
  referralCriteria: string[];
  culturalConsiderations?: string[];
}

export interface ChecklistItem {
  id: string;
  label: string;
  critical: boolean;
  order: number;
}

export interface EmergencyChecklist {
  id: string;
  crisisType: string;
  title: string;
  items: ChecklistItem[];
}

export const CRISIS_TYPES = [
  { value: 'suicidal_ideation', label: 'Suicidal Ideation', icon: 'AlertTriangle', color: 'red' },
  { value: 'self_harm', label: 'Self-Harm', icon: 'Heart', color: 'red' },
  { value: 'psychotic_episode', label: 'Psychotic Episode', icon: 'Brain', color: 'orange' },
  { value: 'severe_anxiety', label: 'Severe Anxiety/Panic', icon: 'Activity', color: 'yellow' },
  { value: 'substance_crisis', label: 'Substance Crisis', icon: 'Pill', color: 'orange' },
  { value: 'violence_risk', label: 'Violence Risk', icon: 'Shield', color: 'red' },
  { value: 'other', label: 'Other Crisis', icon: 'HelpCircle', color: 'blue' },
] as const;

export const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', description: 'Stable, can be managed with support', color: 'green' },
  { value: 'moderate', label: 'Moderate', description: 'Requires close monitoring and intervention', color: 'yellow' },
  { value: 'high', label: 'High', description: 'Immediate intervention required', color: 'orange' },
  { value: 'critical', label: 'Critical', description: 'Emergency - immediate action needed', color: 'red' },
] as const;

export const CRISIS_PROTOCOLS: Record<string, CrisisProtocol> = {
  suicidal_ideation: {
    id: 'suicidal_ideation',
    name: 'Suicidal Ideation Protocol',
    description: 'For patients expressing thoughts of suicide or self-harm',
    severityIndicators: [
      'Active suicidal thoughts with plan and means',
      'Previous suicide attempts',
      'Recent significant loss or trauma',
      'Social isolation and hopelessness',
      'Giving away possessions or saying goodbye',
      'Sudden calmness after period of depression',
    ],
    immediateActions: [
      'Stay calm and listen without judgment',
      'Remove access to means (medications, weapons, etc.)',
      'Do not leave the person alone',
      'Contact emergency services if immediate risk',
      'Involve family/support network with consent',
      'Document the interaction thoroughly',
    ],
    safetySteps: [
      'Conduct formal suicide risk assessment',
      'Create a safety plan with the patient',
      'Identify protective factors and reasons for living',
      'Establish 24-hour support contact',
      'Schedule follow-up within 24-48 hours',
      'Consider voluntary or involuntary admission if needed',
    ],
    communicationTips: [
      'Ask directly about suicide - it does not increase risk',
      'Use open-ended questions',
      'Validate their feelings without endorsing the plan',
      'Express concern and care',
      'Avoid minimizing or dismissing their pain',
    ],
    referralCriteria: [
      'Active suicidal intent with plan',
      'Access to lethal means',
      'Previous serious attempts',
      'Psychotic symptoms',
      'Substance intoxication',
      'Lack of social support',
    ],
    culturalConsiderations: [
      'Understand cultural and religious beliefs about death and suicide',
      'Use accredited interpreters (TIS National 131 450) for non-English speakers',
      'Consider family / cultural-elder dynamics with consent',
      'Recognise CALD idioms of distress (e.g., Dari "jigar khun", Arabic "qabrid", Dinka "spirit not resting")',
      'For Aboriginal and Torres Strait Islander patients prioritise 13YARN (13 92 76) and local AMS',
    ],
  },
  self_harm: {
    id: 'self_harm',
    name: 'Self-Harm Protocol',
    description: 'For patients engaging in non-suicidal self-injury',
    severityIndicators: [
      'Visible wounds or injuries',
      'Frequent or escalating self-harm',
      'Use of dangerous methods',
      'Self-harm in public or unusual locations',
      'Associated suicidal ideation',
    ],
    immediateActions: [
      'Assess any physical injuries and provide first aid',
      'Remain calm and non-judgmental',
      'Remove immediate access to self-harm tools',
      'Assess for suicidal intent (often co-occurs)',
      'Create a safe environment',
    ],
    safetySteps: [
      'Understand the function of self-harm for the patient',
      'Develop alternative coping strategies',
      'Create harm minimization plan',
      'Address underlying emotional distress',
      'Plan regular follow-up sessions',
    ],
    communicationTips: [
      'Avoid showing shock or disgust',
      'Do not focus solely on the wounds',
      'Explore underlying emotions',
      'Validate distress without validating self-harm',
    ],
    referralCriteria: [
      'Severe or life-threatening injuries',
      'Suicidal ideation present',
      'Failure of outpatient interventions',
      'Underlying severe mental disorder',
    ],
  },
  psychotic_episode: {
    id: 'psychotic_episode',
    name: 'Acute Psychosis Protocol',
    description: 'For patients experiencing acute psychotic symptoms',
    severityIndicators: [
      'Command hallucinations to harm self/others',
      'Severe paranoid delusions',
      'Disorganized behavior and speech',
      'Agitation or aggression',
      'Inability to care for self',
      'First episode psychosis',
    ],
    immediateActions: [
      'Ensure safety of patient and others',
      'Speak calmly and clearly using simple language',
      'Reduce stimulation (noise, crowds, bright lights)',
      'Do not argue with delusions or hallucinations',
      'Maintain safe distance if agitated',
      'Call for backup if needed',
    ],
    safetySteps: [
      'Assess risk of violence',
      'Consider need for sedation (oral first)',
      'Arrange safe environment for assessment',
      'Contact family for collateral history',
      'Plan for psychiatric evaluation',
    ],
    communicationTips: [
      'Use short, clear sentences',
      'Do not whisper or laugh',
      'Avoid prolonged eye contact if patient is paranoid',
      'Acknowledge their distress without endorsing delusions',
      'Introduce yourself and explain what is happening',
    ],
    referralCriteria: [
      'First episode psychosis (always refer)',
      'Risk to self or others',
      'Failure to respond to oral medication',
      'Medical causes suspected',
      'Severe disorganization',
    ],
    culturalConsiderations: [
      'Distinguish culturally normative spiritual experiences from psychosis',
      'Engage accredited interpreters and bicultural workers where possible',
      'Consider migration trauma, detention experience, and acculturative stress',
      'Involve family using a culturally safe explanatory model',
    ],
  },
  severe_anxiety: {
    id: 'severe_anxiety',
    name: 'Severe Anxiety/Panic Protocol',
    description: 'For patients experiencing panic attacks or severe anxiety',
    severityIndicators: [
      'Hyperventilation or difficulty breathing',
      'Chest pain or palpitations',
      'Feeling of impending doom',
      'Dissociation or derealization',
      'Physical symptoms (sweating, trembling)',
    ],
    immediateActions: [
      'Move to a quiet, calm environment',
      'Speak in a calm, reassuring manner',
      'Guide slow, deep breathing exercises',
      'Ground the person in the present moment',
      'Rule out medical emergencies (cardiac, respiratory)',
    ],
    safetySteps: [
      'Teach grounding techniques (5-4-3-2-1)',
      'Practice controlled breathing together',
      'Reassure that panic attacks are not dangerous',
      'Identify triggers if possible',
      'Plan for future episodes',
    ],
    communicationTips: [
      'Stay calm yourself',
      'Validate their fear without reinforcing it',
      'Use simple, directive language',
      'Maintain a reassuring presence',
    ],
    referralCriteria: [
      'First panic attack (rule out medical causes)',
      'Frequent, disabling panic attacks',
      'Agoraphobia developing',
      'Suicidal ideation',
      'Substance use contributing',
    ],
  },
  substance_crisis: {
    id: 'substance_crisis',
    name: 'Substance Crisis Protocol',
    description: 'For acute intoxication, overdose, or withdrawal',
    severityIndicators: [
      'Signs of overdose (altered consciousness, respiratory depression)',
      'Severe withdrawal symptoms (seizures, delirium)',
      'Combination of substances',
      'Suicidal ideation while intoxicated',
      'Medical complications',
    ],
    immediateActions: [
      'Assess airway, breathing, circulation',
      'Call emergency services for overdose',
      'Place in recovery position if unconscious',
      'Do not give food or fluids if drowsy',
      'Stay with the person',
      'Administer naloxone if opioid overdose suspected',
    ],
    safetySteps: [
      'Monitor vital signs',
      'Assess withdrawal risk and manage appropriately',
      'Screen for suicidal ideation',
      'Plan for detoxification if needed',
      'Connect with substance use services',
    ],
    communicationTips: [
      'Be non-judgmental',
      'Do not lecture while intoxicated',
      'Focus on immediate safety',
      'Discuss help options when sober',
    ],
    referralCriteria: [
      'Overdose (always refer to emergency)',
      'Severe withdrawal risk',
      'Medical complications',
      'Suicidal ideation',
      'Failed community detox attempts',
    ],
  },
  violence_risk: {
    id: 'violence_risk',
    name: 'Violence Risk Protocol',
    description: 'For patients at risk of harming others',
    severityIndicators: [
      'Explicit threats to harm others',
      'History of violence',
      'Access to weapons',
      'Paranoid delusions about specific people',
      'Command hallucinations to harm',
      'Escalating agitation',
    ],
    immediateActions: [
      'Prioritize safety of all present',
      'Maintain safe distance and clear exit',
      'Speak calmly and non-confrontationally',
      'Do not challenge or argue',
      'Call security or police if imminent risk',
      'Remove potential weapons from environment',
    ],
    safetySteps: [
      'De-escalate before any intervention',
      'Do not restrain unless absolutely necessary and trained',
      'Consider chemical restraint as last resort',
      'Document threats and risk assessment',
      'Warn potential victims (duty to warn)',
    ],
    communicationTips: [
      'Use a calm, low tone',
      'Give choices where possible',
      'Acknowledge their frustration',
      'Set clear, simple limits',
      'Avoid power struggles',
    ],
    referralCriteria: [
      'Specific threats to identified victims',
      'Command hallucinations to harm',
      'Severe agitation not responding to de-escalation',
      'Weapons involvement',
    ],
  },
};

export const EMERGENCY_CHECKLISTS: EmergencyChecklist[] = [
  {
    id: 'suicide_immediate',
    crisisType: 'suicidal_ideation',
    title: 'Immediate Suicide Risk Checklist',
    items: [
      { id: 's1', label: 'Patient is not left alone', critical: true, order: 1 },
      { id: 's2', label: 'Means restriction implemented (medications, weapons removed)', critical: true, order: 2 },
      { id: 's3', label: 'Emergency services contacted if needed', critical: true, order: 3 },
      { id: 's4', label: 'Suicide risk assessment completed', critical: true, order: 4 },
      { id: 's5', label: 'Safety plan created with patient', critical: false, order: 5 },
      { id: 's6', label: 'Family/support person contacted', critical: false, order: 6 },
      { id: 's7', label: 'Follow-up appointment scheduled', critical: false, order: 7 },
      { id: 's8', label: 'Crisis hotline numbers provided', critical: false, order: 8 },
      { id: 's9', label: 'Documentation completed', critical: false, order: 9 },
    ],
  },
  {
    id: 'psychosis_acute',
    crisisType: 'psychotic_episode',
    title: 'Acute Psychosis Response Checklist',
    items: [
      { id: 'p1', label: 'Safety of patient and others ensured', critical: true, order: 1 },
      { id: 'p2', label: 'Environment is calm and low-stimulation', critical: true, order: 2 },
      { id: 'p3', label: 'Risk of violence assessed', critical: true, order: 3 },
      { id: 'p4', label: 'Medical causes ruled out (if first episode)', critical: true, order: 4 },
      { id: 'p5', label: 'Collateral history obtained', critical: false, order: 5 },
      { id: 'p6', label: 'Antipsychotic medication offered/given', critical: false, order: 6 },
      { id: 'p7', label: 'Psychiatric referral arranged', critical: false, order: 7 },
      { id: 'p8', label: 'Family psychoeducation provided', critical: false, order: 8 },
    ],
  },
  {
    id: 'overdose_response',
    crisisType: 'substance_crisis',
    title: 'Overdose Response Checklist',
    items: [
      { id: 'o1', label: 'Airway clear and breathing assessed', critical: true, order: 1 },
      { id: 'o2', label: 'Emergency services called', critical: true, order: 2 },
      { id: 'o3', label: 'Recovery position if unconscious', critical: true, order: 3 },
      { id: 'o4', label: 'Naloxone administered (if opioid suspected)', critical: true, order: 4 },
      { id: 'o5', label: 'Vital signs monitored', critical: true, order: 5 },
      { id: 'o6', label: 'Substance identified if possible', critical: false, order: 6 },
      { id: 'o7', label: 'Medical handover completed', critical: false, order: 7 },
    ],
  },
  {
    id: 'violence_deescalation',
    crisisType: 'violence_risk',
    title: 'Violence De-escalation Checklist',
    items: [
      { id: 'v1', label: 'Own safety ensured (exit route, distance)', critical: true, order: 1 },
      { id: 'v2', label: 'Backup called (security, colleagues)', critical: true, order: 2 },
      { id: 'v3', label: 'Weapons removed from environment', critical: true, order: 3 },
      { id: 'v4', label: 'De-escalation techniques applied', critical: true, order: 4 },
      { id: 'v5', label: 'Patient given space and choices', critical: false, order: 5 },
      { id: 'v6', label: 'PRN medication offered (oral first)', critical: false, order: 6 },
      { id: 'v7', label: 'Potential victims warned if identified threat', critical: true, order: 7 },
      { id: 'v8', label: 'Incident documented', critical: false, order: 8 },
    ],
  },
];

export const REFERRAL_PATHWAYS = [
  {
    id: 'emergency',
    name: 'Emergency Services (000)',
    description: 'For life-threatening situations — ambulance, police, fire',
    contact: '000',
    criteria: ['Overdose', 'Severe self-harm', 'Imminent suicide risk', 'Violence to others'],
  },
  {
    id: 'lifeline',
    name: 'Lifeline',
    description: '24-hour crisis support and suicide prevention',
    contact: '13 11 14',
    criteria: ['Suicidal ideation', 'Acute distress', 'After-hours support'],
  },
  {
    id: 'suicide_callback',
    name: 'Suicide Call Back Service',
    description: 'Free 24/7 counselling for people at risk of suicide and their carers',
    contact: '1300 659 467',
    criteria: ['Suicidal thoughts', 'Bereavement by suicide', 'Carer support'],
  },
  {
    id: '13yarn',
    name: '13YARN (Aboriginal & Torres Strait Islander crisis line)',
    description: 'Culturally safe crisis support line, 24/7',
    contact: '13 92 76',
    criteria: ['Aboriginal or Torres Strait Islander patients in crisis'],
  },
  {
    id: '1800respect',
    name: '1800RESPECT',
    description: 'National sexual assault, domestic and family violence counselling',
    contact: '1800 737 732',
    criteria: ['Family violence', 'Sexual assault', 'Coercive control'],
  },
  {
    id: 'tis_national',
    name: 'TIS National (interpreter service)',
    description: 'Free 24/7 telephone interpreting for clinicians and patients',
    contact: '131 450',
    criteria: ['Limited English proficiency', 'Bicultural Interpreter Mode unavailable'],
  },
  {
    id: 'psychiatric_emergency',
    name: 'Acute Mental Health (local Mental Health Triage)',
    description: 'State-based mental health triage and acute care team',
    contact: 'See local PHN / LHD directory',
    criteria: ['Psychotic episode', 'Severe suicidal ideation', 'Inability to care for self'],
  },
  {
    id: 'trauma_service',
    name: 'State Torture & Trauma Service',
    description: 'STARTTS (NSW), Foundation House (VIC), QPASTT (QLD), STTARS (SA), ASeTTS (WA), Phoenix (TAS), Companion House (ACT), Melaleuca (NT)',
    contact: 'Routed by patient state',
    criteria: ['Refugee or asylum-seeker with torture/trauma history', 'PCL-5 ≥33', 'HTQ Part IV positive'],
  },
  {
    id: 'community_mental_health',
    name: 'Better Access / Community Mental Health',
    description: 'GP-led referrals under MBS Better Access (MHTP items 2710 etc.) to psychologists or psychiatrists',
    contact: 'Patient\'s GP',
    criteria: ['Ongoing outpatient care', 'Medication review', 'Psychological therapy'],
  },
];

export function getProtocolByCrisisType(crisisType: string): CrisisProtocol | undefined {
  return CRISIS_PROTOCOLS[crisisType];
}

export function getChecklistByCrisisType(crisisType: string): EmergencyChecklist | undefined {
  return EMERGENCY_CHECKLISTS.find(c => c.crisisType === crisisType);
}
