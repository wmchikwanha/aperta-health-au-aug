import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const AboutDialog = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Info className="h-5 w-5 stroke-[2.5]" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            About Aperta Health
            <Badge variant="secondary" className="text-xs">v3.1</Badge>
          </DialogTitle>
          <DialogDescription className="text-left space-y-4 pt-4">
            <p className="text-foreground font-medium">
              AI-Powered Clinical Decision Support for Mental Health in Southern & Sub-Saharan Africa
            </p>
            
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-semibold text-foreground mb-1">What It Does</p>
                <p>
                  Aperta Health transforms unstructured clinical narratives into 
                  structured mental health assessments with deep cultural sensitivity for Southern and 
                  Sub-Saharan African contexts. It supports a graduated workforce model — from Community 
                  Health Workers recording and referring, to psychiatrists completing full diagnostic 
                  formulations — with role-based access control ensuring clinical safety at every level.
                </p>
              </div>

              <div>
                <p className="font-semibold text-foreground mb-2">Key Features</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <p className="font-medium text-foreground text-xs uppercase tracking-wide">Assessment</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1 text-muted-foreground">
                      <li>Voice-to-text narrative capture</li>
                      <li>Voice Activity Detection (VAD)</li>
                      <li>Automated MSE generation</li>
                      <li>Risk level detection & alerts</li>
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-medium text-foreground text-xs uppercase tracking-wide">Screening Tools</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1 text-muted-foreground">
                      <li>PHQ-9 (Depression)</li>
                      <li>GAD-7 (Anxiety)</li>
                      <li>PCL-5 (PTSD)</li>
                      <li>MMSE (Cognitive)</li>
                      <li>PSQ (Psychosis)</li>
                      <li>PRIME-R-5 (Prodromal)</li>
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-medium text-foreground text-xs uppercase tracking-wide">Diagnosis & Treatment</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1 text-muted-foreground">
                      <li>ICD-10/ICD-11/DSM-5 code selection</li>
                      <li>Differential diagnosis workspace</li>
                      <li>AI diagnostic suggestions</li>
                      <li>Australian APS Guidelines / MBS Better Access treatment planning</li>
                      <li>Case Summary PDF export</li>
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-medium text-foreground text-xs uppercase tracking-wide">Crisis & Referral</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1 text-muted-foreground">
                      <li>First Aid crisis protocols</li>
                      <li>Emergency checklists</li>
                      <li>CHW → clinician upward referral</li>
                      <li>Appointment scheduling & SMS</li>
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-medium text-foreground text-xs uppercase tracking-wide">Role-Based Access</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1 text-muted-foreground">
                      <li>Admin / Psychiatrist / Nurse / CHW tiers</li>
                      <li>CHW exclusion from diagnostics</li>
                      <li>CHW → Nurse → Psychiatrist referral chain</li>
                      <li>Full audit trail (FHIR AuditEvent)</li>
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-medium text-foreground text-xs uppercase tracking-wide">Cultural & Language</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1 text-muted-foreground">
                      <li>Shona, Ndebele, Zulu, Xhosa, Sotho</li>
                      <li>Afrikaans, Swahili</li>
                      <li>French (DRC), Portuguese (Moz/Angola)</li>
                      <li>Idioms of distress recognition</li>
                      <li>Code-switching support</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <p className="font-semibold text-foreground mb-1">Patient Pre-Registration</p>
                <p className="text-muted-foreground">
                  Patients can complete validated screening instruments, provide demographic and cultural 
                  context, and grant digital consent from home before their clinical encounter. Clinicians 
                  receive an AI-synthesised intake brief, reducing consultation time and improving care quality.
                </p>
              </div>

              <div>
                <p className="font-semibold text-foreground mb-1">Community Health Worker Model</p>
                <p className="text-muted-foreground">
                  CHWs operate in a restricted "exclusion zone" — they can record narratives, administer 
                  PHQ-9 screening, and refer patients upward to named clinicians. Diagnostic formulation, 
                  treatment planning, crisis protocols, and AI tools are gated to qualified clinicians only.
                </p>
              </div>

              <div>
                <p className="font-semibold text-foreground mb-1">Clinical Governance</p>
                <p className="text-muted-foreground">
                  All AI-generated content follows the principle "AI suggests, clinician decides." 
                  Clinicians maintain editorial control with full audit trails. FHIR R4 compliant 
                  data architecture ensures interoperability. No PII is stored. No medication dosages 
                  are prescribed. Source citations and confidence indicators support informed clinical judgment.
                </p>
              </div>

              <div>
                <p className="font-semibold text-foreground mb-1">Standards & Compliance</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {["FHIR R4", "ICD-10", "ICD-11", "DSM-5", "Australian APS Guidelines / MBS Better Access", "POPIA", "LOINC", "SaMD-aware"].map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs font-normal">{tag}</Badge>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground italic">
                  <strong>Important:</strong> This tool assists clinical documentation and decision support 
                  but does not replace professional judgment. All AI-generated content requires clinician 
                  review before clinical action. Designed and validated in partnership with specialist 
                  psychiatrists in Zimbabwe and Southern Africa.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  © {new Date().getFullYear()} StratedgeAI · Developed by Walter Chikwanha
                </p>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
