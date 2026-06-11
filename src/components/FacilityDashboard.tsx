import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Clock, CheckCircle2, AlertTriangle, Calendar, Phone, Loader2, RefreshCw, Eye, Search, Send, KeyRound, Mail,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface FacilityDashboardProps {
  facilityId: string;
  facilityData: any;
}

interface Referral {
  id: string;
  session_id: string;
  status: string;
  matched_at: string;
  accepted_at: string | null;
  sla_deadline: string | null;
  notes: string | null;
  session?: {
    demographics: any;
    location_region: string | null;
    risk_level: string | null;
    language_code: string;
    created_at: string;
    narrative_text: string | null;
    referral_code: string | null;
    contact_name: string | null;
    contact_phone: string | null;
    contact_email: string | null;
  };
  screening?: {
    tool_type: string;
    total_score: number;
    severity_level: string | null;
    interpretation: string | null;
  }[];
}

interface Message {
  id: string;
  sender: "facility" | "self_assessor";
  body: string;
  created_at: string;
  read_at: string | null;
}

export function FacilityDashboard({ facilityId, facilityData }: FacilityDashboardProps) {
  const { toast } = useToast();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [codeQuery, setCodeQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("facility_referrals")
        .select("*")
        .eq("facility_id", facilityId)
        .order("matched_at", { ascending: false });

      if (error) throw error;

      // Fetch session data for each referral
      const enriched = await Promise.all(
        (data || []).map(async (ref) => {
          const { data: session } = await supabase
            .from("self_assessment_sessions")
            .select("demographics, location_region, risk_level, language_code, created_at, narrative_text, referral_code, contact_name, contact_phone, contact_email")
            .eq("id", ref.session_id)
            .single();

          const { data: screening } = await supabase
            .from("self_assessment_responses")
            .select("tool_type, total_score, severity_level, interpretation")
            .eq("session_id", ref.session_id);

          return { ...ref, session, screening } as unknown as Referral;
        })
      );

      setReferrals(enriched);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error loading referrals", description: e.message });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReferrals();
  }, [facilityId]);

  const updateReferralStatus = async (referralId: string, newStatus: string) => {
    setActionLoading(referralId);
    try {
      const update: any = { status: newStatus };
      if (newStatus === "accepted") {
        update.accepted_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("facility_referrals")
        .update(update)
        .eq("id", referralId);

      if (error) throw error;

      toast({ title: "Referral updated", description: `Status changed to ${newStatus}` });
      fetchReferrals();
      setSelectedReferral(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update failed", description: e.message });
    }
    setActionLoading(null);
  };

  // Look up referral by NZW-XXXX-XXXX referral code (from a person calling/walking in)
  const lookupByCode = useCallback(() => {
    const q = codeQuery.trim().toUpperCase();
    if (!q) return;
    const match = referrals.find(r => (r.session?.referral_code || "").toUpperCase() === q);
    if (match) {
      setSelectedReferral(match);
    } else {
      toast({
        variant: "destructive",
        title: "No match",
        description: "No referral with that ID is matched to your facility yet.",
      });
    }
  }, [codeQuery, referrals, toast]);

  // Load messages thread for the selected referral
  useEffect(() => {
    if (!selectedReferral) { setMessages([]); return; }
    let cancelled = false;
    setMessagesLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("referral_messages")
        .select("id, sender, body, created_at, read_at")
        .eq("session_id", selectedReferral.session_id)
        .eq("facility_id", facilityId)
        .order("created_at", { ascending: true });
      if (!cancelled) {
        if (!error) setMessages((data || []) as Message[]);
        setMessagesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedReferral, facilityId]);

  const sendFacilityMessage = useCallback(async () => {
    if (!selectedReferral || !newMessage.trim()) return;
    setSendingMessage(true);
    try {
      const { error } = await supabase.from("referral_messages").insert({
        session_id: selectedReferral.session_id,
        facility_id: facilityId,
        sender: "facility",
        body: newMessage.trim(),
      });
      if (error) throw error;
      setNewMessage("");
      const { data } = await supabase
        .from("referral_messages")
        .select("id, sender, body, created_at, read_at")
        .eq("session_id", selectedReferral.session_id)
        .eq("facility_id", facilityId)
        .order("created_at", { ascending: true });
      setMessages((data || []) as Message[]);
      toast({ title: "Message sent" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Send failed", description: e.message });
    } finally {
      setSendingMessage(false);
    }
  }, [selectedReferral, newMessage, facilityId, toast]);

  const pendingReferrals = referrals.filter(r => r.status === "pending" || r.status === "urgent");
  const acceptedReferrals = referrals.filter(r => r.status === "accepted" || r.status === "in_contact" || r.status === "scheduled");
  const closedReferrals = referrals.filter(r => r.status === "declined" || r.status === "completed");

  const riskBadge = (level: string | null) => {
    if (!level) return null;
    const variants: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
      CRISIS: "destructive",
      HIGH: "destructive",
      MODERATE: "default",
      LOW: "secondary",
    };
    return <Badge variant={variants[level] || "outline"}>{level}</Badge>;
  };

  const statusBadge = (status: string) => {
    const config: Record<string, { variant: "destructive" | "default" | "secondary" | "outline"; icon: any }> = {
      urgent: { variant: "destructive", icon: AlertTriangle },
      pending: { variant: "default", icon: Clock },
    accepted: { variant: "secondary", icon: CheckCircle2 },
      in_contact: { variant: "secondary", icon: Phone },
      scheduled: { variant: "secondary", icon: Calendar },
      declined: { variant: "outline", icon: null },
      completed: { variant: "outline", icon: CheckCircle2 },
    };
    const c = config[status] || { variant: "outline" as const, icon: null };
    return (
      <Badge variant={c.variant} className="text-xs">
        {c.icon && <c.icon className="w-3 h-3 mr-1" />}
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Facility info header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{facilityData?.facility_name}</h2>
          <p className="text-muted-foreground text-sm">
            {facilityData?.city}, {facilityData?.region} · {facilityData?.subscription_tier} plan
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchReferrals} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Pilot onboarding entry */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" /> Pilot onboarding
            </div>
            <p className="text-xs text-muted-foreground">
              Provision clinician seats, configure referral channels, run test cases, and submit for go-live sign-off.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.location.assign("/fhir-sandbox")}>FHIR sandbox</Button>
            <Button size="sm" onClick={() => window.location.assign("/facility/onboarding")}>Open onboarding</Button>
          </div>
        </CardContent>
      </Card>


      {/* Look up by Referral ID */}
      <Card className="border-primary/20">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="flex items-center gap-2 text-sm font-medium flex-shrink-0">
              <KeyRound className="w-4 h-4 text-primary" />
              Look up by Referral ID
            </div>
            <Input
              placeholder="NZW-XXXX-XXXX"
              value={codeQuery}
              onChange={(e) => setCodeQuery(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && lookupByCode()}
              className="font-mono tracking-wider flex-1"
            />
            <Button onClick={lookupByCode} size="sm">
              <Search className="w-4 h-4 mr-1" /> Find
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            When a person calls or walks in and quotes their Referral ID, paste it here to open their referral.
          </p>
        </CardContent>
      </Card>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Users className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{referrals.length}</p>
            <p className="text-xs text-muted-foreground">Total Referrals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Clock className="w-6 h-6 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{pendingReferrals.length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{acceptedReferrals.length}</p>
            <p className="text-xs text-muted-foreground">Accepted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <AlertTriangle className="w-6 h-6 text-destructive mx-auto mb-1" />
            <p className="text-2xl font-bold">{referrals.filter(r => r.session?.risk_level === "CRISIS" || r.session?.risk_level === "HIGH").length}</p>
            <p className="text-xs text-muted-foreground">High Risk</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral tabs */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending {pendingReferrals.length > 0 && <Badge variant="destructive" className="ml-1 text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full">{pendingReferrals.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="accepted">Accepted ({acceptedReferrals.length})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({closedReferrals.length})</TabsTrigger>
        </TabsList>

        {["pending", "accepted", "closed"].map(tab => {
          const list = tab === "pending" ? pendingReferrals : tab === "accepted" ? acceptedReferrals : closedReferrals;
          return (
            <TabsContent key={tab} value={tab}>
              {loading ? (
                <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" /></div>
              ) : list.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No {tab} referrals
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {list.map(ref => (
                    <Card key={ref.id} className={ref.session?.risk_level === "CRISIS" ? "border-destructive/40" : ""}>
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {statusBadge(ref.status)}
                              {riskBadge(ref.session?.risk_level || null)}
                              {ref.screening?.map((s, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {s.tool_type}: {s.total_score} ({s.severity_level})
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(ref.matched_at).toLocaleDateString()}
                              </span>
                              {ref.session?.demographics?.age_band && (
                                <span>{ref.session.demographics.age_band}, {ref.session.demographics.gender}</span>
                              )}
                              <span>{ref.session?.language_code?.toUpperCase()}</span>
                            </div>
                            {ref.session?.narrative_text && (
                              <p className="text-sm text-muted-foreground truncate max-w-xl">
                                {ref.session.narrative_text.slice(0, 120)}…
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedReferral(ref)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            {(ref.status === "pending" || ref.status === "urgent") && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updateReferralStatus(ref.id, "accepted")}
                                  disabled={actionLoading === ref.id}
                                >
                                  {actionLoading === ref.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Accept"}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateReferralStatus(ref.id, "declined")}
                                  disabled={actionLoading === ref.id}
                                >
                                  Decline
                                </Button>
                              </>
                            )}
                            {ref.status === "accepted" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateReferralStatus(ref.id, "completed")}
                                disabled={actionLoading === ref.id}
                              >
                                Mark Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Detail dialog */}
      <Dialog open={!!selectedReferral} onOpenChange={() => setSelectedReferral(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Referral Details
              {selectedReferral && riskBadge(selectedReferral.session?.risk_level || null)}
            </DialogTitle>
            <DialogDescription>
              Referred on {selectedReferral && new Date(selectedReferral.matched_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          {selectedReferral && (
            <div className="space-y-4">
              {/* Referral ID — surface to receptionist */}
              {selectedReferral.session?.referral_code && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs uppercase text-muted-foreground tracking-wider">Referral ID</p>
                  <p className="text-lg font-mono font-bold text-primary tracking-widest">{selectedReferral.session.referral_code}</p>
                </div>
              )}

              {/* Contact details (only if person opted in) */}
              {(selectedReferral.session?.contact_name || selectedReferral.session?.contact_phone || selectedReferral.session?.contact_email) && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Contact details (shared by patient)</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {selectedReferral.session.contact_name && <p>Name: {selectedReferral.session.contact_name}</p>}
                    {selectedReferral.session.contact_phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> <a href={`tel:${selectedReferral.session.contact_phone}`} className="text-primary hover:underline">{selectedReferral.session.contact_phone}</a></p>}
                    {selectedReferral.session.contact_email && <p className="flex items-center gap-1"><Mail className="w-3 h-3" /> <a href={`mailto:${selectedReferral.session.contact_email}`} className="text-primary hover:underline">{selectedReferral.session.contact_email}</a></p>}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold mb-1">Demographics</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Age: {selectedReferral.session?.demographics?.age_band || "Not provided"}</p>
                  <p>Gender: {selectedReferral.session?.demographics?.gender || "Not provided"}</p>
                  <p>Language: {selectedReferral.session?.language_code?.toUpperCase()}</p>
                  <p>Region: {selectedReferral.session?.location_region || "Not provided"}</p>
                </div>
              </div>

              {selectedReferral.screening && selectedReferral.screening.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Screening Results</h4>
                  {selectedReferral.screening.map((s, i) => (
                    <div key={i} className="text-sm p-2 rounded bg-muted">
                      <p className="font-medium">{s.tool_type}: {s.total_score}</p>
                      <p className="text-muted-foreground">{s.interpretation}</p>
                      {s.severity_level && <Badge variant="outline" className="mt-1 text-xs">{s.severity_level}</Badge>}
                    </div>
                  ))}
                </div>
              )}

              {selectedReferral.session?.narrative_text && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Patient Narrative</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded max-h-48 overflow-y-auto">
                    {selectedReferral.session.narrative_text}
                  </p>
                </div>
              )}

              {selectedReferral.sla_deadline && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">SLA Deadline</h4>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedReferral.sla_deadline).toLocaleString()}
                    {new Date(selectedReferral.sla_deadline) < new Date() && (
                      <Badge variant="destructive" className="ml-2 text-xs">Overdue</Badge>
                    )}
                  </p>
                </div>
              )}

              {/* Messages thread */}
              <div>
                <h4 className="text-sm font-semibold mb-1 flex items-center gap-1">Messages</h4>
                <div className="max-h-60 overflow-y-auto space-y-2 border rounded p-2 bg-muted/30 mb-2">
                  {messagesLoading ? (
                    <p className="text-xs text-muted-foreground text-center py-3">Loading…</p>
                  ) : messages.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">No messages yet. The patient sees messages when they sign into the follow-up page with their Referral ID + PIN.</p>
                  ) : messages.map(m => (
                    <div key={m.id} className={`flex ${m.sender === "facility" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded px-3 py-2 text-sm ${m.sender === "facility" ? "bg-primary text-primary-foreground" : "bg-card border"}`}>
                        <p className="whitespace-pre-wrap">{m.body}</p>
                        <p className="text-[10px] opacity-70 mt-1">{m.sender === "facility" ? "You" : "Patient"} · {new Date(m.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Textarea placeholder="Send a message to the patient…" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} rows={2} maxLength={4000} />
                <Button size="sm" className="mt-2 w-full" onClick={sendFacilityMessage} disabled={sendingMessage || !newMessage.trim()}>
                  {sendingMessage ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                  Send
                </Button>
              </div>

              {(selectedReferral.status === "pending" || selectedReferral.status === "urgent") && (
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    onClick={() => updateReferralStatus(selectedReferral.id, "accepted")}
                    disabled={actionLoading === selectedReferral.id}
                  >
                    {actionLoading === selectedReferral.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                    Accept Referral
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => updateReferralStatus(selectedReferral.id, "declined")}
                    disabled={actionLoading === selectedReferral.id}
                  >
                    Decline
                  </Button>
                </div>
              )}

              {selectedReferral.status === "accepted" && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => updateReferralStatus(selectedReferral.id, "in_contact")} disabled={actionLoading === selectedReferral.id}>Mark In Contact</Button>
                  <Button size="sm" variant="outline" onClick={() => updateReferralStatus(selectedReferral.id, "scheduled")} disabled={actionLoading === selectedReferral.id}>Mark Scheduled</Button>
                  <Button size="sm" variant="outline" className="col-span-2" onClick={() => updateReferralStatus(selectedReferral.id, "completed")} disabled={actionLoading === selectedReferral.id}>Mark Completed</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
