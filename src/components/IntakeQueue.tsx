import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, ArrowUpRight, CheckCircle, Clock, Eye, Loader2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getLanguageName } from "@/lib/languages";

interface IntakeSession {
  id: string;
  token: string;
  patient_id: string | null;
  status: string;
  tier: string;
  language_code: string;
  demographics: any;
  risk_flags: any;
  narrative_text: string | null;
  completed_at: string | null;
  created_at: string;
}

interface IntakeResponse {
  id: string;
  tool_type: string;
  total_score: number;
  severity_level: string | null;
  interpretation: string | null;
  item_flags: any;
}

interface CHWReferral {
  id: string;
  patient_id: string;
  recorded_by: string;
  urgency: string;
  destination: string | null;
  reason: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  // joined
  patient_identifier?: string;
  chw_name?: string;
}

export function IntakeQueue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<IntakeSession[]>([]);
  const [referrals, setReferrals] = useState<CHWReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<IntakeSession | null>(null);
  const [selectedReferral, setSelectedReferral] = useState<CHWReferral | null>(null);
  const [responses, setResponses] = useState<IntakeResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch intake sessions and CHW referrals in parallel
    const [sessionsRes, referralsRes] = await Promise.all([
      supabase
        .from("patient_intake_sessions")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("referrals")
        .select("*")
        .eq("context", "chw_upward_referral")
        .order("created_at", { ascending: false }),
    ]);

    setSessions((sessionsRes.data as any[]) || []);

    // Enrich referrals with patient identifiers and CHW names
    const rawReferrals = (referralsRes.data as any[]) || [];
    if (rawReferrals.length > 0) {
      const patientIds = [...new Set(rawReferrals.map(r => r.patient_id))];
      const chwIds = [...new Set(rawReferrals.map(r => r.recorded_by))];

      const [patientsRes, profilesRes] = await Promise.all([
        supabase.from("patients").select("id, patient_identifier").in("id", patientIds),
        supabase.from("profiles").select("id, full_name").in("id", chwIds),
      ]);

      const patientMap = Object.fromEntries((patientsRes.data || []).map(p => [p.id, p.patient_identifier]));
      const profileMap = Object.fromEntries((profilesRes.data || []).map(p => [p.id, p.full_name]));

      setReferrals(rawReferrals.map(r => ({
        ...r,
        patient_identifier: patientMap[r.patient_id] || "Unknown",
        chw_name: profileMap[r.recorded_by] || "Unknown CHW",
      })));
    } else {
      setReferrals([]);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const viewDetails = async (session: IntakeSession) => {
    setSelectedSession(session);
    setLoadingResponses(true);
    const { data } = await supabase
      .from("patient_intake_responses")
      .select("*")
      .eq("session_id", session.id);
    setResponses((data as any[]) || []);
    setLoadingResponses(false);
  };

  const markReviewed = async (sessionId: string) => {
    const { error } = await supabase
      .from("patient_intake_sessions")
      .update({ status: "reviewed", reviewed_at: new Date().toISOString(), reviewed_by: user?.id } as any)
      .eq("id", sessionId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Marked as Reviewed" });
      setSelectedSession(null);
      fetchData();
    }
  };

  const markReferralReviewed = async (referralId: string) => {
    const { error } = await supabase
      .from("referrals")
      .update({ status: "reviewed" })
      .eq("id", referralId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Referral Reviewed" });
      setSelectedReferral(null);
      fetchData();
    }
  };

  const statusBadge = (status: string, riskFlags: any) => {
    const hasRisk = riskFlags?.immediate_review;
    if (hasRisk) return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Risk Flagged</Badge>;
    if (status === "completed") return <Badge className="bg-primary text-primary-foreground gap-1"><CheckCircle className="h-3 w-3" /> Ready for Review</Badge>;
    if (status === "reviewed") return <Badge variant="outline" className="gap-1"><CheckCircle className="h-3 w-3" /> Reviewed</Badge>;
    if (status === "in_progress") return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> In Progress</Badge>;
    if (status === "expired") return <Badge variant="outline" className="text-muted-foreground">Expired</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  const urgencyBadge = (urgency: string) => {
    if (urgency === "emergency") return <Badge variant="destructive">Emergency</Badge>;
    if (urgency === "urgent") return <Badge variant="secondary" className="border-primary text-primary">Urgent</Badge>;
    return <Badge variant="outline">Routine</Badge>;
  };

  const sortedSessions = [...sessions].sort((a, b) => {
    const aRisk = a.risk_flags?.immediate_review ? 1 : 0;
    const bRisk = b.risk_flags?.immediate_review ? 1 : 0;
    if (aRisk !== bRisk) return bRisk - aRisk;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const sortedReferrals = [...referrals].sort((a, b) => {
    const urgencyOrder: Record<string, number> = { emergency: 3, urgent: 2, routine: 1 };
    const aU = urgencyOrder[a.urgency] || 0;
    const bU = urgencyOrder[b.urgency] || 0;
    if (aU !== bU) return bU - aU;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const activeReferrals = sortedReferrals.filter(r => r.status === "active");
  const pendingIntake = sessions.filter(s => s.status === "completed").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Intake Queue</h3>
          <p className="text-sm text-muted-foreground">
            {pendingIntake} intake{pendingIntake !== 1 ? "s" : ""} pending
            {activeReferrals.length > 0 && ` • ${activeReferrals.length} Bicultural Worker referral${activeReferrals.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>Refresh</Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="intake" className="gap-1">
            Patient Intake
            {pendingIntake > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{pendingIntake}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="chw" className="gap-1">
            Bicultural Worker Referrals
            {activeReferrals.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{activeReferrals.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-2 mt-4">
          {sortedSessions.length === 0 && sortedReferrals.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {activeReferrals.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bicultural Worker Referrals</p>
                  {activeReferrals.map(r => <ReferralCard key={r.id} referral={r} urgencyBadge={urgencyBadge} onView={() => setSelectedReferral(r)} />)}
                </div>
              )}
              {sortedSessions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Patient Self-Intake</p>
                  {sortedSessions.map(s => <IntakeCard key={s.id} session={s} statusBadge={statusBadge} onView={() => viewDetails(s)} />)}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="intake" className="space-y-2 mt-4">
          {sortedSessions.length === 0 ? (
            <EmptyState />
          ) : (
            sortedSessions.map(s => <IntakeCard key={s.id} session={s} statusBadge={statusBadge} onView={() => viewDetails(s)} />)
          )}
        </TabsContent>

        <TabsContent value="chw" className="space-y-2 mt-4">
          {sortedReferrals.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <ArrowUpRight className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No Bicultural Worker referrals yet.</p>
              </CardContent>
            </Card>
          ) : (
            sortedReferrals.map(r => <ReferralCard key={r.id} referral={r} urgencyBadge={urgencyBadge} onView={() => setSelectedReferral(r)} />)
          )}
        </TabsContent>
      </Tabs>

      {/* Intake Detail Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Intake Details</DialogTitle>
            <DialogDescription>
              {selectedSession?.status === "completed" ? "Ready for clinician review" : `Status: ${selectedSession?.status}`}
            </DialogDescription>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4">
              {selectedSession.demographics && Object.keys(selectedSession.demographics).length > 0 && (
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">Demographics</h4>
                  <div className="text-sm text-muted-foreground grid grid-cols-2 gap-1">
                    <span>Age: {selectedSession.demographics.age_band || "—"}</span>
                    <span>Gender: {selectedSession.demographics.gender || "—"}</span>
                    <span className="col-span-2">Cultural: {selectedSession.demographics.cultural_background || "—"}</span>
                  </div>
                </div>
              )}

              {loadingResponses ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : responses.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Screening Results</h4>
                  {responses.map(r => (
                    <div key={r.id} className="p-3 rounded-lg border bg-muted/50">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{r.tool_type}</span>
                        <Badge variant={r.item_flags?.immediate_review ? "destructive" : "outline"}>Score: {r.total_score}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{r.severity_level} — {r.interpretation}</p>
                      {r.item_flags?.flag === "suicidal_ideation" && (
                        <p className="text-xs text-destructive mt-1 font-medium">⚠ Suicidal ideation flagged (Item 9: {r.item_flags.PHQ9_Q9})</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No screening responses recorded.</p>
              )}

              {selectedSession.narrative_text && (
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">Patient Narrative</h4>
                  <p className="text-sm text-muted-foreground p-3 rounded-lg border bg-muted/50 whitespace-pre-wrap">{selectedSession.narrative_text}</p>
                </div>
              )}

              {selectedSession.risk_flags?.immediate_review && (
                <div className="p-3 rounded-lg border border-destructive bg-destructive/10">
                  <p className="text-sm text-destructive font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> This patient requires priority review
                  </p>
                </div>
              )}

              {selectedSession.status === "completed" && (
                <Button onClick={() => markReviewed(selectedSession.id)} className="w-full">
                  <CheckCircle className="h-4 w-4 mr-2" /> Mark as Reviewed
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CHW Referral Detail Dialog */}
      <Dialog open={!!selectedReferral} onOpenChange={() => setSelectedReferral(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-primary" />
              Bicultural Worker Referral
            </DialogTitle>
            <DialogDescription>
              Upward referral from Bicultural Worker
            </DialogDescription>
          </DialogHeader>
          {selectedReferral && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Patient</p>
                  <p className="text-sm font-medium">{selectedReferral.patient_identifier}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Referring Bicultural Worker</p>
                  <p className="text-sm font-medium">{selectedReferral.chw_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Urgency</p>
                  {urgencyBadge(selectedReferral.urgency)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={selectedReferral.status === "active" ? "default" : "outline"}>{selectedReferral.status}</Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="text-sm">{formatDistanceToNow(new Date(selectedReferral.created_at), { addSuffix: true })}</p>
                </div>
              </div>

              {selectedReferral.notes && (
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">Notes & Transcript</h4>
                  <p className="text-sm text-muted-foreground p-3 rounded-lg border bg-muted/50 whitespace-pre-wrap">{selectedReferral.notes}</p>
                </div>
              )}

              {selectedReferral.reason && (
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">Reason</h4>
                  <p className="text-sm text-muted-foreground">{selectedReferral.reason}</p>
                </div>
              )}

              {selectedReferral.status === "active" && (
                <Button onClick={() => markReferralReviewed(selectedReferral.id)} className="w-full">
                  <CheckCircle className="h-4 w-4 mr-2" /> Mark as Reviewed
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground">
        <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No intake sessions or referrals yet.</p>
      </CardContent>
    </Card>
  );
}

function IntakeCard({ session, statusBadge, onView }: { session: IntakeSession; statusBadge: (s: string, r: any) => React.ReactNode; onView: () => void }) {
  return (
    <Card className={session.risk_flags?.immediate_review ? "border-destructive" : ""}>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {statusBadge(session.status, session.risk_flags)}
            <Badge variant="outline" className="text-xs">{session.tier}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Created {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
            {session.completed_at && ` • Completed ${formatDistanceToNow(new Date(session.completed_at), { addSuffix: true })}`}
          </p>
          {session.demographics?.age_band && (
            <p className="text-xs text-muted-foreground">
              {session.demographics.age_band} • {session.demographics.gender || "—"} • {session.demographics.cultural_background || "—"}
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onView}>
          <Eye className="h-4 w-4 mr-1" /> View
        </Button>
      </CardContent>
    </Card>
  );
}

function ReferralCard({ referral, urgencyBadge, onView }: { referral: CHWReferral; urgencyBadge: (u: string) => React.ReactNode; onView: () => void }) {
  return (
    <Card className={referral.urgency === "emergency" ? "border-destructive" : "border-primary/30"}>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <ArrowUpRight className="h-3 w-3" /> CHW Referral
            </Badge>
            {urgencyBadge(referral.urgency)}
            {referral.status === "reviewed" && <Badge variant="outline" className="gap-1"><CheckCircle className="h-3 w-3" /> Reviewed</Badge>}
          </div>
          <p className="text-sm font-medium">{referral.patient_identifier}</p>
          <p className="text-xs text-muted-foreground">
            From {referral.chw_name} • {formatDistanceToNow(new Date(referral.created_at), { addSuffix: true })}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onView}>
          <Eye className="h-4 w-4 mr-1" /> View
        </Button>
      </CardContent>
    </Card>
  );
}
