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
            <Badge variant="secondary" className="text-xs">v1.0</Badge>
          </DialogTitle>
          <DialogDescription className="text-left space-y-4 pt-4">
            <p className="text-foreground font-medium">
              Mental Health Decision Support for refugee and CALD communities in Australia
            </p>

            <div className="space-y-4 text-sm">
              <div>
                <p className="font-semibold text-foreground mb-1">What it does</p>
                <p>
                  Aperta Health transforms unstructured clinical narratives into structured,
                  culturally informed mental health assessments — purpose-built for Australian
                  refugee health, asylum seeker clinics, PHN-funded services, and GP gateways to
                  Medicare Better Access. A graduated workforce model spans Bicultural Workers,
                  Refugee Health Nurses, GPs, and Psychiatrists / Clinical Psychologists, with
                  role-based access control safeguarding clinical responsibility at every step.
                </p>
              </div>

              <div>
                <p className="font-semibold text-foreground mb-2">Key features</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <p className="font-medium text-foreground text-xs uppercase tracking-wide">Assessment</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1 text-muted-foreground">
                      <li>Voice-to-text narrative capture</li>
                      <li>Bicultural Interpreter Mode</li>
                      <li>AI-assisted MSE generation</li>
                      <li>ATS 1–5 triage &amp; risk alerts</li>
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-medium text-foreground text-xs uppercase tracking-wide">Screening battery</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1 text-muted-foreground">
                      <li>RHS-15 (refugee health)</li>
                      <li>PHQ-9 / PHQ-9 Refugee Modified</li>
                      <li>GAD-7, PCL-5, MMSE, GDS-15</li>
                      <li>HTQ Part IV (torture history)</li>
                      <li>WHODAS 2.0 (function)</li>
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-medium text-foreground text-xs uppercase tracking-wide">Diagnosis &amp; care plan</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1 text-muted-foreground">
                      <li>ICD-10 / ICD-11 / DSM-5 codes</li>
                      <li>Cultural formulation prompts</li>
                      <li>Suggested MBS items (2710 etc.)</li>
                      <li>Australian APS Guidelines / MBS Better Access aligned</li>
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-medium text-foreground text-xs uppercase tracking-wide">Crisis &amp; referral</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1 text-muted-foreground">
                      <li>Lifeline, 13YARN, 1800RESPECT, 000</li>
                      <li>State trauma services (STARTTS, Foundation House, QPASTT…)</li>
                      <li>Bicultural Worker → GP/Psychiatrist handover</li>
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-medium text-foreground text-xs uppercase tracking-wide">Roles</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1 text-muted-foreground">
                      <li>Bicultural Worker / Refugee Health Nurse / GP / Psychiatrist</li>
                      <li>Graduated access &amp; gating</li>
                      <li>FHIR AuditEvent trail</li>
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-medium text-foreground text-xs uppercase tracking-wide">Languages</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1 text-muted-foreground">
                      <li>Dari, Pashto, Urdu, Arabic</li>
                      <li>Swahili, Kirundi, Kinyarwanda</li>
                      <li>Mandarin, Vietnamese, Burmese</li>
                      <li>Dinka, Nuer (interpreter mode)</li>
                      <li>CALD idioms of distress</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <p className="font-semibold text-foreground mb-1">Clinical governance</p>
                <p className="text-muted-foreground">
                  All AI-generated content follows the principle "AI suggests, clinician decides."
                  Clinicians retain editorial control with full audit trails. FHIR R4 data
                  architecture supports interoperability. No PII is stored. No medication dosages
                  are prescribed.
                </p>
              </div>

              <div>
                <p className="font-semibold text-foreground mb-1">Standards &amp; compliance</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {["FHIR R4 (AU Base)", "ICD-10", "ICD-11", "DSM-5", "MBS Better Access", "Privacy Act 1988 (APPs)", "TGA Class I CDSS", "LOINC"].map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs font-normal">{tag}</Badge>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground italic">
                  <strong>Important:</strong> Aperta Health is a Clinical Decision Support System (TGA Class I).
                  Outputs assist documentation and clinical reasoning but do not replace professional
                  judgement. All AI-generated content requires registered-practitioner review before
                  clinical action.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  © {new Date().getFullYear()} Aperta Health · Opening the space between clinical
                  precision and cultural understanding.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Contact the developer: <a href="mailto:wmchikwanha@gmail.com" className="underline hover:text-foreground">Walter Chikwanha — wmchikwanha@gmail.com</a>
                </p>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
