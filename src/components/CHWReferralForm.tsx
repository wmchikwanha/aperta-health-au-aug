import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Loader2, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CHWReferralFormProps {
  patientId: string;
  patientName: string;
  narrativeText?: string;
  onSuccess?: () => void;
}

export function CHWReferralForm({ patientId, patientName, narrativeText, onSuccess }: CHWReferralFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clinicians, setClinicians] = useState<{ id: string; full_name: string; email: string; role: string }[]>([]);
  const [selectedClinician, setSelectedClinician] = useState("");
  const [urgency, setUrgency] = useState("routine");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Load clinicians (psychiatrists and admins) from profiles via user_roles
    const loadClinicians = async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["clinical_nurse", "psychiatrist", "admin"]);

      if (!roles?.length) return;

      const clinicianIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", clinicianIds);

      // Attach role to each clinician and sort nurses first
      const clinicianList = (profiles || []).map(p => {
        const roleEntry = roles.find(r => r.user_id === p.id);
        return { ...p, role: roleEntry?.role || "psychiatrist" };
      });
      clinicianList.sort((a, b) => {
        const order = { clinical_nurse: 0, psychiatrist: 1, admin: 2 };
        return (order[a.role as keyof typeof order] ?? 3) - (order[b.role as keyof typeof order] ?? 3);
      });
      setClinicians(clinicianList);
    };
    loadClinicians();
  }, []);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    const { error } = await supabase.from("referrals").insert({
      patient_id: patientId,
      recorded_by: user.id,
      context: "chw_upward_referral",
      referral_type: "clinical_review",
      urgency,
      destination: selectedClinician || null,
      reason: "CHW upward referral for clinical assessment",
      notes: [
        notes,
        narrativeText ? `\n---\nTranscript:\n${narrativeText}` : "",
      ].join(""),
      status: "active",
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Referral Sent", description: `Patient referred for clinical review.` });
      onSuccess?.();
    }
    setSubmitting(false);
  };

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ArrowUpRight className="h-5 w-5 text-primary" />
          Refer to Clinician
        </CardTitle>
        <CardDescription>
          Send this patient's recording and details to a clinician for clinical assessment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{patientName}</Badge>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Refer to</label>
          <Select value={selectedClinician} onValueChange={setSelectedClinician}>
            <SelectTrigger>
              <SelectValue placeholder="Select clinician (or leave for any available)" />
            </SelectTrigger>
            <SelectContent>
              {clinicians.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-3 w-3" />
                    {c.full_name} ({c.role === "clinical_nurse" ? "Refugee Health Nurse" : c.role === "psychiatrist" ? "Psychiatrist / Clinical Psychologist" : "Service Admin"})
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Urgency</label>
          <Select value={urgency} onValueChange={setUrgency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="routine">Routine</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Notes for clinician</label>
          <Textarea
            placeholder="Brief description of concerns, observations, or context..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <Button onClick={handleSubmit} disabled={submitting} className="w-full">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowUpRight className="h-4 w-4 mr-2" />}
          Send Referral
        </Button>
      </CardContent>
    </Card>
  );
}
