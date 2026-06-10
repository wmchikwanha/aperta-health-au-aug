/**
 * Stanley-Brown Safety Planning Intervention — Australian adaptation.
 *
 * Six-step safety plan completed collaboratively with a patient at elevated
 * suicide risk. The plan is patient-facing and printable. It is NOT a
 * substitute for clinical risk assessment.
 *
 * Australian crisis numbers are pre-populated in Step 6; clinicians can edit
 * before printing/exporting.
 *
 * Reference: Stanley B, Brown GK. Safety Planning Intervention: A Brief
 * Intervention to Mitigate Suicide Risk. Cogn Behav Pract. 2012;19(2):256-264.
 * Endorsed by NHMRC, Black Dog Institute, and the Phoenix Australia suicide
 * prevention guidelines.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Printer } from "lucide-react";

export interface SafetyPlanData {
  warningSigns: string;
  internalCoping: string;
  socialDistraction: string;
  socialSupport: string;
  professionals: string;
  meansSafety: string;
  crisisNumbers: string;
  clinicianName?: string;
  reviewDate?: string;
}

const DEFAULT_CRISIS_NUMBERS = `000 — Life-threatening emergency
Lifeline — 13 11 14 (24/7)
Suicide Call Back Service — 1300 659 467 (24/7)
13YARN — 13 92 76 (24/7, Aboriginal & Torres Strait Islander)
1800RESPECT — 1800 737 732 (24/7, family & sexual violence)
beyondblue — 1300 22 4636
Kids Helpline — 1800 55 1800 (5–25 yrs)
Local public-hospital Mental Health Triage line`;

export interface SafetyPlanProps {
  patientLabel?: string;
  initial?: Partial<SafetyPlanData>;
  onSave?: (plan: SafetyPlanData) => void;
}

export function SafetyPlan({ patientLabel, initial, onSave }: SafetyPlanProps) {
  const [plan, setPlan] = useState<SafetyPlanData>({
    warningSigns:     initial?.warningSigns     ?? "",
    internalCoping:   initial?.internalCoping   ?? "",
    socialDistraction:initial?.socialDistraction?? "",
    socialSupport:    initial?.socialSupport    ?? "",
    professionals:    initial?.professionals    ?? "",
    meansSafety:      initial?.meansSafety      ?? "",
    crisisNumbers:    initial?.crisisNumbers    ?? DEFAULT_CRISIS_NUMBERS,
    clinicianName:    initial?.clinicianName,
    reviewDate:       initial?.reviewDate,
  });

  const set = <K extends keyof SafetyPlanData>(k: K, v: SafetyPlanData[K]) =>
    setPlan(prev => ({ ...prev, [k]: v }));

  const steps: Array<{ key: keyof SafetyPlanData; label: string; help: string; rows?: number }> = [
    { key: "warningSigns",      label: "1. Warning signs",                        help: "Thoughts, feelings, situations, or behaviours that signal a crisis is developing." },
    { key: "internalCoping",    label: "2. Internal coping strategies",           help: "Things the patient can do alone to take their mind off the crisis (e.g. walk, prayer, breathing, music)." },
    { key: "socialDistraction", label: "3. People and places for distraction",    help: "Safe people and settings (without discussing the crisis) that help — friends, community, café, library." },
    { key: "socialSupport",     label: "4. People to ask for help",               help: "Trusted people the patient can contact about the crisis. Include bicultural worker or community elder if appropriate." },
    { key: "professionals",     label: "5. Professionals and agencies",           help: "GP, MHTP psychologist/social worker, refugee mental-health service (STARTTS/Foundation House/etc.), case manager." },
    { key: "meansSafety",       label: "6. Means-safety plan",                    help: "Steps to reduce access to lethal means — secure or remove medications/firearms; nominate who holds them; safe disposal." , rows: 2 },
    { key: "crisisNumbers",     label: "Crisis numbers (Australia)",              help: "Pre-populated; edit if local service phone is preferred.", rows: 7 },
  ];

  const handlePrint = () => {
    onSave?.(plan);
    window.print();
  };

  return (
    <Card className="print:shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
          Safety Plan (Stanley-Brown)
        </CardTitle>
        <CardDescription>
          {patientLabel ? `Patient: ${patientLabel}` : "Collaborative six-step plan"} ·
          Complete with the patient. Not a substitute for clinical risk assessment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map(({ key, label, help, rows }) => (
          <div key={key} className="space-y-1">
            <Label htmlFor={`sp-${key}`} className="font-medium">{label}</Label>
            <p className="text-xs text-muted-foreground">{help}</p>
            <Textarea
              id={`sp-${key}`}
              rows={rows ?? 3}
              value={String(plan[key] ?? "")}
              onChange={e => set(key, e.target.value as never)}
            />
          </div>
        ))}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="space-y-1">
            <Label htmlFor="sp-clin">Clinician</Label>
            <Textarea id="sp-clin" rows={1}
              value={plan.clinicianName ?? ""}
              onChange={e => set("clinicianName", e.target.value)}
              placeholder="Name, role" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sp-review">Review date (DD/MM/YYYY)</Label>
            <Textarea id="sp-review" rows={1}
              value={plan.reviewDate ?? ""}
              onChange={e => set("reviewDate", e.target.value)}
              placeholder="DD/MM/YYYY" />
          </div>
        </div>

        <div className="flex justify-end gap-2 print:hidden">
          <Button variant="outline" onClick={() => onSave?.(plan)}>Save</Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" aria-hidden />
            Save &amp; Print
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default SafetyPlan;
