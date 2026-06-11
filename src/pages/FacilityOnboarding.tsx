import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Copy, FileJson, Loader2, Rocket, Sparkles } from "lucide-react";
import { SeatProvisioning } from "@/components/facility/SeatProvisioning";
import { OnboardingChecklist, ChecklistItemDef } from "@/components/facility/OnboardingChecklist";
import { SAMPLE_NARRATIVES } from "@/lib/fhir/sampleNarratives";

const AU_REGIONS = [
  "NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT",
];

const CHECKLIST: ChecklistItemDef[] = [
  { id: "profile", label: "Facility profile verified", description: "Name, region, service type, MBS provider number confirmed." },
  { id: "psychiatrist", label: "≥1 psychiatrist / clinical psychologist seat provisioned" },
  { id: "bicultural", label: "≥1 bicultural worker seat provisioned" },
  { id: "intake", label: "Intake URL tested end-to-end", description: "Self-assess link generates a referral that reaches your dashboard." },
  { id: "fhir", label: "FHIR sandbox bundle downloaded and validated", description: "Bundle ingested into staging EHR with read-back confirmed." },
  { id: "crisis", label: "Crisis escalation pathway acknowledged", description: "Clinical team has read the crisis intervention protocol and escalation triggers." },
  { id: "privacy", label: "Data residency & privacy notice reviewed" },
  { id: "signoff", label: "Go-live sign-off submitted to Aperta" },
];

const FacilityOnboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [facility, setFacility] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seatCounts, setSeatCounts] = useState<Record<string, number>>({});
  const [progress, setProgress] = useState(0);
  const [channels, setChannels] = useState({ selfAssess: true, chwUpward: true, partnerApi: false });

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: fu } = await supabase
        .from("facility_users")
        .select("facility_id, facilities(*)")
        .eq("user_id", user.id)
        .maybeSingle();
      if (fu?.facilities) setFacility(fu.facilities);
      setLoading(false);
    })();
  }, [user]);

  const saveProfile = async (patch: Partial<any>) => {
    if (!facility) return;
    setSaving(true);
    const { error } = await supabase.from("facilities").update(patch).eq("id", facility.id);
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    setFacility({ ...facility, ...patch });
    toast({ title: "Facility profile saved" });
  };

  const intakeUrl = facility
    ? `${window.location.origin}/self-assess?facility=${facility.id}`
    : "";

  const seedDemoPatients = async () => {
    if (!facility || !user) return;
    setSeeding(true);
    const rows = SAMPLE_NARRATIVES.slice(0, 3).map((n, idx) => ({
      user_id: user.id,
      patient_identifier: `DEMO-${facility.id.slice(0, 6)}-${String(idx + 1).padStart(2, "0")}`,
      language_preference: n.language,
      cultural_background: n.countryOfBirthDisplay,
      metadata: {
        is_demo: true,
        sample_narrative_id: n.id,
        facility_id: facility.id,
        seeded_at: new Date().toISOString(),
      },
    }));
    const { error } = await supabase.from("patients").insert(rows);
    setSeeding(false);
    if (error) { toast({ title: "Seeding failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "3 demo patients seeded", description: "Tagged is_demo=true in metadata." });
  };

  const submitForReview = async () => {
    if (!facility || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from("audit_events").insert({
      actor_id: user.id,
      actor_role: "admin",
      action: "execute",
      resource_type: "Session",
      resource_id: facility.id,
      description: "Facility pilot onboarding sign-off submitted",
      source: "facility_onboarding",
      metadata: {
        facility_id: facility.id,
        facility_name: facility.facility_name,
        seat_counts: seatCounts,
        progress_pct: progress,
        channels,
      },
    });
    setSubmitting(false);
    if (error) { toast({ title: "Submit failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Submitted for Aperta review", description: "Our team will contact you within 2 business days." });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!facility) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader><CardTitle>No facility linked</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Your account is not linked to a facility. Register your facility first.</p>
            <Button onClick={() => navigate("/facility")}>Go to Facility Portal</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/facility")}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" /> Pilot Onboarding
              </h1>
              <p className="text-xs text-muted-foreground">{facility.facility_name} · {facility.region}</p>
            </div>
          </div>
          <Badge variant={progress === 100 ? "default" : "secondary"}>{progress}% complete</Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <Tabs defaultValue="profile">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">1. Profile</TabsTrigger>
            <TabsTrigger value="seats">2. Seats</TabsTrigger>
            <TabsTrigger value="referrals">3. Referrals</TabsTrigger>
            <TabsTrigger value="test">4. Test cases</TabsTrigger>
            <TabsTrigger value="signoff">5. Sign-off</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Facility profile</CardTitle>
                <CardDescription>Confirm details that flow into FHIR exports and referral routing.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Facility name</Label>
                  <Input
                    defaultValue={facility.facility_name}
                    onBlur={(e) => e.target.value !== facility.facility_name && saveProfile({ facility_name: e.target.value })}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label>State / Territory</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      defaultValue={facility.region}
                      onChange={(e) => saveProfile({ region: e.target.value })}
                    >
                      {AU_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>City / Suburb</Label>
                    <Input
                      defaultValue={facility.city || ""}
                      onBlur={(e) => saveProfile({ city: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Contact email</Label>
                  <Input
                    type="email"
                    defaultValue={facility.contact_email || ""}
                    onBlur={(e) => saveProfile({ contact_email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Contact phone</Label>
                  <Input
                    defaultValue={facility.contact_phone || ""}
                    onBlur={(e) => saveProfile({ contact_phone: e.target.value })}
                  />
                </div>
                {saving && <p className="text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin inline" /> Saving…</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seats">
            <Card>
              <CardHeader>
                <CardTitle>Clinician seat provisioning</CardTitle>
                <CardDescription>Invite clinicians by email. They receive a tokenised acceptance link valid for 7 days.</CardDescription>
              </CardHeader>
              <CardContent>
                <SeatProvisioning onCountChange={setSeatCounts} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals">
            <Card>
              <CardHeader>
                <CardTitle>Referral onboarding</CardTitle>
                <CardDescription>Enable inbound channels and share intake URLs with partner services.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ChannelToggle
                  label="Self-assessment portal"
                  description="Public intake page routes triaged patients to your facility."
                  checked={channels.selfAssess}
                  onChange={(v) => setChannels({ ...channels, selfAssess: v })}
                />
                <ChannelToggle
                  label="Bicultural Worker upward referrals"
                  description="CHWs can refer clients upward to your clinicians."
                  checked={channels.chwUpward}
                  onChange={(v) => setChannels({ ...channels, chwUpward: v })}
                />
                <ChannelToggle
                  label="Partner API (FHIR ingest)"
                  description="Accept FHIR R4 bundles from connected partner systems. Coming soon — contact Aperta to enable."
                  checked={channels.partnerApi}
                  onChange={(v) => setChannels({ ...channels, partnerApi: v })}
                  disabled
                />
                <div className="pt-2 border-t">
                  <Label className="text-xs">Facility-scoped intake URL</Label>
                  <div className="flex gap-2 mt-1">
                    <Input readOnly value={intakeUrl} className="font-mono text-xs" />
                    <Button variant="outline" onClick={() => { navigator.clipboard.writeText(intakeUrl); toast({ title: "Copied" }); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Share with referring GPs, settlement services, and torture/trauma agencies.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="test">
            <Card>
              <CardHeader>
                <CardTitle>Test cases</CardTitle>
                <CardDescription>Seed demo patients and generate FHIR bundles to dry-run the workflow.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Seed 3 demo patients</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Creates 3 pseudonymous patient records tagged <code className="text-[10px] bg-muted px-1 rounded">is_demo=true</code>,
                        each linked to a sample CALD narrative. Safe to delete after testing.
                      </p>
                    </div>
                    <Button onClick={seedDemoPatients} disabled={seeding}>
                      {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Seed
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium flex items-center gap-2"><FileJson className="h-4 w-4 text-primary" /> FHIR R4 export sandbox</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Generate Patient / Encounter / Observation / Condition / Composition bundles from sample narratives.
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => navigate("/fhir-sandbox")}>Open sandbox</Button>
                  </div>
                </div>

                <Alert>
                  <AlertTitle>Recommended acceptance tests</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5 text-sm space-y-1 mt-1">
                      <li>Trigger the intake URL from an incognito window and confirm the referral lands in your dashboard.</li>
                      <li>Open a seeded demo patient and complete one PHQ-9 / GAD-7 cycle.</li>
                      <li>Download a FHIR bundle and validate it against your receiving system (HAPI validator R4).</li>
                      <li>Acknowledge a crisis flag end-to-end (PHQ-9 item 9 ≥ 1 trigger).</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signoff">
            <Card>
              <CardHeader>
                <CardTitle>Acceptance checklist & sign-off</CardTitle>
                <CardDescription>Complete every item, then submit for Aperta review. Progress is saved on this device.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <OnboardingChecklist facilityId={facility.id} items={CHECKLIST} onProgress={(p) => setProgress(p)} />
                <Button onClick={submitForReview} disabled={progress < 100 || submitting} className="w-full">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                  {progress < 100 ? `Complete all items to submit (${progress}%)` : "Submit for Aperta review"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Submission is recorded in the immutable audit log and triggers a 2-business-day review by the Aperta team.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const ChannelToggle = ({ label, description, checked, onChange, disabled }: any) => (
  <div className="flex items-start justify-between gap-3 rounded-md border p-3">
    <div className="text-sm">
      <div className="font-medium">{label}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
  </div>
);

export default FacilityOnboarding;
