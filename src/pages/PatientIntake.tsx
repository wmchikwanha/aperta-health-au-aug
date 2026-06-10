import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Stethoscope, ChevronRight, ChevronLeft, Check, AlertTriangle, ShieldCheck, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import { scorePHQ9, scoreGAD7 } from "@/lib/screening/scoringUtils";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const CRISIS_NUMBERS = [
  { label: "Lifeline (24/7)", number: "13 11 14" },
  { label: "13YARN (Aboriginal & Torres Strait Islander, 24/7)", number: "13 92 76" },
  { label: "Suicide Call Back Service", number: "1300 659 467" },
  { label: "Emergency Services", number: "000" },
];

const CONSENT_ITEMS = [
  { type: "data_processing", label: "I consent to my health information being securely stored and shared with my assigned clinician for assessment purposes.", required: true },
  { type: "ai_analysis", label: "I consent to AI-assisted analysis of my responses to support clinical decision-making. All AI outputs will be reviewed by a qualified clinician.", required: true },
  { type: "screening_use", label: "I understand that screening instruments are for clinical guidance only and do not constitute a diagnosis.", required: true },
  { type: "research_opt_in", label: "I optionally consent to my anonymised data being used for research purposes to improve mental health services.", required: false },
];

const PHQ9_QUESTIONS = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
  "Trouble concentrating on things, such as reading or watching television",
  "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless",
  "Thoughts that you would be better off dead, or of hurting yourself in some way",
];

const GAD7_QUESTIONS = [
  "Feeling nervous, anxious, or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it's hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid, as if something awful might happen",
];

const LIKERT_OPTIONS = [
  { value: 0, label: "Not at all" },
  { value: 1, label: "Several days" },
  { value: 2, label: "More than half the days" },
  { value: 3, label: "Nearly every day" },
];

type Step = "loading" | "error" | "consent" | "demographics" | "screening_phq9" | "screening_gad7" | "narrative" | "confirmation";

interface SessionData {
  id: string;
  tier: string;
  language_code: string;
  demographics: any;
  status: string;
}

