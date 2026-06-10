import { HelpCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";

export const HelpCentre = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <HelpCircle className="h-5 w-5 stroke-[2.5]" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Help Centre</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="getting-started" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="getting-started" className="text-xs">Start</TabsTrigger>
            <TabsTrigger value="recording" className="text-xs">Recording</TabsTrigger>
            <TabsTrigger value="screening" className="text-xs">Screening</TabsTrigger>
            <TabsTrigger value="mse" className="text-xs">MSE</TabsTrigger>
            <TabsTrigger value="diagnosis" className="text-xs">Diagnosis</TabsTrigger>
            <TabsTrigger value="firstaid" className="text-xs">First Aid</TabsTrigger>
            <TabsTrigger value="patients" className="text-xs">Patients</TabsTrigger>
            <TabsTrigger value="faq" className="text-xs">FAQ</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[60vh] mt-4 pr-4">
            <TabsContent value="getting-started" className="mt-0">
              <GettingStartedTab />
            </TabsContent>
            
            <TabsContent value="recording" className="mt-0">
              <RecordingTab />
            </TabsContent>
            
            <TabsContent value="screening" className="mt-0">
              <ScreeningTab />
            </TabsContent>
            
            <TabsContent value="mse" className="mt-0">
              <MSETab />
            </TabsContent>
            
            <TabsContent value="diagnosis" className="mt-0">
              <DiagnosisTab />
            </TabsContent>
            
            <TabsContent value="firstaid" className="mt-0">
              <FirstAidTab />
            </TabsContent>
            
            <TabsContent value="patients" className="mt-0">
              <PatientsTab />
            </TabsContent>
            
            <TabsContent value="faq" className="mt-0">
              <FAQTab />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

const GettingStartedTab = () => (
  <div className="space-y-4">
    <p className="text-sm text-muted-foreground">
      Welcome to Aperta Health! Here's how to get started with your first clinical assessment.
    </p>
    
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="workflow">
        <AccordionTrigger>Recommended Workflow</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <ol className="list-decimal list-inside space-y-2">
            <li><strong>Create/Select Patient:</strong> Go to Patients tab and create a new patient profile or select existing.</li>
            <li><strong>Administer Screening:</strong> Use the Screening tab to administer relevant tools (GAD-7, PHQ-9, PCL-5, PRIME-R-5, etc.).</li>
            <li><strong>Record Narrative:</strong> In Assessment tab, record or type your clinical observations.</li>
            <li><strong>Process with AI:</strong> Click "Process Narrative" to generate the MSE with screening context.</li>
            <li><strong>Review AI Suggestions:</strong> Check AI diagnostic suggestions based on MSE and screening data.</li>
            <li><strong>Complete Diagnosis:</strong> Select ICD-11/DSM-5 codes, add differential diagnoses, and cultural formulation.</li>
            <li><strong>Generate Treatment Plan:</strong> Review and generate AI-suggested treatment recommendations.</li>
            <li><strong>Crisis Intervention:</strong> Use First Aid module if crisis situations arise.</li>
            <li><strong>Schedule Follow-up:</strong> Book appointments based on treatment plan intervals.</li>
            <li><strong>Export Documentation:</strong> Download Case Summary PDFs for clinical records.</li>
          </ol>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="demo">
        <AccordionTrigger>Try Demo Scenarios</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>Demo scenarios help you explore the app without patient data:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Depression:</strong> PHQ-9 relevant case with mood symptoms</li>
            <li><strong>Anxiety:</strong> GAD-7 relevant case with worry patterns</li>
            <li><strong>PTSD:</strong> PCL-5 relevant trauma presentation</li>
            <li><strong>Psychosis:</strong> PSQ relevant with perceptual disturbances</li>
            <li><strong>Prodromal:</strong> PRIME-R-5 relevant early psychosis signs</li>
            <li><strong>Cognitive:</strong> MMSE relevant with memory concerns</li>
          </ul>
          <p className="text-muted-foreground mt-2">Click any demo card to load a sample narrative.</p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="navigation">
        <AccordionTrigger>Navigation Overview</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Assessment:</strong> Main clinical workflow - record, process, treat</li>
            <li><strong>Screening:</strong> Administer standardized instruments</li>
            <li><strong>Diagnosis:</strong> Formulate diagnoses with ICD-11/DSM-5 codes</li>
            <li><strong>First Aid:</strong> Crisis intervention protocols and checklists</li>
            <li><strong>Patients:</strong> Manage patient profiles and view details</li>
            <li><strong>History:</strong> Review past assessments and trends</li>
            <li><strong>Analytics:</strong> Dashboard of clinical activity metrics</li>
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
);

const RecordingTab = () => (
  <div className="space-y-4">
    <p className="text-sm text-muted-foreground">
      Record clinical narratives with voice-to-text transcription supporting multiple Southern African languages.
    </p>
    
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="basic-recording">
        <AccordionTrigger>Basic Recording</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <ol className="list-decimal list-inside space-y-1">
            <li>Click the microphone button to start recording</li>
            <li>Speak your clinical observations clearly</li>
            <li>Click again to stop and transcribe</li>
            <li>The transcribed text appears in the input area</li>
            <li>Edit as needed, then click "Process Narrative"</li>
          </ol>
          <p className="text-muted-foreground mt-2">
            <strong>Tip:</strong> You can also type directly or combine typing with recording.
          </p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="vad">
        <AccordionTrigger>Voice Activity Detection (VAD)</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>VAD automatically pauses recording during silence:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Auto-pause:</strong> After 2 seconds of silence, recording pauses</li>
            <li><strong>Auto-resume:</strong> Speaking resumes recording automatically</li>
            <li><strong>Benefits:</strong> Reduces dead air, cleaner transcripts</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            Toggle VAD on/off before starting recording. When enabled, you'll see a "VAD" indicator.
          </p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="languages">
        <AccordionTrigger>Supported Languages</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>The transcription system supports:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>English (primary)</li>
            <li>Shona</li>
            <li>Ndebele</li>
            <li>Xhosa</li>
            <li>Zulu</li>
            <li>Sotho</li>
            <li>Afrikaans</li>
            <li>Swahili</li>
            <li>French</li>
            <li>Portuguese</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            Cultural idioms of distress (e.g., kufungisisa, mhepo, hartseer, msongo wa mawazo) are recognized and interpreted in the MSE analysis.
          </p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="troubleshooting">
        <AccordionTrigger>Troubleshooting</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>No audio:</strong> Check browser microphone permissions</li>
            <li><strong>Poor quality:</strong> Use a quiet environment, speak clearly</li>
            <li><strong>Won't stop:</strong> Click the stop button firmly; VAD may be resuming</li>
            <li><strong>Transcription fails:</strong> Try shorter recordings, check internet connection</li>
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
);

const ScreeningTab = () => (
  <div className="space-y-4">
    <p className="text-sm text-muted-foreground">
      Administer validated clinical screening instruments. Results auto-populate MSE analysis and diagnostic formulation context.
    </p>
    
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="gad7">
        <AccordionTrigger>GAD-7 (Anxiety)</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p><strong>Purpose:</strong> Screens for Generalized Anxiety Disorder</p>
          <p><strong>Questions:</strong> 7 items rated 0-3 over past 2 weeks</p>
          <p><strong>Scoring:</strong></p>
          <ul className="list-disc list-inside ml-2">
            <li>0-4: Minimal anxiety</li>
            <li>5-9: Mild anxiety</li>
            <li>10-14: Moderate anxiety</li>
            <li>15-21: Severe anxiety</li>
          </ul>
          <p className="text-muted-foreground mt-2">Informs MSE anxiety and worry descriptions, and suggests anxiety-related diagnoses.</p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="phq9">
        <AccordionTrigger>PHQ-9 (Depression)</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p><strong>Purpose:</strong> Screens for Major Depressive Disorder</p>
          <p><strong>Questions:</strong> 9 items rated 0-3 over past 2 weeks</p>
          <p><strong>Scoring:</strong></p>
          <ul className="list-disc list-inside ml-2">
            <li>0-4: Minimal depression</li>
            <li>5-9: Mild depression</li>
            <li>10-14: Moderate depression</li>
            <li>15-19: Moderately severe depression</li>
            <li>20-27: Severe depression</li>
          </ul>
          <p className="text-amber-600 mt-2"><strong>Note:</strong> Question 9 assesses suicidality - positive responses trigger safety alerts.</p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="pcl5">
        <AccordionTrigger>PCL-5 (PTSD)</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p><strong>Purpose:</strong> Screens for Post-Traumatic Stress Disorder (DSM-5)</p>
          <p><strong>Questions:</strong> 20 items rated 0-4 over past month</p>
          <p><strong>Clusters:</strong></p>
          <ul className="list-disc list-inside ml-2">
            <li>B (1-5): Intrusion symptoms</li>
            <li>C (6-7): Avoidance</li>
            <li>D (8-14): Negative cognitions/mood</li>
            <li>E (15-20): Arousal/reactivity</li>
          </ul>
          <p><strong>Cutoff:</strong> Score ≥31-33 suggests probable PTSD</p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="mmse">
        <AccordionTrigger>MMSE (Cognitive)</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p><strong>Purpose:</strong> Screens for cognitive impairment</p>
          <p><strong>Domains:</strong> Orientation, registration, attention, recall, language, construction</p>
          <p><strong>Scoring:</strong></p>
          <ul className="list-disc list-inside ml-2">
            <li>24-30: Normal cognition</li>
            <li>19-23: Mild impairment</li>
            <li>10-18: Moderate impairment</li>
            <li>0-9: Severe impairment</li>
          </ul>
          <p className="text-muted-foreground mt-2">Consider education level when interpreting scores.</p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="psq">
        <AccordionTrigger>PSQ (Psychosis)</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p><strong>Purpose:</strong> Screens for psychotic symptoms</p>
          <p><strong>Questions:</strong> 5 Yes/No items about unusual experiences</p>
          <p><strong>Areas covered:</strong></p>
          <ul className="list-disc list-inside ml-2">
            <li>Thought reading/broadcasting</li>
            <li>Unusual experiences</li>
            <li>Hallucinations</li>
            <li>Paranoid ideation</li>
            <li>Strange beliefs</li>
          </ul>
          <p><strong>Interpretation:</strong> ≥3 positive responses suggest further evaluation needed</p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="primer5">
        <AccordionTrigger>PRIME-R-5 (Prodromal Psychosis)</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p><strong>Purpose:</strong> Screens for prodromal (early) psychosis risk symptoms</p>
          <p><strong>Questions:</strong> 5 items rated 0-6 (7-point Likert scale)</p>
          <p><strong>Scale:</strong> Definitely Disagree (0) to Definitely Agree (6)</p>
          <p><strong>Domains assessed:</strong></p>
          <ul className="list-disc list-inside ml-2">
            <li>Unusual visual experiences</li>
            <li>Unusual auditory experiences</li>
            <li>Unusual thoughts</li>
            <li>Paranoid ideation / ideas of reference</li>
            <li>Unusual somatic experiences</li>
          </ul>
          <p><strong>Scoring (Total 0-30):</strong></p>
          <ul className="list-disc list-inside ml-2">
            <li>0-5: Low Risk</li>
            <li>6-9: Moderate Risk</li>
            <li>10-17: High Risk (further evaluation recommended)</li>
            <li>18-30: Very High Risk (urgent specialist referral)</li>
          </ul>
          <p className="text-amber-600 mt-2">
            <strong>Note:</strong> Individual items scoring ≥4 warrant clinical attention for that specific symptom domain.
          </p>
          <p className="text-muted-foreground mt-2">
            <strong>Clinical significance:</strong> PRIME-R-5 identifies attenuated psychotic symptoms that may indicate ultra-high risk for psychosis. Early identification enables early intervention, which improves outcomes.
          </p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="context">
        <AccordionTrigger>How Screening Informs MSE & Diagnosis</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>Screening results automatically enhance MSE analysis and diagnostic suggestions:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>PHQ-9:</strong> Informs mood, affect, suicidality sections, and depressive disorder diagnoses</li>
            <li><strong>GAD-7:</strong> Informs anxiety features, worry patterns, and anxiety disorder diagnoses</li>
            <li><strong>PCL-5:</strong> Informs trauma history, perception sections, and PTSD diagnosis</li>
            <li><strong>MMSE:</strong> Informs cognitive status, orientation, and neurocognitive disorder diagnoses</li>
            <li><strong>PSQ:</strong> Informs thought content, perceptual experiences, and psychotic disorder diagnoses</li>
            <li><strong>PRIME-R-5:</strong> Informs prodromal symptoms, perception, thought content, and at-risk mental state</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            Complete screening before recording narrative for richest MSE and diagnostic context.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
);

const MSETab = () => (
  <div className="space-y-4">
    <p className="text-sm text-muted-foreground">
      AI-generated Mental Status Examination and treatment planning with clinical governance.
    </p>
    
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="mse-sections">
        <AccordionTrigger>MSE Sections Generated</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>The AI generates a comprehensive MSE including:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Appearance:</strong> Physical presentation, grooming, attire</li>
            <li><strong>Behavior:</strong> Psychomotor activity, eye contact, mannerisms</li>
            <li><strong>Speech:</strong> Rate, volume, tone, coherence</li>
            <li><strong>Mood & Affect:</strong> Subjective mood, objective affect, congruence</li>
            <li><strong>Thought Process:</strong> Organization, flow, associations</li>
            <li><strong>Thought Content:</strong> Preoccupations, delusions, obsessions</li>
            <li><strong>Perception:</strong> Hallucinations, illusions, derealization</li>
            <li><strong>Cognition:</strong> Orientation, attention, memory</li>
            <li><strong>Insight & Judgment:</strong> Awareness of illness, decision-making</li>
            <li><strong>Risk Assessment:</strong> Safety concerns, protective factors</li>
          </ul>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="cultural">
        <AccordionTrigger>Cultural Idiom Recognition</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>The AI recognizes Southern African cultural expressions:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Kufungisisa (Shona):</strong> "Thinking too much" - often depression/anxiety</li>
            <li><strong>Mhepo (Shona):</strong> Spirit-related distress</li>
            <li><strong>Ukuthwasa:</strong> Calling to traditional healing</li>
            <li><strong>Amafufunyana:</strong> Possession states</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            Cultural interpretations are included alongside clinical formulations.
          </p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="treatment">
        <AccordionTrigger>Treatment Recommendations</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>AI-generated treatment plans include:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Primary interventions:</strong> Core treatment approach</li>
            <li><strong>Psychosocial interventions:</strong> Therapy, support groups</li>
            <li><strong>Pharmacological considerations:</strong> Medication options</li>
            <li><strong>Monitoring plan:</strong> Follow-up schedule and metrics</li>
            <li><strong>Referral criteria:</strong> When to escalate care</li>
            <li><strong>Cultural adaptations:</strong> Culturally sensitive approaches</li>
            <li><strong>Patient education:</strong> Key information for patient</li>
          </ul>
          <p className="text-amber-600 mt-2">
            <strong>Remember:</strong> "AI suggests, doctor decides" - always review and approve.
          </p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="export">
        <AccordionTrigger>Exporting Documentation</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>PDF exports available for:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Clinical Abstract (MSE):</strong> Full MSE documentation</li>
            <li><strong>Treatment Plan:</strong> Recommendations with patient context</li>
            <li><strong>Screening Results:</strong> Individual tool scores and interpretations</li>
            <li><strong>Case Summary:</strong> Comprehensive report with all clinical data</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            Click the download/export icon on each section to generate PDFs.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
);

const DiagnosisTab = () => (
  <div className="space-y-4">
    <p className="text-sm text-muted-foreground">
      Complete diagnostic formulation with ICD-11/DSM-5 coding, AI suggestions, and cultural considerations.
    </p>
    
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="frameworks">
        <AccordionTrigger>Diagnostic Frameworks (ICD-11 vs DSM-5)</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>Aperta Health supports both major diagnostic systems:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>ICD-11:</strong> WHO International Classification of Diseases, 11th revision - preferred for international and public health contexts</li>
            <li><strong>DSM-5:</strong> American Psychiatric Association's Diagnostic and Statistical Manual - widely used in clinical and research settings</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            Select your preferred framework when creating a diagnostic formulation. Codes are searchable by name or code number.
          </p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="primary-diagnosis">
        <AccordionTrigger>Selecting Primary Diagnosis</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>To select a primary diagnosis:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Choose the diagnostic framework (ICD-11 or DSM-5)</li>
            <li>Search for the diagnosis by name or code</li>
            <li>Select from the filtered results</li>
            <li>Add diagnostic reasoning to document your clinical rationale</li>
            <li>Set confidence level (High, Moderate, Low, Provisional)</li>
          </ol>
          <p className="text-muted-foreground mt-2">
            The primary diagnosis should reflect the main condition being treated.
          </p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="differential">
        <AccordionTrigger>Differential Diagnosis Workflow</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>Build a comprehensive differential diagnosis list:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Add alternatives:</strong> Include conditions to rule out or consider</li>
            <li><strong>Document reasoning:</strong> Note why each differential is included or excluded</li>
            <li><strong>Track status:</strong> Mark differentials as Considered, Ruled Out, or Confirmed</li>
            <li><strong>Review over time:</strong> Update as new information becomes available</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            A thorough differential demonstrates clinical rigor and supports diagnostic accuracy.
          </p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="ai-suggestions">
        <AccordionTrigger>Using AI Diagnostic Suggestions</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>AI analyzes MSE and screening data to suggest possible diagnoses:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Evidence-based:</strong> Suggestions reference specific clinical findings</li>
            <li><strong>Confidence levels:</strong> Each suggestion includes a confidence indicator</li>
            <li><strong>Accept or reject:</strong> One-click to add suggestions to your formulation</li>
            <li><strong>Supporting evidence:</strong> View the clinical data supporting each suggestion</li>
          </ul>
          <p className="text-amber-600 mt-2">
            <strong>Remember:</strong> AI suggestions are advisory only. Clinical judgment always takes precedence.
          </p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="cultural-formulation">
        <AccordionTrigger>Cultural Formulation</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>Document cultural factors affecting diagnosis and treatment:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Cultural identity:</strong> Patient's cultural reference groups</li>
            <li><strong>Cultural explanations:</strong> Patient's understanding of illness</li>
            <li><strong>Cultural factors:</strong> Social stressors and supports</li>
            <li><strong>Cultural elements:</strong> Impact on help-seeking and treatment</li>
            <li><strong>Overall assessment:</strong> How culture influences diagnosis and care</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            Cultural formulation is essential for accurate diagnosis and effective treatment planning in Southern African contexts.
          </p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="approval">
        <AccordionTrigger>Approval and Finalization</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>Complete the diagnostic formulation process:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Review all diagnostic elements for accuracy</li>
            <li>Ensure supporting evidence is documented</li>
            <li>Add any final clinical notes</li>
            <li>Click "Approve & Finalize" to lock the formulation</li>
            <li>Approved diagnoses appear in patient history and case summaries</li>
          </ol>
          <p className="text-muted-foreground mt-2">
            Finalized diagnoses can be updated with new formulations as clinical understanding evolves.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
);

const FirstAidTab = () => (
  <div className="space-y-4">
    <p className="text-sm text-muted-foreground">
      Crisis intervention protocols, emergency checklists, and referral pathways for acute psychiatric situations.
    </p>
    
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="overview">
        <AccordionTrigger>Overview of First Aid Module</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>The First Aid module provides structured support for crisis situations:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Crisis protocols:</strong> Evidence-based intervention steps</li>
            <li><strong>Emergency checklists:</strong> Ensure no critical steps are missed</li>
            <li><strong>Referral forms:</strong> Streamlined documentation for escalation</li>
            <li><strong>Crisis logging:</strong> Automatic documentation of interventions</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            Access First Aid from the main navigation when a crisis situation arises.
          </p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="crisis-types">
        <AccordionTrigger>Crisis Types and Severity Levels</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p><strong>Crisis types supported:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Suicidal Crisis:</strong> Active suicidal ideation or attempt</li>
            <li><strong>Self-Harm:</strong> Non-suicidal self-injury</li>
            <li><strong>Acute Psychosis:</strong> Active psychotic symptoms requiring intervention</li>
            <li><strong>Severe Anxiety/Panic:</strong> Acute panic attacks or severe anxiety</li>
            <li><strong>Aggressive Behavior:</strong> Violence risk or agitation</li>
            <li><strong>Substance Intoxication/Withdrawal:</strong> Acute substance-related crises</li>
          </ul>
          <p className="mt-2"><strong>Severity levels:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Low:</strong> Stable, can be managed with standard care</li>
            <li><strong>Medium:</strong> Requires enhanced monitoring</li>
            <li><strong>High:</strong> Urgent intervention needed</li>
            <li><strong>Critical:</strong> Emergency services required</li>
          </ul>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="protocols">
        <AccordionTrigger>How to Use Protocols</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <ol className="list-decimal list-inside space-y-1">
            <li>Select the appropriate crisis type</li>
            <li>Review the step-by-step protocol</li>
            <li>Follow safety assessment guidelines</li>
            <li>Document interventions as you proceed</li>
            <li>Use de-escalation techniques as outlined</li>
            <li>Determine appropriate level of care</li>
          </ol>
          <p className="text-muted-foreground mt-2">
            Protocols are based on Australian APS Guidelines / MBS Better Access and adapted for Southern African contexts.
          </p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="checklists">
        <AccordionTrigger>Emergency Checklist Workflow</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>Emergency checklists ensure comprehensive crisis management:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Safety first:</strong> Immediate safety assessment items</li>
            <li><strong>Clinical assessment:</strong> Key evaluation points</li>
            <li><strong>Intervention steps:</strong> Required actions</li>
            <li><strong>Documentation:</strong> What to record</li>
            <li><strong>Follow-up:</strong> Post-crisis requirements</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            Check off items as completed. Incomplete items remain visible for follow-up.
          </p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="interventions">
        <AccordionTrigger>Documenting Interventions</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>All crisis interventions are logged automatically:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Timeline:</strong> When the crisis started and resolved</li>
            <li><strong>Actions taken:</strong> Specific interventions used</li>
            <li><strong>Checklist completion:</strong> Which safety steps were completed</li>
            <li><strong>Outcome:</strong> Resolution status and next steps</li>
            <li><strong>Referrals made:</strong> Any escalation of care</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            Crisis logs appear in patient profiles and case summaries for continuity of care.
          </p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="referrals">
        <AccordionTrigger>Referral Process</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>When escalation is needed:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Click "Make Referral" in the First Aid module</li>
            <li>Select referral type (Emergency, Urgent, Routine)</li>
            <li>Choose destination (Hospital, Specialist, Community)</li>
            <li>Complete the referral form with clinical summary</li>
            <li>Generate referral letter for patient/receiving facility</li>
          </ol>
          <p className="text-muted-foreground mt-2">
            Referrals are saved to patient records and can be exported as PDFs.
          </p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="cultural-crisis">
        <AccordionTrigger>Cultural Considerations in Crisis</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>Cultural factors to consider during crisis intervention:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Communication style:</strong> Adapt approach to cultural norms</li>
            <li><strong>Family involvement:</strong> Consider family role in decision-making</li>
            <li><strong>Traditional healers:</strong> May be part of patient's support system</li>
            <li><strong>Spiritual beliefs:</strong> Respect while ensuring safety</li>
            <li><strong>Stigma concerns:</strong> Address confidentiality sensitively</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            Cultural sensitivity can improve crisis resolution and treatment engagement.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
);

const PatientsTab = () => (
  <div className="space-y-4">
    <p className="text-sm text-muted-foreground">
      Manage patient profiles, view comprehensive histories, and export clinical documentation.
    </p>
    
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="create-patient">
        <AccordionTrigger>Creating Patients</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>Patient profiles include:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Identifier:</strong> Unique patient ID/name</li>
            <li><strong>Date of Birth:</strong> For age calculations</li>
            <li><strong>Gender:</strong> Demographic information</li>
            <li><strong>Language Preference:</strong> Primary language</li>
            <li><strong>Cultural Background:</strong> Context for cultural idioms</li>
            <li><strong>Contact Notes:</strong> Phone, emergency contacts</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            Click "New Patient" button in Patients tab to create a profile.
          </p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="appointments">
        <AccordionTrigger>Appointment Scheduling</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>Schedule and manage follow-up appointments:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Select date and time from calendar</li>
            <li>Choose appointment type (Follow-up, Review, etc.)</li>
            <li>Set duration (default 30 minutes)</li>
            <li>Add appointment notes</li>
          </ul>
          <p><strong>SMS Reminders:</strong> Automated reminders sent 24 hours before appointments (requires patient phone number in contact notes).</p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="history">
        <AccordionTrigger>Patient History</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>Track longitudinal care:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Assessment History:</strong> All past MSE assessments</li>
            <li><strong>Screening Trends:</strong> Score changes over time with visual charts</li>
            <li><strong>Diagnostic History:</strong> All diagnostic formulations with ICD/DSM codes</li>
            <li><strong>Treatment Plans:</strong> Historical recommendations</li>
            <li><strong>Crisis Interventions:</strong> Logged crisis episodes and outcomes</li>
            <li><strong>Appointment Log:</strong> Past and scheduled visits</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            View patient profile to see complete history and trends.
          </p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="screening-trends">
        <AccordionTrigger>Screening Trend Visualization</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>Track screening scores over time:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Line charts:</strong> Visual representation of score changes</li>
            <li><strong>Multi-tool view:</strong> Compare PHQ-9, GAD-7, PCL-5, etc. on one chart</li>
            <li><strong>Normalized scores:</strong> Percentage-based comparison across different tools</li>
            <li><strong>Severity tracking:</strong> See how severity levels change over time</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            Trends help identify treatment response and inform care adjustments.
          </p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="case-summary">
        <AccordionTrigger>Case Summary PDF Export</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>Generate comprehensive clinical reports:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Patient demographics:</strong> Complete profile information</li>
            <li><strong>Screening results:</strong> All administered tools with scores and interpretations</li>
            <li><strong>MSE findings:</strong> Latest mental status examination</li>
            <li><strong>Diagnostic formulations:</strong> Primary and differential diagnoses</li>
            <li><strong>Treatment plans:</strong> Current recommendations</li>
            <li><strong>Crisis interventions:</strong> Logged crisis episodes</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            Click "Export Case Summary" in the patient profile to generate a comprehensive PDF.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
);

const FAQTab = () => (
  <div className="space-y-4">
    <p className="text-sm text-muted-foreground">
      Frequently asked questions about using Aperta Health.
    </p>
    
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="data-security">
        <AccordionTrigger>Is my patient data secure?</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>Yes. All data is:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Encrypted in transit and at rest</li>
            <li>Stored in secure cloud infrastructure</li>
            <li>Accessible only to authenticated users</li>
            <li>Isolated per user account</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            Follow your institutional data protection policies for additional guidance.
          </p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="ai-accuracy">
        <AccordionTrigger>How accurate is the AI analysis?</AccordionTrigger>
        <AccordionContent className="text-sm space-y-2">
          <p>The AI provides suggestions based on your clinical narrative and screening data. However:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>AI does not replace clinical judgment</li>
            <li>Always verify AI-generated content</li>
            <li>Use as documentation assistance, not diagnosis</li>
            <li>Report any significant errors for improvement</li>
          </ul>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="offline">
        <AccordionTrigger>Can I use this offline?</AccordionTrigger>
        <AccordionContent className="text-sm">
          <p>No, Aperta Health requires an internet connection for:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>AI processing of narratives</li>
            <li>Audio transcription</li>
            <li>Saving patient data</li>
            <li>SMS reminder delivery</li>
          </ul>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="support">
        <AccordionTrigger>How do I get support?</AccordionTrigger>
        <AccordionContent className="text-sm">
          <p>For technical issues or feature requests:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Use the Ask AI assistant (bottom right) for quick help</li>
            <li>Contact your system administrator</li>
            <li>Report bugs through official channels</li>
          </ul>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="validation">
        <AccordionTrigger>Is this clinically validated?</AccordionTrigger>
        <AccordionContent className="text-sm">
          <p>Aperta Health is currently in development with clinical validation planned. The screening tools used (GAD-7, PHQ-9, PCL-5, MMSE, PSQ, PRIME-R-5) are internationally validated instruments. AI-generated content should be reviewed by qualified clinicians.</p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="diagnosis-approval">
        <AccordionTrigger>How do I finalize a diagnosis?</AccordionTrigger>
        <AccordionContent className="text-sm">
          <p>To finalize a diagnostic formulation:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Complete all required fields (primary diagnosis, reasoning)</li>
            <li>Review AI suggestions and add relevant differentials</li>
            <li>Add cultural formulation if applicable</li>
            <li>Click "Approve & Finalize" to lock the diagnosis</li>
          </ol>
          <p className="text-muted-foreground mt-2">Finalized diagnoses are included in case summaries and patient history.</p>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="crisis-help">
        <AccordionTrigger>What do I do in a crisis situation?</AccordionTrigger>
        <AccordionContent className="text-sm">
          <p>For crisis situations:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Navigate to the First Aid tab</li>
            <li>Select the appropriate crisis type</li>
            <li>Follow the protocol steps carefully</li>
            <li>Complete the emergency checklist</li>
            <li>Make referrals if needed</li>
            <li>Document the intervention</li>
          </ol>
          <p className="text-amber-600 mt-2">For immediate life-threatening emergencies, always call emergency services first.</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
);
