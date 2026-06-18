import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BookPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

import { SUPPORTED_LANGUAGES } from "@/lib/languages";

const LANGUAGES = [
  ...SUPPORTED_LANGUAGES.filter(l => l.code !== "mixed").map(l => ({ code: l.code, label: l.name })),
  { code: "other", label: "Other / Mixed" },
];

interface IdiomSubmissionDialogProps {
  /** Pre-fill the idiom field if a term was spotted during assessment */
  prefillIdiom?: string;
  /** Pre-fill the language if detected from narrative */
  prefillLanguage?: string;
}

export function IdiomSubmissionDialog({ prefillIdiom, prefillLanguage }: IdiomSubmissionDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idiom, setIdiom] = useState(prefillIdiom ?? "");
  const [languageCode, setLanguageCode] = useState(prefillLanguage ?? "");
  const [patientUtterance, setPatientUtterance] = useState("");
  const [clinicianInterpretation, setClinicianInterpretation] = useState("");
  const [clinicalContext, setClinicalContext] = useState("");

  const { user } = useAuth();
  const { toast } = useToast();

  const reset = () => {
    setIdiom(prefillIdiom ?? "");
    setLanguageCode(prefillLanguage ?? "");
    setPatientUtterance("");
    setClinicianInterpretation("");
    setClinicalContext("");
  };

  const handleSubmit = async () => {
    if (!idiom.trim() || !languageCode || !patientUtterance.trim() || !clinicianInterpretation.trim()) {
      toast({
        title: "Incomplete submission",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await (supabase as any).from("idiom_submissions").insert({
        submitted_by: user!.id,
        idiom: idiom.trim(),
        language_code: languageCode,
        patient_utterance: patientUtterance.trim(),
        clinician_interpretation: clinicianInterpretation.trim(),
        clinical_context: clinicalContext.trim() || null,
      });

      if (error) throw error;

      toast({
        title: "Idiom submitted",
        description: "Thank you. This will be reviewed by the psychiatrist panel before being added to the library.",
      });

      reset();
      setOpen(false);
    } catch (error) {
      console.error("Error submitting idiom:", error);
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BookPlus className="h-4 w-4" />
          Submit New Idiom
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Submit a Cultural Idiom</DialogTitle>
          <DialogDescription>
            Encountered an expression of distress not in the library? Submit it for psychiatrist panel review.
            All content must be <strong>anonymised</strong> — do not include patient names, dates, or locations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="idiom-term">
                Idiom / term <span className="text-destructive">*</span>
              </Label>
              <Input
                id="idiom-term"
                placeholder="e.g. I am on edge, I am a burden"
                value={idiom}
                onChange={(e) => setIdiom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="idiom-language">
                Language <span className="text-destructive">*</span>
              </Label>
              <Select value={languageCode} onValueChange={setLanguageCode}>
                <SelectTrigger id="idiom-language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="patient-utterance">
              What the patient said (anonymised) <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="patient-utterance"
              placeholder='e.g. "I am at my wits end" — remove any identifying details'
              value={patientUtterance}
              onChange={(e) => setPatientUtterance(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="clinician-interpretation">
              Your clinical interpretation <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="clinician-interpretation"
              placeholder="What do you think this expression means clinically? e.g. possible passive suicidal ideation expressed via burden narrative"
              value={clinicianInterpretation}
              onChange={(e) => setClinicianInterpretation(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="clinical-context">
              Clinical context <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea
              id="clinical-context"
              placeholder="e.g. Presenting with low mood, social withdrawal, expressed feelings of being a burden — community health setting"
              value={clinicalContext}
              onChange={(e) => setClinicalContext(e.target.value)}
              className="min-h-[60px]"
            />
          </div>

          <p className="text-xs text-muted-foreground border-t pt-3">
            Submissions go to the expert panel with <strong>pending_review</strong> status. After panel sign-off,
            approved idioms are added to the clinical library. You will not be notified automatically —
            check the idiom library for updates. This pipeline will become automated in a future release.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); setOpen(false); }} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit for Panel Review"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