async function callIntakeApi(body: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/validate-intake-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function PatientIntake() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("loading");
  const [session, setSession] = useState<SessionData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Consent state
  const [consents, setConsents] = useState<Record<string, boolean>>({});

  // Demographics state
  const [ageBand, setAgeBand] = useState("");
  const [gender, setGender] = useState("");
  const [culturalBg, setCulturalBg] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("");

  // Screening state
  const [phq9Responses, setPhq9Responses] = useState<(number | null)[]>(Array(9).fill(null));
  const [gad7Responses, setGad7Responses] = useState<(number | null)[]>(Array(7).fill(null));
  const [showSafetyAlert, setShowSafetyAlert] = useState(false);

  // Narrative state
  const [narrativeText, setNarrativeText] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) { setStep("error"); setErrorMsg("No intake token provided."); return; }
    callIntakeApi({ action: "validate", token })
      .then((data) => { setSession(data.session); setStep("consent"); })
      .catch((err) => { setErrorMsg(err.message); setStep("error"); });
  }, [token]);

  const steps: Step[] = (() => {
    const base: Step[] = ["consent", "demographics", "screening_phq9"];
    if (session?.tier === "standard" || session?.tier === "comprehensive") base.push("screening_gad7");
    if (session?.tier === "standard" || session?.tier === "comprehensive") base.push("narrative");
    base.push("confirmation");
    return base;
  })();

  const currentIndex = steps.indexOf(step);
  const progress = step === "loading" || step === "error" ? 0 : ((currentIndex + 1) / steps.length) * 100;

  const canProceedConsent = CONSENT_ITEMS.filter(c => c.required).every(c => consents[c.type]);
  const canProceedDemographics = ageBand && gender;
  const phq9Complete = phq9Responses.every(r => r !== null);
  const gad7Complete = gad7Responses.every(r => r !== null);

  // Check PHQ-9 Q9 for safety alert
  useEffect(() => {
    if (phq9Responses[8] !== null && phq9Responses[8] >= 1) setShowSafetyAlert(true);
  }, [phq9Responses]);

  const handleSaveConsents = useCallback(async () => {
    if (!session) return;
    setIsSaving(true);
    try {
      const consentList = CONSENT_ITEMS.map(c => ({
        consent_type: c.type,
        granted: !!consents[c.type],
        consent_text_version: "1.0",
        language_code: session.language_code,
      }));
      await callIntakeApi({ action: "save_consents", session_id: session.id, consents: consentList });
      setStep("demographics");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setIsSaving(false); }
  }, [session, consents, toast]);

  const handleSaveDemographics = useCallback(async () => {
    if (!session) return;
    setIsSaving(true);
    try {
      await callIntakeApi({
        action: "save_demographics",
        session_id: session.id,
        demographics: { age_band: ageBand, gender, cultural_background: culturalBg },
        language_code: preferredLanguage || session.language_code,
      });
      setStep("screening_phq9");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setIsSaving(false); }
  }, [session, ageBand, gender, culturalBg, preferredLanguage, toast]);

  const handleSavePHQ9 = useCallback(async () => {
    if (!session) return;
    setIsSaving(true);
    try {
      const result = scorePHQ9(phq9Responses as number[]);
      const itemFlags: any = {};
      if ((phq9Responses[8] as number) >= 1) {
        itemFlags.PHQ9_Q9 = phq9Responses[8];
        itemFlags.flag = "suicidal_ideation";
        itemFlags.immediate_review = true;
      }
      await callIntakeApi({
        action: "save_screening",
        session_id: session.id,
        tool_type: "PHQ9",
        responses: phq9Responses,
        total_score: result.totalScore,
        severity_level: result.severityLevel,
        interpretation: result.interpretation,
        item_flags: Object.keys(itemFlags).length > 0 ? itemFlags : {},
      });
      const nextStep = steps[steps.indexOf("screening_phq9") + 1];
      setStep(nextStep);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setIsSaving(false); }
  }, [session, phq9Responses, steps, toast]);

  const handleSaveGAD7 = useCallback(async () => {
    if (!session) return;
    setIsSaving(true);
    try {
      const result = scoreGAD7(gad7Responses as number[]);
      await callIntakeApi({
        action: "save_screening",
        session_id: session.id,
        tool_type: "GAD7",
        responses: gad7Responses,
        total_score: result.totalScore,
        severity_level: result.severityLevel,
        interpretation: result.interpretation,
      });
      const nextStep = steps[steps.indexOf("screening_gad7") + 1];
      setStep(nextStep);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setIsSaving(false); }
  }, [session, gad7Responses, steps, toast]);

  const handleSaveNarrative = useCallback(async () => {
    if (!session) return;
    setIsSaving(true);
    try {
      await callIntakeApi({ action: "save_narrative", session_id: session.id, narrative_text: narrativeText });
      setStep("confirmation");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setIsSaving(false); }
  }, [session, narrativeText, toast]);

  const handleComplete = useCallback(async () => {
    if (!session) return;
    setIsSaving(true);
    try {
      await callIntakeApi({ action: "complete", session_id: session.id });
      toast({ title: "Intake Complete", description: "Your responses have been submitted to your practitioner." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setIsSaving(false); }
  }, [session, toast]);

  // ── RENDER ──────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Validating your intake link...</p>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Link Error</CardTitle>
            <CardDescription>{errorMsg}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Please contact your clinician for a new intake link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" />
            <span className="font-semibold text-foreground">Aperta Health Pre-Registration</span>
          </div>
          <Badge variant="outline" className="text-xs">{session?.tier} tier</Badge>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1">Step {currentIndex + 1} of {steps.length}</p>
      </div>

      {/* Safety Alert */}
      {showSafetyAlert && (
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <Card className="border-destructive bg-[hsl(var(--alert-red-bg))]">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-destructive">If you are in crisis or having thoughts of harming yourself, please reach out now:</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {CRISIS_NUMBERS.map(c => (
                      <li key={c.number}><strong>{c.label}:</strong> <a href={`tel:${c.number.replace(/\s/g, "")}`} className="underline text-primary">{c.number}</a></li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">Your clinician will be alerted and will prioritise your review.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* ── CONSENT STEP ─────────────────── */}
        {step === "consent" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Consent & Privacy</CardTitle>
              <CardDescription>Please read and agree to the following before proceeding. Your data is handled with strict confidentiality.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {CONSENT_ITEMS.map((item) => (
                <div key={item.type} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  <Checkbox
                    id={item.type}
                    checked={!!consents[item.type]}
                    onCheckedChange={(v) => setConsents(prev => ({ ...prev, [item.type]: !!v }))}
                    className="mt-0.5"
                  />
                  <Label htmlFor={item.type} className="text-sm leading-relaxed cursor-pointer">
                    {item.label}
                    {!item.required && <span className="text-muted-foreground ml-1">(Optional)</span>}
                  </Label>
                </div>
              ))}
              <Button onClick={handleSaveConsents} disabled={!canProceedConsent || isSaving} className="w-full mt-4">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── DEMOGRAPHICS STEP ────────────── */}
        {step === "demographics" && (
          <Card>
            <CardHeader>
              <CardTitle>About You</CardTitle>
              <CardDescription>This information helps your clinician prepare for your consultation. No names or ID numbers are stored.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Age Range *</Label>
                <Select value={ageBand} onValueChange={setAgeBand}>
                  <SelectTrigger><SelectValue placeholder="Select your age range" /></SelectTrigger>
                  <SelectContent>
                    {["under_18", "18-25", "26-35", "36-45", "46-55", "56-65", "over_65"].map(v => (
                      <SelectItem key={v} value={v}>{v.replace("_", " ").replace("under", "Under ").replace("over", "Over ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gender *</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    {[["male", "Male"], ["female", "Female"], ["other", "Other"], ["unknown", "Prefer not to say"]].map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cultural Background</Label>
                <Input placeholder="e.g. Hazara, Tamil, Karen, Dinka, Rohingya..." value={culturalBg} onChange={e => setCulturalBg(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Preferred Language for Consultation</Label>
                <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
                  <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map(l => (
                      <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("consent")}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
                <Button className="flex-1" onClick={handleSaveDemographics} disabled={!canProceedDemographics || isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── PHQ-9 SCREENING ──────────────── */}
        {step === "screening_phq9" && (
          <Card>
            <CardHeader>
              <CardTitle>Depression Screening (PHQ-9)</CardTitle>
              <CardDescription>Over the <strong>last 2 weeks</strong>, how often have you been bothered by any of the following problems?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {PHQ9_QUESTIONS.map((q, i) => (
                <div key={i} className="space-y-2">
                  <Label className="text-sm font-medium">{i + 1}. {q}</Label>
                  <RadioGroup
                    value={phq9Responses[i]?.toString() ?? ""}
                    onValueChange={(v) => setPhq9Responses(prev => { const n = [...prev]; n[i] = parseInt(v); return n; })}
                    className="grid grid-cols-2 gap-2"
                  >
                    {LIKERT_OPTIONS.map(o => (
                      <div key={o.value} className="flex items-center gap-2 p-2 rounded border bg-card hover:bg-accent/50 transition-colors">
                        <RadioGroupItem value={o.value.toString()} id={`phq9-${i}-${o.value}`} />
                        <Label htmlFor={`phq9-${i}-${o.value}`} className="text-xs cursor-pointer">{o.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("demographics")}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
                <Button className="flex-1" onClick={handleSavePHQ9} disabled={!phq9Complete || isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── GAD-7 SCREENING ──────────────── */}
        {step === "screening_gad7" && (
          <Card>
            <CardHeader>
              <CardTitle>Anxiety Screening (GAD-7)</CardTitle>
              <CardDescription>Over the <strong>last 2 weeks</strong>, how often have you been bothered by the following?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {GAD7_QUESTIONS.map((q, i) => (
                <div key={i} className="space-y-2">
                  <Label className="text-sm font-medium">{i + 1}. {q}</Label>
                  <RadioGroup
                    value={gad7Responses[i]?.toString() ?? ""}
                    onValueChange={(v) => setGad7Responses(prev => { const n = [...prev]; n[i] = parseInt(v); return n; })}
                    className="grid grid-cols-2 gap-2"
                  >
                    {LIKERT_OPTIONS.map(o => (
                      <div key={o.value} className="flex items-center gap-2 p-2 rounded border bg-card hover:bg-accent/50 transition-colors">
                        <RadioGroupItem value={o.value.toString()} id={`gad7-${i}-${o.value}`} />
                        <Label htmlFor={`gad7-${i}-${o.value}`} className="text-xs cursor-pointer">{o.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("screening_phq9")}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
                <Button className="flex-1" onClick={handleSaveGAD7} disabled={!gad7Complete || isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── NARRATIVE STEP ───────────────── */}
        {step === "narrative" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Your Story</CardTitle>
              <CardDescription>In your own words, describe what brings you to see a clinician today. You can write in any language you are comfortable with.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={narrativeText}
                onChange={e => setNarrativeText(e.target.value)}
                placeholder="Tell us in your own words what you've been experiencing..."
                className="min-h-[150px] text-base"
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">{narrativeText.length}/2000 characters</p>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(steps[steps.indexOf("narrative") - 1])}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
                <Button className="flex-1" onClick={handleSaveNarrative} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                  {narrativeText.trim() ? "Continue" : "Skip"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── CONFIRMATION STEP ────────────── */}
        {step === "confirmation" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Check className="h-5 w-5 text-primary" /> Review & Submit</CardTitle>
              <CardDescription>Your responses are ready to be sent to your clinician.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 rounded bg-muted"><span>Demographics</span><Badge variant="outline" className="bg-accent text-accent-foreground">Complete</Badge></div>
                <div className="flex justify-between p-2 rounded bg-muted"><span>PHQ-9 (Depression)</span><Badge variant="outline" className="bg-accent text-accent-foreground">Score: {phq9Responses.every(r => r !== null) ? scorePHQ9(phq9Responses as number[]).totalScore : "—"}</Badge></div>
                {gad7Responses.every(r => r !== null) && (
                  <div className="flex justify-between p-2 rounded bg-muted"><span>GAD-7 (Anxiety)</span><Badge variant="outline" className="bg-accent text-accent-foreground">Score: {scoreGAD7(gad7Responses as number[]).totalScore}</Badge></div>
                )}
                {narrativeText.trim() && (
                  <div className="flex justify-between p-2 rounded bg-muted"><span>Personal Narrative</span><Badge variant="outline" className="bg-accent text-accent-foreground">Provided</Badge></div>
                )}
              </div>

              {showSafetyAlert && (
                <div className="p-3 rounded-lg border border-destructive bg-[hsl(var(--alert-red-bg))] text-sm">
                  <p className="font-medium text-destructive">⚠ Your responses indicate you may need urgent support. Your clinician will be notified and will prioritise your review.</p>
                </div>
              )}

              <div className="p-3 rounded-lg border bg-accent/30 text-sm text-muted-foreground">
                <p>Your practitioner will review these responses before your consultation. This is <strong>not</strong> a diagnosis — it is a starting point for your clinical conversation.</p>
              </div>

              <Button onClick={handleComplete} disabled={isSaving} className="w-full" size="lg">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Submit Pre-Registration
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto py-4 px-4 text-center text-xs text-muted-foreground">
        <p>Aperta Health Clinical Decision Support • AI-generated outputs require clinical review</p>
      </footer>
    </div>
  );
}
