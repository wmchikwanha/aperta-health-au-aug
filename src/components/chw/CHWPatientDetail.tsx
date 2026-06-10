import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Plus, ArrowUpRight, CheckCircle2, AlertTriangle, Play } from "lucide-react";
import type { CHWSession } from "@/pages/CHWWorkspace";
import type { CHWPatientGroup } from "./CHWPatientList";

interface Props {
  patient: CHWPatientGroup;
  globalAtCap: boolean;
  onBack: () => void;
  onNewSession: () => void;
  onResume: (s: CHWSession) => void;
  onRefer: (s: CHWSession) => void;
  onComplete: (s: CHWSession) => void;
}

const severityVariant = (sev: string | null): "default" | "destructive" | "secondary" => {
  if (!sev) return "secondary";
  if (sev.toLowerCase().includes("severe")) return "destructive";
  if (sev.toLowerCase().includes("moderate")) return "default";
  return "secondary";
};

export const CHWPatientDetail = ({
  patient, globalAtCap, onBack, onNewSession, onResume, onRefer, onComplete,
}: Props) => {
  const hasActive = !!patient.activeSession;
  const canStartNew = !hasActive && !globalAtCap;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> All patients
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{patient.pseudonym}</CardTitle>
              <CardDescription>
                {patient.ageBand ? `${patient.ageBand} · ` : ""}{patient.language.toUpperCase()} · {patient.sessions.length} session{patient.sessions.length === 1 ? "" : "s"}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              {patient.latestPhq9 != null && (
                <Badge variant={severityVariant(patient.latestSeverity)}>
                  Latest PHQ-9: {patient.latestPhq9}
                </Badge>
              )}
              {patient.hasFlag && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> Self-harm flag in history
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onNewSession} disabled={!canStartNew}>
              <Plus className="h-4 w-4 mr-1" /> New Session for this patient
            </Button>
            {hasActive && patient.activeSession && (
              <Button variant="outline" onClick={() => onResume(patient.activeSession!)}>
                <Play className="h-4 w-4 mr-1" /> Resume active session
              </Button>
            )}
          </div>
          {hasActive && (
            <p className="text-xs text-muted-foreground mt-2">
              This patient has an active session in progress. Complete or refer it before opening a new one.
            </p>
          )}
          {!hasActive && globalAtCap && (
            <Alert variant="destructive" className="mt-3 py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                You're at the 5 active session cap. Complete or refer an existing session before starting a new one.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Session history</h3>
        {patient.sessions.map(s => {
          const mustRefer = s.phq9_item9_flag || (s.phq9_score != null && s.phq9_score >= 15);
          return (
            <Card key={s.id} className={mustRefer && s.status === "active" ? "border-destructive/60" : ""}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {new Date(s.created_at).toLocaleDateString()} {new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {s.status === "active" && <Badge variant="default">Active</Badge>}
                      {s.status === "completed" && (
                        <Badge variant="outline" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Completed</Badge>
                      )}
                      {s.status === "referred" && (
                        <Badge variant="default" className="gap-1"><ArrowUpRight className="h-3 w-3" /> Referred</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {s.phq9_score != null && (
                        <Badge variant={severityVariant(s.phq9_severity)}>
                          PHQ-9: {s.phq9_score}{s.phq9_severity ? ` · ${s.phq9_severity}` : ""}
                        </Badge>
                      )}
                      {s.phq9_item9_flag && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" /> Self-harm
                        </Badge>
                      )}
                    </div>
                  </div>
                  {s.status === "active" && (
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => onResume(s)}>Resume</Button>
                      <Button size="sm" variant={mustRefer ? "destructive" : "default"} onClick={() => onRefer(s)}>
                        <ArrowUpRight className="h-4 w-4 mr-1" /> Refer
                      </Button>
                      {!mustRefer && (
                        <Button size="sm" variant="ghost" onClick={() => onComplete(s)}>Complete</Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
