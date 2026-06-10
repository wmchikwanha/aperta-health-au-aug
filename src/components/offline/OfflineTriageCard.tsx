import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, ShieldAlert, ArrowUpRight, Clock } from "lucide-react";
import { ProvenanceBadge } from "./ProvenanceBadge";
import type { TriageRecommendation } from "@/lib/offline/triageRules";

interface Props {
  patientLabel: string;
  recommendation: TriageRecommendation;
}

const URGENCY_STYLES: Record<TriageRecommendation["urgency"], string> = {
  urgent: "bg-red-100 text-red-900 border-red-300",
  routine: "bg-amber-100 text-amber-900 border-amber-300",
  monitor: "bg-emerald-100 text-emerald-900 border-emerald-300",
};

const URGENCY_ICON: Record<TriageRecommendation["urgency"], typeof ArrowUpRight> = {
  urgent: ShieldAlert,
  routine: ArrowUpRight,
  monitor: Clock,
};

export function OfflineTriageCard({ patientLabel, recommendation }: Props) {
  const Icon = URGENCY_ICON[recommendation.urgency];

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=720,height=900");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Referral — ${patientLabel}</title>
      <style>
        body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 32px; color: #111; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        h2 { font-size: 14px; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: .05em; color: #555; }
        .urgency { display:inline-block; padding:4px 10px; border-radius:999px; font-weight:600; margin-top:8px;
          background:${recommendation.urgency === "urgent" ? "#fee2e2" : recommendation.urgency === "routine" ? "#fef3c7" : "#d1fae5"};
          color:${recommendation.urgency === "urgent" ? "#7f1d1d" : recommendation.urgency === "routine" ? "#78350f" : "#064e3b"}; }
        ul { padding-left: 18px; }
        .footer { margin-top: 32px; font-size: 11px; color: #777; border-top: 1px solid #ddd; padding-top: 12px; }
      </style></head><body>
      <h1>Aperta Health — Offline Referral Note</h1>
      <div>Patient ID: <strong>${patientLabel}</strong></div>
      <div>Generated: ${new Date().toLocaleString()}</div>
      <div class="urgency">${recommendation.urgency.toUpperCase()} — ${recommendation.pathway}</div>
      <h2>Recommended Action</h2>
      <p>${recommendation.action}</p>
      <h2>Reasoning</h2>
      <ul>${recommendation.reasoning.map((r) => `<li>${r}</li>`).join("")}</ul>
      ${recommendation.mhgapModules.length ? `<h2>mhGAP Modules</h2><ul>${recommendation.mhgapModules.map((m) => `<li>${m}</li>`).join("")}</ul>` : ""}
      <div class="footer">${recommendation.disclaimer}<br/>This page was generated offline by Aperta Health. AI-generated narrative summary will sync to the patient record when the device next reaches the internet.</div>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  };

  return (
    <Card className="border-l-4" style={{ borderLeftColor: recommendation.crisis ? "hsl(0 84% 60%)" : undefined }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className="h-4 w-4" />
            Offline Triage Recommendation
          </CardTitle>
          <div className="flex items-center gap-2">
            <ProvenanceBadge provenance="rule_based" />
            <Badge variant="outline" className={URGENCY_STYLES[recommendation.urgency]}>
              {recommendation.urgency.toUpperCase()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendation.crisis && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription className="font-medium">
              Crisis criteria triggered. Open the Mental Health First Aid module and follow the in-app checklist now.
            </AlertDescription>
          </Alert>
        )}

        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Pathway</p>
          <p className="text-sm font-medium">{recommendation.pathway}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Recommended action</p>
          <p className="text-sm">{recommendation.action}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Why</p>
          <ul className="text-sm list-disc list-inside space-y-0.5">
            {recommendation.reasoning.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>

        {recommendation.mhgapModules.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">mhGAP modules</p>
            <div className="flex flex-wrap gap-1">
              {recommendation.mhgapModules.map((m) => (
                <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>
              ))}
            </div>
          </div>
        )}

        <Alert>
          <AlertDescription className="text-xs">
            {recommendation.disclaimer} AI narrative summary will fill in automatically once the device reconnects.
          </AlertDescription>
        </Alert>

        <Button onClick={handlePrint} variant="outline" size="sm" className="w-full gap-2">
          <Printer className="h-4 w-4" /> Print referral note (works offline)
        </Button>
      </CardContent>
    </Card>
  );
}
