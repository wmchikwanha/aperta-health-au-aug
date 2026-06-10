import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { scorePHQ9 } from "@/lib/screening/scoringUtils";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { Loader2, Mic, MicOff, Save, ArrowUpRight, AlertTriangle, Phone } from "lucide-react";
import type { CHWSession } from "@/pages/CHWWorkspace";

interface PatientContext {
  pseudonym: string;
  ageBand: string | null;
  language: string;
}

interface Props {
  existing: CHWSession | null;
  patientContext?: PatientContext | null;
  onSaved: () => void;
  onReferUpward: (session: CHWSession) => void;
}

const PHQ9_QUESTIONS = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling/staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself",
  "Trouble concentrating",
  "Moving/speaking slowly, or being fidgety/restless",
  "Thoughts that you would be better off dead, or of hurting yourself",
];
const RESPONSE_OPTIONS = [
  { v: "0", label: "Not at all" },
  { v: "1", label: "Several days" },
  { v: "2", label: "More than half the days" },
  { v: "3", label: "Nearly every day" },
];
const LANGUAGES = [
  { v: "en", label: "English" }, { v: "sn", label: "Shona" }, { v: "nd", label: "Ndebele" },
  { v: "zu", label: "siZulu" }, { v: "xh", label: "Xhosa" }, { v: "st", label: "Sotho" },
];
const AGE_BANDS = ["Under 18", "18-25", "26-35", "36-50", "51-65", "Over 65"];

