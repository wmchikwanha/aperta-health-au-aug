import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Heart, Users, LogOut, Loader2 } from "lucide-react";
import { CHWNewSession } from "@/components/chw/CHWNewSession";
import { CHWUpwardReferral } from "@/components/chw/CHWUpwardReferral";
import { CHWPatientList, groupSessionsByPatient, type CHWPatientGroup } from "@/components/chw/CHWPatientList";
import { CHWPatientDetail } from "@/components/chw/CHWPatientDetail";
import { Footer } from "@/components/Footer";

export interface CHWSession {
  id: string;
  patient_pseudonym: string;
  age_band: string | null;
  language_code: string;
  narrative_text: string | null;
  phq9_score: number | null;
  phq9_severity: string | null;
  phq9_item9_flag: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

const MAX_ACTIVE = 5;

type View =
  | { kind: "patients" }
  | { kind: "patient"; pseudonymKey: string }
  | { kind: "session"; pseudonymKey: string | null; existing: CHWSession | null; patientCtx: CHWPatientGroup | null }
  | { kind: "refer"; session: CHWSession; pseudonymKey: string };

const CHWWorkspace = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<CHWSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ kind: "patients" });

  const loadSessions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("chw_sessions")
      .select("*")
      .eq("chw_id", user.id)
      .order("updated_at", { ascending: false });
    if (error) {
      toast({ variant: "destructive", title: "Could not load sessions", description: error.message });
    } else {
      setSessions((data || []) as CHWSession[]);
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const patients = useMemo(() => groupSessionsByPatient(sessions), [sessions]);
  const activeCount = sessions.filter(s => s.status === "active").length;
  const atCap = activeCount >= MAX_ACTIVE;

  const findPatient = (key: string) =>
    patients.find(p => p.pseudonym.trim().toLowerCase() === key) ?? null;

  const goPatients = () => setView({ kind: "patients" });
  const goPatient = (p: CHWPatientGroup) =>
    setView({ kind: "patient", pseudonymKey: p.pseudonym.trim().toLowerCase() });

  const handleNewPatient = () => {
    if (atCap) {
      toast({ variant: "destructive", title: "Session limit reached", description: `You have ${MAX_ACTIVE} active sessions. Complete or refer one first.` });
      return;
    }
    setView({ kind: "session", pseudonymKey: null, existing: null, patientCtx: null });
  };

  const handleNewSessionForPatient = (p: CHWPatientGroup) => {
    if (p.activeSession) {
      toast({ title: "Active session exists", description: "Resume the active session for this patient instead." });
      return;
    }
    if (atCap) {
      toast({ variant: "destructive", title: "Session limit reached", description: `You have ${MAX_ACTIVE} active sessions. Complete or refer one first.` });
      return;
    }
    setView({ kind: "session", pseudonymKey: p.pseudonym.trim().toLowerCase(), existing: null, patientCtx: p });
  };

  const handleResume = (s: CHWSession, pKey: string) => {
    setView({ kind: "session", pseudonymKey: pKey, existing: s, patientCtx: findPatient(pKey) });
  };

  const handleRefer = (s: CHWSession, pKey: string) => {
    setView({ kind: "refer", session: s, pseudonymKey: pKey });
  };

  const handleComplete = async (s: CHWSession) => {
    const { error } = await supabase
      .from("chw_sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", s.id);
    if (error) {
      toast({ variant: "destructive", title: "Could not complete", description: error.message });
    } else {
      toast({ title: "Session completed" });
      loadSessions();
    }
  };

  const handleSessionSaved = () => {
    // After save, return to the patient detail if we have a key, else patients list
    const pKey = view.kind === "session" ? view.pseudonymKey : null;
    loadSessions().then(() => {
      if (pKey) setView({ kind: "patient", pseudonymKey: pKey });
      else setView({ kind: "patients" });
    });
  };

  // After loadSessions, if we're on a patient view but the patient no longer exists, fall back
  useEffect(() => {
    if (view.kind === "patient" && !findPatient(view.pseudonymKey)) {
      setView({ kind: "patients" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients]);

  const currentPatient = view.kind === "patient" ? findPatient(view.pseudonymKey) : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Bicultural Worker</h1>
              <p className="text-xs text-muted-foreground">First port of call · Listen, screen, refer</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 flex-1 max-w-4xl w-full">
        <div className="mb-4 flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Active sessions:</span>
          <Badge variant={atCap ? "destructive" : "secondary"}>
            {activeCount} / {MAX_ACTIVE}
          </Badge>
          <span className="text-muted-foreground ml-3">Patients:</span>
          <Badge variant="secondary">{patients.length}</Badge>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : view.kind === "patients" ? (
          <CHWPatientList
            patients={patients}
            onOpen={goPatient}
            onNewPatient={handleNewPatient}
            atCap={atCap}
          />
        ) : view.kind === "patient" && currentPatient ? (
          <CHWPatientDetail
            patient={currentPatient}
            globalAtCap={atCap}
            onBack={goPatients}
            onNewSession={() => handleNewSessionForPatient(currentPatient)}
            onResume={(s) => handleResume(s, view.pseudonymKey)}
            onRefer={(s) => handleRefer(s, view.pseudonymKey)}
            onComplete={handleComplete}
          />
        ) : view.kind === "session" ? (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={() => {
              if (view.pseudonymKey) setView({ kind: "patient", pseudonymKey: view.pseudonymKey });
              else goPatients();
            }}>
              ← Back
            </Button>
            <CHWNewSession
              existing={view.existing}
              patientContext={view.patientCtx ? {
                pseudonym: view.patientCtx.pseudonym,
                ageBand: view.patientCtx.ageBand,
                language: view.patientCtx.language,
              } : null}
              onSaved={handleSessionSaved}
              onReferUpward={(s) => setView({
                kind: "refer",
                session: s,
                pseudonymKey: s.patient_pseudonym.trim().toLowerCase(),
              })}
            />
          </div>
        ) : view.kind === "refer" ? (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={() => setView({ kind: "patient", pseudonymKey: view.pseudonymKey })}>
              ← Back
            </Button>
            <CHWUpwardReferral
              session={view.session}
              onDone={() => {
                loadSessions().then(() => setView({ kind: "patient", pseudonymKey: view.pseudonymKey }));
              }}
              onCancel={() => setView({ kind: "patient", pseudonymKey: view.pseudonymKey })}
            />
          </div>
        ) : (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Nothing to show.</CardContent></Card>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default CHWWorkspace;
