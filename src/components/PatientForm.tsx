import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { scrubPii } from "@/lib/pii-scrub";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SUPPORTED_LANGUAGES, FHIR_GENDERS } from "@/lib/languages";

const patientSchema = z.object({
  patient_identifier: z.string().trim().min(1, "Patient identifier is required").max(100),
  age_band: z.string().optional(),
  gender: z.string().optional(),
  language_preference: z.string().optional(), // stored as BCP-47 code (e.g. "sn", "nd")
  cultural_background: z.string().optional(),
  contact_notes: z.string().max(1000).optional(),
  atsi_identity: z.enum(["none", "aboriginal", "torres_strait", "both", "not_stated"]).optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

interface PatientFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

// Languages filtered to exclude 'mixed' — not a meaningful patient preference
const languages = SUPPORTED_LANGUAGES.filter(l => l.code !== 'mixed');
// FHIR administrative-gender codes — stored in DB, displayed via label
const ageBands = [
  { value: "under_18", label: "Under 18" },
  { value: "18-25",    label: "18–25" },
  { value: "26-35",    label: "26–35" },
  { value: "36-45",    label: "36–45" },
  { value: "46-55",    label: "46–55" },
  { value: "56-65",    label: "56–65" },
  { value: "over_65",  label: "Over 65" },
];

export const PatientForm = ({ onSuccess, onCancel }: PatientFormProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [piiWarning, setPiiWarning] = useState<string[] | null>(null);
  const [piiAcknowledged, setPiiAcknowledged] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      patient_identifier: "",
      age_band: "",
      gender: "",
      language_preference: "",
      cultural_background: "",
      atsi_identity: "none",
    },
  });

  const ATSI_LABELS: Record<string, { identifies: boolean; label?: string }> = {
    none: { identifies: false },
    not_stated: { identifies: false },
    aboriginal: { identifies: true, label: "Aboriginal" },
    torres_strait: { identifies: true, label: "Torres Strait Islander" },
    both: { identifies: true, label: "Aboriginal and Torres Strait Islander" },
  };

  const onSubmit = async (data: PatientFormData) => {
    const scan = scrubPii([data.patient_identifier, data.cultural_background, data.contact_notes].filter(Boolean).join("\n"));
    if (scan.count > 0 && !piiAcknowledged) {
      setPiiWarning(scan.types);
      return;
    }
    setLoading(true);
    try {
      const atsi = ATSI_LABELS[data.atsi_identity || "none"] ?? ATSI_LABELS.none;
      const metadata: Record<string, unknown> = {};
      if (data.age_band) metadata.age_band = data.age_band;
      if (data.atsi_identity && data.atsi_identity !== "none") {
        metadata.atsi_identity_response = data.atsi_identity;
        metadata.atsi_identifies = atsi.identifies;
        if (atsi.label) metadata.atsi_identity_label = atsi.label;
      }
      const { data: inserted, error } = await supabase.from('patients').insert({
        user_id: user!.id,
        patient_identifier: data.patient_identifier,
        gender: data.gender || null,
        language_preference: data.language_preference || null,
        cultural_background: data.cultural_background || null,
        contact_notes: data.contact_notes || null,
        metadata: metadata as any,
      }).select("id").single();

      if (error) throw error;
      if (scan.count > 0 && user) {
        await supabase.from("audit_events").insert({
          actor_id: user.id, actor_role: "clinician", action: "pii_detected", outcome: "acknowledged_and_kept",
          resource_type: "patient", resource_id: inserted?.id ?? null, patient_id: inserted?.id ?? null,
          description: "Possible identifying information detected in patient fields; clinician acknowledged and kept",
          metadata: { types: scan.types, spans: scan.count }, source: "PatientForm",
        });
      }

      toast({
        title: "Success",
        description: "Patient profile created successfully",
      });
      onSuccess();
    } catch (error) {
      console.error('Error creating patient:', error);
      toast({
        title: "Error",
        description: "Failed to create patient profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="patient_identifier">Patient Identifier *</Label>
        <Input
          id="patient_identifier"
          placeholder="e.g., Patient-001, Initials, or anonymous ID"
          {...register("patient_identifier")}
        />
        {errors.patient_identifier && (
          <p className="text-sm text-destructive mt-1">{errors.patient_identifier.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="age_band">Age Band</Label>
        <Select onValueChange={(value) => setValue("age_band", value)} value={watch("age_band")}>
          <SelectTrigger>
            <SelectValue placeholder="Select age range" />
          </SelectTrigger>
          <SelectContent>
            {ageBands.map((band) => (
              <SelectItem key={band.value} value={band.value}>
                {band.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="gender">Gender</Label>
        <Select onValueChange={(value) => setValue("gender", value)} value={watch("gender")}>
          <SelectTrigger>
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            {FHIR_GENDERS.map((g) => (
              <SelectItem key={g.code} value={g.code}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="language_preference">Language Preference</Label>
        <Select
          onValueChange={(value) => setValue("language_preference", value)}
          value={watch("language_preference")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            {languages.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="cultural_background">Cultural Background</Label>
        <Input
          id="cultural_background"
          placeholder="e.g., Hazara, Tamil, Karen, Dinka, Tigrinya, Rohingya, Vietnamese"
          {...register("cultural_background")}
        />
      </div>

      <div>
        <Label htmlFor="atsi_identity">
          Aboriginal and/or Torres Strait Islander origin
        </Label>
        <Select
          onValueChange={(value) => setValue("atsi_identity", value as any)}
          value={watch("atsi_identity") || "none"}
        >
          <SelectTrigger id="atsi_identity">
            <SelectValue placeholder="Select response" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No</SelectItem>
            <SelectItem value="aboriginal">Yes, Aboriginal</SelectItem>
            <SelectItem value="torres_strait">Yes, Torres Strait Islander</SelectItem>
            <SelectItem value="both">Yes, both Aboriginal and Torres Strait Islander</SelectItem>
            <SelectItem value="not_stated">Prefer not to say</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Standard AIHW Indigenous status question. When "Yes", the app applies the Social &amp;
          Emotional Wellbeing (SEWB) framing and surfaces 13YARN in crisis pathways.
        </p>
      </div>

      <div>
        <Label htmlFor="contact_notes">Contact notes (optional)</Label>
        <Textarea id="contact_notes" rows={2} placeholder="e.g. prefers afternoon sessions, needs Dari interpreter. Do not enter names, phone numbers or addresses."
          {...register("contact_notes", { onChange: () => { setPiiWarning(null); setPiiAcknowledged(false); } })} />
      </div>

      {piiWarning && (
        <Alert variant="destructive">
          <AlertDescription className="space-y-2">
            <p className="font-medium">Possible identifying information detected — store only the clinician reference code.</p>
            <p className="text-xs">Detected: {piiWarning.join(", ")}. Edit the fields to remove it, or confirm below (this is recorded in the audit log).</p>
            <Button type="button" size="sm" variant="outline" onClick={() => { setPiiAcknowledged(true); setPiiWarning(null); }}>
              Acknowledge and keep
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Patient
        </Button>
      </div>
    </form>
  );
};