export const CHWNewSession = ({ existing, patientContext, onSaved, onReferUpward }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const lockedPseudonym = !existing && !!patientContext;
  const [pseudonym, setPseudonym] = useState(existing?.patient_pseudonym ?? patientContext?.pseudonym ?? "");
  const [ageBand, setAgeBand] = useState(existing?.age_band ?? patientContext?.ageBand ?? "");
  const [language, setLanguage] = useState(existing?.language_code ?? patientContext?.language ?? "en");
  const [narrative, setNarrative] = useState(existing?.narrative_text ?? "");
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Load existing PHQ9 responses if editing
  useEffect(() => {
    const loadExisting = async () => {
      if (!existing) return;
      const { data } = await supabase
        .from("chw_sessions")
        .select("phq9_responses, notes")
        .eq("id", existing.id)
        .single();
      if (data?.phq9_responses && Array.isArray(data.phq9_responses)) {
        const map: Record<number, number> = {};
        (data.phq9_responses as number[]).forEach((v, i) => { map[i] = v; });
        setResponses(map);
      }
      if (data?.notes) setNotes(data.notes);
    };
    loadExisting();
  }, [existing]);

  const recorder = useAudioRecorder();
  const transcribingRef = useRef(false);
  const lastBlobRef = useRef<Blob | null>(null);
  const [transcribing, setTranscribing] = useState(false);

  // Auto-transcribe when audioBlob is finalised
  useEffect(() => {
    const blob = recorder.audioBlob;
    if (!blob || blob === lastBlobRef.current || transcribingRef.current) return;
    lastBlobRef.current = blob;
    transcribingRef.current = true;
    setTranscribing(true);
    (async () => {
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
          reader.readAsDataURL(blob);
        });
        const { data, error } = await supabase.functions.invoke("transcribe-audio", {
          body: { audio: base64, languageCode: language },
        });
        if (error) throw error;
        if (data?.text) {
          setNarrative(prev => (prev ? prev + " " : "") + data.text);
          toast({ title: "Transcribed" });
        }
      } catch (e: any) {
        toast({ variant: "destructive", title: "Could not transcribe", description: e.message });
      } finally {
        transcribingRef.current = false;
        setTranscribing(false);
      }
    })();
  }, [recorder.audioBlob, language, toast]);

  const isPhq9Complete = Object.keys(responses).length === 9;
  const phq9Result = isPhq9Complete
    ? scorePHQ9(Array.from({ length: 9 }, (_, i) => responses[i]))
    : null;
  const item9Flag = (responses[8] ?? 0) >= 1;
  const mustRefer = item9Flag || (phq9Result != null && phq9Result.totalScore >= 15);

  const buildPayload = (status: "active" | "completed") => ({
    chw_id: user!.id,
    patient_pseudonym: pseudonym.trim(),
    age_band: ageBand || null,
    language_code: language,
    narrative_text: narrative || null,
    phq9_responses: isPhq9Complete ? Array.from({ length: 9 }, (_, i) => responses[i]) : null,
    phq9_score: phq9Result?.totalScore ?? null,
    phq9_severity: phq9Result?.severityLevel ?? null,
    phq9_item9_flag: item9Flag,
    notes: notes || null,
    status,
    completed_at: status === "completed" ? new Date().toISOString() : null,
  });

  const save = async (status: "active" | "completed"): Promise<CHWSession | null> => {
    if (!user) return null;
    if (!pseudonym.trim()) {
      toast({ variant: "destructive", title: "Pseudonym required", description: "Use a code or initials, not a real name." });
      return null;
    }
    setSaving(true);
    const payload = buildPayload(status);
    const { data, error } = existing
      ? await supabase.from("chw_sessions").update(payload).eq("id", existing.id).select().single()
      : await supabase.from("chw_sessions").insert(payload).select().single();
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Could not save", description: error.message });
      return null;
    }
    toast({ title: status === "completed" ? "Session completed" : "Session saved" });
    return data as CHWSession;
  };

  const handleSaveDraft = async () => {
    const s = await save("active");
    if (s) onSaved();
  };

  const handleComplete = async () => {
    if (mustRefer) {
      toast({ variant: "destructive", title: "Refer first", description: "This person needs upward referral, not completion." });
      return;
    }
    const s = await save("completed");
    if (s) onSaved();
  };

  const handleReferNow = async () => {
    const s = await save("active");
    if (s) onReferUpward(s);
  };

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <StepBadge n={1} label="Greet & listen" active={step === 1} done={step > 1} onClick={() => setStep(1)} />
        <div className="flex-1 h-px bg-border mx-2" />
        <StepBadge n={2} label="Screen (PHQ-9)" active={step === 2} done={step > 2} onClick={() => setStep(2)} />
        <div className="flex-1 h-px bg-border mx-2" />
        <StepBadge n={3} label="Decide" active={step === 3} done={false} onClick={() => setStep(3)} />
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {lockedPseudonym ? `New session for ${pseudonym}` : existing ? `Resume session: ${pseudonym}` : "Listen to the person"}
            </CardTitle>
            <CardDescription>
              {lockedPseudonym
                ? "Continuing with this patient. Pseudonym and demographics are locked."
                : "Use a code or initials only. Do not record real names or ID numbers."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Pseudonym / Code</Label>
                <Input
                  value={pseudonym}
                  onChange={e => setPseudonym(e.target.value)}
                  placeholder="e.g. Patient-A12"
                  disabled={lockedPseudonym}
                  readOnly={lockedPseudonym}
                />
              </div>
              <div className="space-y-1">
                <Label>Age band</Label>
                <Select value={ageBand} onValueChange={setAgeBand}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {AGE_BANDS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => <SelectItem key={l.v} value={l.v}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>What is the person sharing?</Label>
                {recorder.isRecording ? (
                  <Button size="sm" variant="destructive" onClick={() => recorder.stopRecording()}>
                    <MicOff className="h-4 w-4 mr-1" /> Stop & transcribe
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => recorder.startRecording()} disabled={transcribing}>
                    {transcribing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Mic className="h-4 w-4 mr-1" />}
                    {transcribing ? "Transcribing..." : "Record"}
                  </Button>
                )}
              </div>
              <Textarea
                rows={6}
                value={narrative}
                onChange={e => setNarrative(e.target.value)}
                placeholder="Type or speak what the person is telling you. Use plain language."
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!pseudonym.trim()}>Next: Screen</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">PHQ-9 — last 2 weeks</CardTitle>
            <CardDescription>Ask how often the person has been bothered by each problem.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {item9Flag && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Safety concern</AlertTitle>
                <AlertDescription className="space-y-1">
                  <p>The person has thoughts of self-harm. Stay with them. Refer immediately.</p>
                  <p className="font-semibold flex items-center gap-1"><Phone className="h-3 w-3" /> Zimbabwe Friendship Bench helpline: +263 71 234 5678</p>
                </AlertDescription>
              </Alert>
            )}

            {PHQ9_QUESTIONS.map((q, i) => (
              <div key={i} className="space-y-2">
                <Label className="text-sm">{i + 1}. {q}</Label>
                <RadioGroup
                  value={responses[i]?.toString()}
                  onValueChange={v => setResponses(prev => ({ ...prev, [i]: parseInt(v) }))}
                >
                  <div className="grid grid-cols-2 gap-2">
                    {RESPONSE_OPTIONS.map(opt => (
                      <div key={opt.v} className="flex items-center space-x-2">
                        <RadioGroupItem value={opt.v} id={`q${i}-${opt.v}`} />
                        <Label htmlFor={`q${i}-${opt.v}`} className="font-normal text-sm cursor-pointer">{opt.label}</Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            ))}

            {phq9Result && (
              <Alert>
                <AlertTitle>Score: {phq9Result.totalScore}/27 — {phq9Result.severityLevel}</AlertTitle>
                <AlertDescription className="text-xs">{phq9Result.interpretation}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)}>Next: Decide</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Decide what to do next</CardTitle>
            <CardDescription>Save for follow-up, complete (no further action), or refer upward.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Your notes (private)</Label>
              <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything else the clinician should know." />
            </div>

            {phq9Result && (
              <div className="flex items-center gap-2">
                <Badge variant={mustRefer ? "destructive" : "secondary"}>PHQ-9: {phq9Result.totalScore} · {phq9Result.severityLevel}</Badge>
                {item9Flag && <Badge variant="destructive">Self-harm flag</Badge>}
              </div>
            )}

            {mustRefer && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Upward referral required</AlertTitle>
                <AlertDescription>Score ≥ 15 or self-harm thoughts reported. Please refer to a clinician or emergency centre.</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save & continue later
              </Button>
              <Button variant={mustRefer ? "destructive" : "default"} onClick={handleReferNow} disabled={saving || !pseudonym.trim()}>
                <ArrowUpRight className="h-4 w-4 mr-1" /> Refer Upward
              </Button>
              {!mustRefer && (
                <Button variant="secondary" onClick={handleComplete} disabled={saving}>Complete (no referral)</Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const StepBadge = ({ n, label, active, done, onClick }: { n: number; label: string; active: boolean; done: boolean; onClick: () => void }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1 group">
    <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border ${
      active ? "bg-primary text-primary-foreground border-primary" :
      done ? "bg-primary/20 text-primary border-primary/40" : "bg-muted text-muted-foreground border-border"
    }`}>{n}</span>
    <span className={`text-[11px] ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
  </button>
);
