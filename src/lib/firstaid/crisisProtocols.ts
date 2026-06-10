// Mental Health First Aid Crisis Protocols
// Based on WHO mhGAP and adapted for Southern African context

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
      'Understand cultural beliefs about death and suicide',
      'Involve traditional healers if appropriate and consented',
      'Consider family and community dynamics',
      'Be aware of cultural idioms of distress (e.g., "kufungisisa")',
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
      'Distinguish cultural/spiritual experiences from psychosis',
      'Consult with cultural experts if needed',
      'Consider traditional explanatory models',
      'Involve family in culturally appropriate way',
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
    name: 'Emergency Services',
    description: 'For life-threatening situations',
    contact: 'Local Emergency Number',
    criteria: ['Overdose', 'Severe self-harm', 'Immediate suicide risk', 'Violence to others'],
  },
  {
    id: 'psychiatric_emergency',
    name: 'Psychiatric Emergency Unit',
    description: 'For acute psychiatric crises requiring admission',
    contact: 'Local Psychiatric Hospital',
    criteria: ['Psychotic episode', 'Severe suicidal ideation', 'Unable to care for self'],
  },
  {
    id: 'crisis_line',
    name: 'Mental Health Crisis Line',
    description: '24-hour telephone support',
    contact: 'National Crisis Line',
    criteria: ['After-hours support', 'Telephone counseling', 'Non-emergency crisis'],
  },
  {
    id: 'community_mental_health',
    name: 'Community Mental Health Services',
    description: 'For ongoing outpatient care',
    contact: 'Local CMHT',
    criteria: ['Follow-up care', 'Medication management', 'Therapy referral'],
  },
  {
    id: 'substance_services',
    name: 'Substance Use Services',
    description: 'For addiction treatment and detox',
    contact: 'Local Substance Use Service',
    criteria: ['Detoxification', 'Rehabilitation', 'Harm reduction'],
  },
];

export function getProtocolByCrisisType(crisisType: string): CrisisProtocol | undefined {
  return CRISIS_PROTOCOLS[crisisType];
}

export function getChecklistByCrisisType(crisisType: string): EmergencyChecklist | undefined {
  return EMERGENCY_CHECKLISTS.find(c => c.crisisType === crisisType);
}
