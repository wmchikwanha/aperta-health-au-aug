import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, ChevronRight, AlertTriangle, Plus } from "lucide-react";
import type { CHWSession } from "@/pages/CHWWorkspace";

export interface CHWPatientGroup {
  pseudonym: string;
  ageBand: string | null;
  language: string;
  sessions: CHWSession[];
  activeSession: CHWSession | null;
  lastContact: string;
  latestPhq9: number | null;
  latestSeverity: string | null;
  hasFlag: boolean;
}

export function groupSessionsByPatient(sessions: CHWSession[]): CHWPatientGroup[] {
  const map = new Map<string, CHWSession[]>();
  for (const s of sessions) {
    const key = s.patient_pseudonym.trim().toLowerCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  const groups: CHWPatientGroup[] = [];
  for (const list of map.values()) {
    const sorted = [...list].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    const latest = sorted[0];
    groups.push({
      pseudonym: latest.patient_pseudonym,
      ageBand: latest.age_band,
      language: latest.language_code,
      sessions: sorted,
      activeSession: sorted.find(s => s.status === "active") ?? null,
      lastContact: latest.updated_at,
      latestPhq9: latest.phq9_score,
      latestSeverity: latest.phq9_severity,
      hasFlag: sorted.some(s => s.phq9_item9_flag),
    });
  }
  return groups.sort((a, b) => b.lastContact.localeCompare(a.lastContact));
}

interface Props {
  patients: CHWPatientGroup[];
  onOpen: (p: CHWPatientGroup) => void;
  onNewPatient: () => void;
  atCap: boolean;
}

export const CHWPatientList = ({ patients, onOpen, onNewPatient, atCap }: Props) => {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={onNewPatient} disabled={atCap}>
          <Plus className="h-4 w-4 mr-1" /> New Patient
        </Button>
      </div>

      {patients.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No patients yet. Tap <strong>New Patient</strong> to begin.
          </CardContent>
        </Card>
      ) : (
        patients.map(p => (
          <Card
            key={p.pseudonym}
            className={`cursor-pointer hover:border-primary/50 transition-colors ${p.hasFlag ? "border-destructive/60" : ""}`}
            onClick={() => onOpen(p)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {p.pseudonym}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {p.ageBand ? `${p.ageBand} · ` : ""}{p.language.toUpperCase()} · {p.sessions.length} session{p.sessions.length === 1 ? "" : "s"} · last {new Date(p.lastContact).toLocaleDateString()}
                  </CardDescription>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {p.activeSession && <Badge variant="default">Active session</Badge>}
                {p.latestPhq9 != null && (
                  <Badge variant="secondary">PHQ-9: {p.latestPhq9}{p.latestSeverity ? ` · ${p.latestSeverity}` : ""}</Badge>
                )}
                {p.hasFlag && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" /> Self-harm flag
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};
