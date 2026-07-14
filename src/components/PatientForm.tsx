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
import { SUPPORTED_LANGUAGES, FHIR_GENDERS } from "@/lib/languages";

const patientSchema = z.object({
  patient_identifier: z.string().trim().min(1, "Patient identifier is required").max(100),
  age_band: z.string().optional(),
  gender: z.string().optional(),
  language_preference: z.string().optional(), // stored as BCP-47 code (e.g. "sn", "nd")
  cultural_background: z.string().optional(),
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
    },
  });

  const onSubmit = async (data: PatientFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('patients').insert({
        user_id: user!.id,
        patient_identifier: data.patient_identifier,
        gender: data.gender || null,
        language_preference: data.language_preference || null,
        cultural_background: data.cultural_background || null,
        metadata: data.age_band ? { age_band: data.age_band } : {},
      });

      if (error) throw error;

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
