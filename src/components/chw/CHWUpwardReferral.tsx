import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowUpRight, AlertTriangle, UserCheck, Building2, Siren, Check, ChevronsUpDown, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CHWSession } from "@/pages/CHWWorkspace";

interface Props {
  session: CHWSession;
  onDone: () => void;
  onCancel: () => void;
}

interface ClinicianOpt { id: string; full_name: string; role: string; email: string | null; }
interface FacilityOpt {
  id: string; facility_name: string; region: string | null; emergency_capable: boolean;
  contact_email: string | null; contact_phone: string | null; city: string | null; province: string | null;
}

export const CHWUpwardReferral = ({ session, onDone, onCancel }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clinicians, setClinicians] = useState<ClinicianOpt[]>([]);
  const [facilities, setFacilities] = useState<FacilityOpt[]>([]);
  const [destValue, setDestValue] = useState(""); // "clinician:<uuid>" | "facility:<uuid>"
  const [urgencyState, setUrgencyState] = useState<"routine" | "urgent" | "emergency">("urgent");
  const [extraNotes, setExtraNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const mustEmergency = session.phq9_item9_flag;
  const mustRefer = mustEmergency || (session.phq9_score != null && session.phq9_score >= 15);

  useEffect(() => {
    if (mustEmergency) setUrgencyState("emergency");
    else if (mustRefer) setUrgencyState("urgent");
  }, [mustEmergency, mustRefer]);

  useEffect(() => {
    (async () => {
      const { data: clinData } = await supabase.rpc("list_referral_clinicians");
      let clinicianList: ClinicianOpt[] = [];
      if (clinData) {
        clinicianList = (clinData as any[])
          .map(c => ({
            id: c.id,
            full_name: c.full_name,
            role: c.role,
            email: c.email ?? null,
          }));
      }
      setClinicians(clinicianList);

      const { data: facs } = await supabase
        .from("facilities")
        .select("id, facility_name, region, emergency_capable, contact_email, contact_phone, city, province")
        .eq("is_active", true).eq("approval_status", "approved")
        .order("emergency_capable", { ascending: false })
        .order("facility_name");
      
      // Keep only Australian facilities
      const australianFacilities = (facs || []).filter((f: any) => {
        const name = f.facility_name.toLowerCase();
        const prov = (f.province || "").toLowerCase();
        const reg = (f.region || "").toLowerCase();
        return (
          name.includes("headspace") ||
          name.includes("alfred") ||
          name.includes("melbourne") ||
          name.includes("sydney") ||
          name.includes("australia") ||
          ["victoria", "new south wales", "queensland", "tasmania", "south australia", "western australia", "vic", "nsw", "qld", "wa", "sa", "tas", "nt", "act"].includes(prov) ||
          ["victoria", "new south wales", "queensland", "tasmania", "south australia", "western australia", "vic", "nsw", "qld", "wa", "sa", "tas", "nt", "act"].includes(reg)
        );
      });

      if (australianFacilities.length === 0) {
        setFacilities([
          {
            id: "e0000000-0000-0000-0000-000000000001",
            facility_name: "headspace Melbourne (Youth Mental Health)",
            region: "Victoria",
            emergency_capable: false,
            contact_email: "info@headspacemelbourne.org.au",
            contact_phone: "03 9027 0100",
            city: "Melbourne",
            province: "VIC"
          },
          {
            id: "e0000000-0000-0000-0000-000000000002",
            facility_name: "Alfred Health Mental Health Services",
            region: "Victoria",
            emergency_capable: false,
            contact_email: "mentalhealth@alfred.org.au",
            contact_phone: "03 9076 2000",
            city: "Melbourne",
            province: "VIC"
          },
          {
            id: "e0000000-0000-0000-0000-000000000003",
            facility_name: "Royal Melbourne Hospital Emergency Dept",
            region: "Victoria",
            emergency_capable: true,
            contact_email: "emergency@mh.org.au",
            contact_phone: "03 9342 7000",
            city: "Melbourne",
            province: "VIC"
          },
          {
            id: "e0000000-0000-0000-0000-000000000004",
            facility_name: "St Vincent's Hospital Sydney Emergency Dept",
            region: "New South Wales",
            emergency_capable: true,
            contact_email: "emergency@svha.org.au",
            contact_phone: "02 8382 1111",
            city: "Darlinghurst",
            province: "NSW"
          }
        ]);
      } else {
        setFacilities(australianFacilities as FacilityOpt[]);
      }
    })();
  }, []);

  const emergencyFacilities = useMemo(() => facilities.filter(f => f.emergency_capable), [facilities]);
  const regularFacilities = useMemo(() => facilities.filter(f => !f.emergency_capable), [facilities]);

  const handleSubmit = async () => {
    if (!user || !destValue) {
      toast({ variant: "destructive", title: "Pick a destination", description: "Select a clinician or facility." });
      return;
    }
    setSubmitting(true);
    try {
      const { data: full } = await supabase
        .from("chw_sessions")
        .select("notes, narrative_text, narrative_translation, atsi_identifies, atsi_identity_label")
        .eq("id", session.id)
        .single();
      const sessionNotes = (full as any)?.notes as string | null;
      const originalTranscript = ((full as any)?.narrative_text || session.narrative_text) as string | null;
      const englishTranslation = ((full as any)?.narrative_translation || session.narrative_translation) as string | null;
      const atsiIdentifies = Boolean((full as any)?.atsi_identifies || session.atsi_identifies);
      const atsiIdentityLabel = ((full as any)?.atsi_identity_label || session.atsi_identity_label) as string | null;

      // 1. Create or reuse a patients row owned by the CHW (pseudonym only)
      const { data: existing } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", user.id)
        .eq("patient_identifier", session.patient_pseudonym)
        .maybeSingle();

      let patientId = existing?.id;
      if (!patientId) {
        const { data: newPatient, error: pErr } = await supabase
          .from("patients").insert({
            user_id: user.id,
            patient_identifier: session.patient_pseudonym,
            language_preference: session.language_code,
            metadata: {
              age_band: session.age_band,
              source: "chw_session",
              chw_session_id: session.id,
              atsi_identifies: atsiIdentifies,
              atsi_identity_label: atsiIdentityLabel,
            },
          }).select("id").single();
        if (pErr) throw pErr;
        patientId = newPatient.id;
      }

      const [destType, destId] = destValue.split(":");
      const destFacility = destType === "facility"
        ? facilities.find(f => f.id === destId)
        : null;
      const destClinician = destType === "clinician"
        ? clinicians.find(c => c.id === destId)
        : null;
      const destinationLabel = destFacility
        ? `facility:${destFacility.facility_name}${destFacility.emergency_capable ? " (Emergency)" : ""}`
        : destClinician
          ? destClinician.id // user uuid so RLS "destination = auth.uid()::text" matches
          : null;

      const composedNotes = [
        extraNotes.trim(),
        atsiIdentifies ? `\n--- Cultural safety ---\nPatient identifies as ${atsiIdentityLabel || "Aboriginal and/or Torres Strait Islander"}. Use SEWB framing and consider 13YARN for crisis support.` : "",
        englishTranslation ? `\n--- English translation for clinician ---\n${englishTranslation}` : "",
        originalTranscript ? `\n--- Original transcript ---\n${originalTranscript}` : "",
        sessionNotes ? `\n--- Bicultural Worker notes ---\n${sessionNotes}` : "",
        session.phq9_score != null ? `\n--- PHQ-9 ---\nScore: ${session.phq9_score} (${session.phq9_severity})${session.phq9_item9_flag ? " · Self-harm flag" : ""}` : "",
        destFacility ? `\n--- Destination ---\nFacility: ${destFacility.facility_name}${destFacility.region ? ` · ${destFacility.region}` : ""}` : "",
      ].join("");

      const { data: refData, error: rErr } = await supabase.from("referrals").insert({
        patient_id: patientId,
        recorded_by: user.id,
        context: "chw_upward_referral",
        referral_type: destFacility?.emergency_capable ? "emergency" : "clinical_review",
        urgency: urgencyState,
        destination: destinationLabel,
        reason: `CHW upward referral · ${session.patient_pseudonym}`,
        notes: composedNotes,
        status: "active",
      }).select("id").single();
      if (rErr) throw rErr;

      // Mark session as referred
      const { error: sErr } = await supabase
        .from("chw_sessions").update({
          status: "referred",
          referral_id: refData.id,
          completed_at: new Date().toISOString(),
        }).eq("id", session.id);
      if (sErr) throw sErr;

      toast({ title: "Referral sent", description: `Sent to ${destFacility?.facility_name || destClinician?.full_name}.` });
      onDone();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Could not refer", description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className={mustEmergency ? "border-destructive/60" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ArrowUpRight className="h-5 w-5 text-primary" />
          Refer Upward
        </CardTitle>
        <CardDescription>
          Send {session.patient_pseudonym} to a clinician, facility, or emergency centre.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {mustEmergency && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Emergency referral</AlertTitle>
            <AlertDescription>Self-harm thoughts reported. Please choose an emergency-capable facility.</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{session.patient_pseudonym}</Badge>
          {session.age_band && <Badge variant="outline">{session.age_band}</Badge>}
          {session.phq9_score != null && (
            <Badge variant={mustRefer ? "destructive" : "secondary"}>PHQ-9: {session.phq9_score} · {session.phq9_severity}</Badge>
          )}
        </div>

        <div className="space-y-1">
          <Label>Refer to</Label>
          {(() => {
            const selectedLabel = (() => {
              if (!destValue) return "";
              const [t, id] = destValue.split(":");
              if (t === "facility") {
                const f = facilities.find(x => x.id === id);
                return f ? `${f.facility_name}${f.emergency_capable ? " (Emergency)" : ""}${f.region ? ` · ${f.region}` : ""}` : "";
              }
              const c = clinicians.find(x => x.id === id);
              return c ? `${c.full_name} (${c.role === "clinical_nurse" ? "Refugee Health Nurse" : c.role === "psychiatrist" ? "Psychiatrist / Psychologist" : "Admin"})` : "";
            })();
            const pick = (v: string) => { setDestValue(v); setDestOpen(false); };
            return (
              <Popover open={destOpen} onOpenChange={setDestOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={destOpen}
                    className="w-full justify-between font-normal">
                    <span className={cn("truncate", !selectedLabel && "text-muted-foreground")}>
                      {selectedLabel || "Search clinician, facility, or emergency centre…"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command
                    filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}
                  >
                    <CommandInput placeholder="Type a name, region, or role…" />
                    <CommandList className="max-h-[320px]">
                      <CommandEmpty>No matches.</CommandEmpty>
                      {emergencyFacilities.length > 0 && (
                        <CommandGroup heading="Emergency centres">
                          {emergencyFacilities.map(f => {
                            const v = `facility:${f.id}`;
                            const search = `${f.facility_name} ${f.region || ""} emergency`;
                            return (
                              <CommandItem key={f.id} value={search} onSelect={() => pick(v)}>
                                <Siren className="mr-2 h-3 w-3 text-destructive" />
                                <span className="flex-1 truncate">{f.facility_name}{f.region ? ` · ${f.region}` : ""}</span>
                                {destValue === v && <Check className="h-4 w-4" />}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      )}
                      {clinicians.length > 0 && (
                        <>
                          <CommandSeparator />
                          <CommandGroup heading="Clinicians">
                            {clinicians.map(c => {
                              const v = `clinician:${c.id}`;
                              const roleLabel = c.role === "clinical_nurse" ? "Refugee Health Nurse" : c.role === "psychiatrist" ? "Psychiatrist / Psychologist" : "Admin";
                              const search = `${c.full_name} ${roleLabel}`;
                              return (
                                <CommandItem key={c.id} value={search} onSelect={() => pick(v)}>
                                  <UserCheck className="mr-2 h-3 w-3" />
                                  <span className="flex-1 truncate">{c.full_name} <span className="text-muted-foreground">({roleLabel})</span></span>
                                  {destValue === v && <Check className="h-4 w-4" />}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </>
                      )}
                      {regularFacilities.length > 0 && (
                        <>
                          <CommandSeparator />
                          <CommandGroup heading="Facilities">
                            {regularFacilities.map(f => {
                              const v = `facility:${f.id}`;
                              const search = `${f.facility_name} ${f.region || ""}`;
                              return (
                                <CommandItem key={f.id} value={search} onSelect={() => pick(v)}>
                                  <Building2 className="mr-2 h-3 w-3" />
                                  <span className="flex-1 truncate">{f.facility_name}{f.region ? ` · ${f.region}` : ""}</span>
                                  {destValue === v && <Check className="h-4 w-4" />}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </>
                      )}
                      {clinicians.length === 0 && facilities.length === 0 && (
                        <div className="px-3 py-4 text-sm text-muted-foreground text-center">No registered clinicians or facilities yet.</div>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            );
          })()}
        </div>

        <div className="space-y-1">
          <Label>Urgency</Label>
          <Select value={urgencyState} onValueChange={(v) => setUrgencyState(v as any)} disabled={mustEmergency}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="routine">Routine</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Extra notes for the receiver</Label>
          <Textarea rows={3} value={extraNotes} onChange={e => setExtraNotes(e.target.value)}
            placeholder="Anything else they need to know on top of the narrative and PHQ-9?" />
        </div>

        {!showConfirm && (
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={onCancel} disabled={submitting}>Cancel</Button>
            <Button onClick={() => setShowConfirm(true)} disabled={submitting || !destValue}>
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Review &amp; Send
            </Button>
          </div>
        )}

        {showConfirm && (
          <div className="rounded-lg border bg-muted/40 p-4 space-y-3 mt-2">
            <h4 className="text-sm font-semibold text-foreground">Confirm referral</h4>
            {(() => {
              const [t, id] = destValue.split(":");
              if (t === "facility") {
                const f = facilities.find(x => x.id === id);
                if (!f) return null;
                const locality = [f.city, f.province || f.region].filter(Boolean).join(", ");
                return (
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{f.facility_name}</span>
                      {f.emergency_capable && <Badge variant="destructive" className="text-[10px]">Emergency centre</Badge>}
                    </div>
                    {f.region && <div className="text-muted-foreground pl-6">Region: {f.region}</div>}
                    {locality && <div className="text-muted-foreground pl-6">Address: {locality}</div>}
                    {f.contact_phone && <div className="text-muted-foreground pl-6">Phone: <a className="underline" href={`tel:${f.contact_phone}`}>{f.contact_phone}</a></div>}
                    {f.contact_email && <div className="text-muted-foreground pl-6">Email: <a className="underline" href={`mailto:${f.contact_email}`}>{f.contact_email}</a></div>}
                    {!f.contact_phone && !f.contact_email && (
                      <div className="text-muted-foreground pl-6 italic">No contact details on file.</div>
                    )}
                  </div>
                );
              }
              const c = clinicians.find(x => x.id === id);
              return c ? (
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{c.full_name}</span>
                  </div>
                  <div className="text-muted-foreground pl-6 capitalize">
                    Role: {c.role === "clinical_nurse" ? "Refugee Health Nurse" : c.role === "psychiatrist" ? "Psychiatrist / Clinical Psychologist" : "Service Admin"}
                  </div>
                  {c.email
                    ? <div className="text-muted-foreground pl-6">Email: <a className="underline" href={`mailto:${c.email}`}>{c.email}</a></div>
                    : <div className="text-muted-foreground pl-6 italic">No contact email on file.</div>}
                </div>
              ) : null;
            })()}
            <div className="text-sm">
              <span className="text-muted-foreground">Urgency:</span>{" "}
              <Badge variant={urgencyState === "emergency" ? "destructive" : urgencyState === "urgent" ? "default" : "outline"} className="text-[10px]">
                {urgencyState.charAt(0).toUpperCase() + urgencyState.slice(1)}
              </Badge>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Patient:</span>{" "}
              <span className="font-medium">{session.patient_pseudonym}</span>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowConfirm(false)} disabled={submitting}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Go Back
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={submitting || !destValue}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowUpRight className="h-4 w-4 mr-2" />}
                Confirm &amp; Send
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
