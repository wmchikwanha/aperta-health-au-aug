import { useState, useCallback, useMemo } from "react";
import { Stethoscope, ChevronRight, ChevronLeft, Check, AlertTriangle, ShieldCheck, Loader2, Phone, Mail, Globe, Mic, MicOff, Upload, FileText, Copy, KeyRound, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/Footer";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import { getStrings, isRTL, SELF_ASSESS_LANGS, SELF_ASSESS_LANGUAGE_NAMES } from '../lib/i18n';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Australian crisis numbers — digits never localise; labels come from i18n strings.
const CRISIS_NUMBERS_RAW: Array<{ key: keyof ReturnType<typeof getStrings>["crisis"]["numbers"]; number: string }> = [
  { key: "lifeline", number: "13 11 14" },
  { key: "yarn", number: "13 92 76" },
  { key: "suicide", number: "1300 659 467" },
  { key: "respect", number: "1800 737 732" },
  { key: "emergency", number: "000" },
];

const CONSENT_KEYS: Array<{ type: string; itemKey: keyof ReturnType<typeof getStrings>["consent"]["items"]; required: boolean }> = [
  { type: "screening_disclaimer", itemKey: "screening", required: true },
  { type: "data_sharing", itemKey: "data", required: true },
  { type: "emergency_understanding", itemKey: "emergency", required: true },
  { type: "voluntary_participation", itemKey: "voluntary", required: true },
  { type: "age_confirmation", itemKey: "age", required: true },
  { type: "research_opt_in", itemKey: "research", required: false },
];

const REGIONS = [
  { value: "nsw", label: "New South Wales (NSW)" },
  { value: "vic", label: "Victoria (VIC)" },
  { value: "qld", label: "Queensland (QLD)" },
  { value: "wa",  label: "Western Australia (WA)" },
  { value: "sa",  label: "South Australia (SA)" },
  { value: "tas", label: "Tasmania (TAS)" },
  { value: "act", label: "Australian Capital Territory (ACT)" },
  { value: "nt",  label: "Northern Territory (NT)" },
];

const AGE_BANDS = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const GENDERS: Array<{ value: string; key: keyof ReturnType<typeof getStrings>["demographics"]["genderOptions"] }> = [
  { value: "male", key: "male" },
  { value: "female", key: "female" },
  { value: "non-binary", key: "nonbinary" },
  { value: "prefer_not_to_say", key: "prefer" },
];

type Step = "welcome" | "consent" | "demographics" | "screening" | "narrative" | "completing" | "result";

async function callApi(body: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/self-assess`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function SelfAssess() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("welcome");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string>("");
  const [verificationPin, setVerificationPin] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [crisisDetected, setCrisisDetected] = useState(false);

  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [ageBand, setAgeBand] = useState("");
  const [gender, setGender] = useState("");
  const [region, setRegion] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("en");

  const [phq9Responses, setPhq9Responses] = useState<Record<number, number>>({});

  const [narrativeText, setNarrativeText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const [resultData, setResultData] = useState<any>(null);

  const t = useMemo(() => getStrings(preferredLanguage), [preferredLanguage]);
  const rtl = isRTL(preferredLanguage);
  const Forward = rtl ? ChevronLeft : ChevronRight;
  const Backward = rtl ? ChevronRight : ChevronLeft;

  const totalSteps = 5;
  const stepIndex = { welcome: 0, consent: 1, demographics: 2, screening: 3, narrative: 4, completing: 4, result: 5 };
  const progress = (stepIndex[step] / totalSteps) * 100;

  const startSession = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callApi({ action: "start", language_code: preferredLanguage });
      setSessionToken(data.session.session_token);
      setReferralCode(data.session.referral_code || "");
      setVerificationPin(data.verification_pin || "");
      setStep("consent");
    } catch (e: any) {
      toast({ title: t.common.errorTitle, description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [preferredLanguage, toast, t]);

  const saveConsents = useCallback(async () => {
    const requiredMissing = CONSENT_KEYS.filter(c => c.required && !consents[c.type]);
    if (requiredMissing.length > 0) {
      toast({ title: t.consent.requiredTitle, description: t.consent.requiredDesc, variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const consentRows = CONSENT_KEYS.map(c => ({
        consent_type: c.type,
        granted: !!consents[c.type],
        consent_text_version: "1.0",
      }));
      await callApi({ action: "save_consents", session_token: sessionToken, consents: consentRows });
      setStep("demographics");
    } catch (e: any) {
      toast({ title: t.common.errorTitle, description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [consents, sessionToken, toast, t]);

  const saveDemographics = useCallback(async () => {
    if (!ageBand || !gender || !region) {
      toast({ title: t.demographics.requiredTitle, description: t.demographics.requiredDesc, variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await callApi({
        action: "save_demographics",
        session_token: sessionToken,
        demographics: { age_band: ageBand, gender, preferred_language: preferredLanguage },
        location_region: region,
      });
      setStep("screening");
    } catch (e: any) {
      toast({ title: t.common.errorTitle, description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [ageBand, gender, region, preferredLanguage, sessionToken, toast, t]);

  const saveScreening = useCallback(async () => {
    if (Object.keys(phq9Responses).length < 9) {
      toast({ title: t.phq9.incompleteTitle, description: t.phq9.incompleteDesc, variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const totalScore = Object.values(phq9Responses).reduce((a, b) => a + b, 0);
      const q9Score = phq9Responses[8] || 0;
      const isCrisis = q9Score >= 1;

      let severityLevel = "minimal";
      if (totalScore >= 20) severityLevel = "severe";
      else if (totalScore >= 15) severityLevel = "moderately_severe";
      else if (totalScore >= 10) severityLevel = "moderate";
      else if (totalScore >= 5) severityLevel = "mild";

      const itemFlags: any = {};
      if (isCrisis) {
        itemFlags.suicidal_ideation = true;
        itemFlags.immediate_review = true;
        itemFlags.q9_score = q9Score;
      }

      const result = await callApi({
        action: "save_screening",
        session_token: sessionToken,
        tool_type: "PHQ-9",
        responses: phq9Responses,
        total_score: totalScore,
        severity_level: severityLevel,
        interpretation: `PHQ-9 score: ${totalScore}/27 (${severityLevel})`,
        item_flags: itemFlags,
      });

      if (result.crisis || isCrisis) {
        setCrisisDetected(true);
      }
      setStep("narrative");
    } catch (e: any) {
      toast({ title: t.common.errorTitle, description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [phq9Responses, sessionToken, toast, t]);

  const completeAssessment = useCallback(async () => {
    setLoading(true);
    setStep("completing");
    try {
      if (narrativeText.trim()) {
        await callApi({ action: "save_narrative", session_token: sessionToken, narrative_text: narrativeText });
      }
      const result = await callApi({ action: "complete", session_token: sessionToken });
      setResultData(result);
      setStep("result");
    } catch (e: any) {
      toast({ title: t.common.errorTitle, description: e.message, variant: "destructive" });
      setStep("narrative");
    } finally {
      setLoading(false);
    }
  }, [narrativeText, sessionToken, toast, t]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(tr => tr.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(",")[1];
          try {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/transcribe-audio`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}` },
              body: JSON.stringify({ audio: base64, languageCode: preferredLanguage }),
            });
            const data = await res.json();
            if (data.text) {
              setNarrativeText(prev => prev ? `${prev}\n\n${data.text}` : data.text);
            }
          } catch {
            toast({ title: t.common.errorTitle, variant: "destructive" });
          }
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch {
      toast({ title: t.common.errorTitle, variant: "destructive" });
    }
  }, [preferredLanguage, toast, t]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  }, [mediaRecorder]);

  const handleDocumentUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain"];
    if (!allowedTypes.includes(file.type)) return;

    if (file.type === "text/plain") {
      const text = await file.text();
      setNarrativeText(prev => prev ? `${prev}\n\n--- ${file.name} ---\n${text}` : text);
      return;
    }

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const res = await fetch(`${SUPABASE_URL}/functions/v1/process-document`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}` },
          body: JSON.stringify({ document: base64, fileName: file.name, mimeType: file.type }),
        });
        const data = await res.json();
        if (data.text) {
          setNarrativeText(prev => prev ? `${prev}\n\n--- ${file.name} ---\n${data.text}` : data.text);
        }
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast({ title: t.common.errorTitle, variant: "destructive" });
      setLoading(false);
    }
  }, [toast, t]);

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={rtl ? "rtl" : "ltr"} lang={preferredLanguage}>
      <header className="bg-card border-b px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Aperta Health</h1>
              <p className="text-xs text-muted-foreground">{t.header.subtitle}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">{t.header.confidential}</Badge>
        </div>
      </header>

      {step !== "welcome" && step !== "result" && (
        <div className="max-w-3xl mx-auto w-full px-6 pt-4">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1 text-end">
            {formatStepOf(t.progress.stepOf, stepIndex[step], totalSteps)}
          </p>
        </div>
      )}

      {crisisDetected && (
        <div className="max-w-3xl mx-auto w-full px-6 mt-4">
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive text-sm">{t.crisis.heading}</p>
                <div className="mt-2 space-y-1">
                  {CRISIS_NUMBERS_RAW.map((c) => (
                    <p key={c.number} className="text-sm">
                      <strong>{t.crisis.numbers[c.key]}:</strong>{" "}
                      <a href={`tel:${c.number.replace(/\s/g, "")}`} className="text-destructive underline font-mono" dir="ltr">{c.number}</a>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        {step === "welcome" && (
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">{t.welcome.title}</CardTitle>
              <CardDescription className="text-base mt-2">{t.welcome.subtitle}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-accent/30 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-sm">{t.welcome.expectHeading}</h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  {t.welcome.expect.map((line, i) => <li key={i}>{line}</li>)}
                </ul>
              </div>

              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm font-medium text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {t.welcome.notEmergencyTitle}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{t.welcome.notEmergencyBody}</p>
                <div className="mt-2 space-y-1">
                  {CRISIS_NUMBERS_RAW.slice(0, 2).map((c) => (
                    <p key={c.number} className="text-xs">
                      <strong>{t.crisis.numbers[c.key]}:</strong>{" "}
                      <a href={`tel:${c.number.replace(/\s/g, "")}`} className="text-destructive underline" dir="ltr">{c.number}</a>
                    </p>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t.welcome.languageLabel}</Label>
                <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.filter(l => l.code !== "mixed").map(l => (
                      <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={startSession} disabled={loading} className="w-full" size="lg">
                {loading ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : null}
                {t.welcome.startButton}
                <Forward className="w-4 h-4 ms-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "consent" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                {t.consent.title}
              </CardTitle>
              <CardDescription>{t.consent.subtitle}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {CONSENT_KEYS.map((item) => (
                <div key={item.type} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/20 transition-colors">
                  <Checkbox
                    id={item.type}
                    checked={!!consents[item.type]}
                    onCheckedChange={(c) => setConsents(prev => ({ ...prev, [item.type]: !!c }))}
                  />
                  <Label htmlFor={item.type} className="text-sm leading-relaxed cursor-pointer flex-1">
                    {t.consent.items[item.itemKey]}
                    {item.required && <span className="text-destructive ms-1">*</span>}
                  </Label>
                </div>
              ))}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep("welcome")}>
                  <Backward className="w-4 h-4 me-1" /> {t.consent.back}
                </Button>
                <Button onClick={saveConsents} disabled={loading} className="flex-1">
                  {loading ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : null}
                  {t.consent.agree}
                  <Forward className="w-4 h-4 ms-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "demographics" && (
          <Card>
            <CardHeader>
              <CardTitle>{t.demographics.title}</CardTitle>
              <CardDescription>{t.demographics.subtitle}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t.demographics.ageLabel} <span className="text-destructive">*</span></Label>
                <Select value={ageBand} onValueChange={setAgeBand}>
                  <SelectTrigger><SelectValue placeholder={t.demographics.agePlaceholder} /></SelectTrigger>
                  <SelectContent>
                    {AGE_BANDS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t.demographics.genderLabel} <span className="text-destructive">*</span></Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger><SelectValue placeholder={t.demographics.genderPlaceholder} /></SelectTrigger>
                  <SelectContent>
                    {GENDERS.map(g => <SelectItem key={g.value} value={g.value}>{t.demographics.genderOptions[g.key]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t.demographics.regionLabel} <span className="text-destructive">*</span></Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger><SelectValue placeholder={t.demographics.regionPlaceholder} /></SelectTrigger>
                  <SelectContent>
                    {REGIONS.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep("consent")}>
                  <Backward className="w-4 h-4 me-1" /> {t.demographics.back}
                </Button>
                <Button onClick={saveDemographics} disabled={loading} className="flex-1">
                  {loading ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : null}
                  {t.demographics.next}
                  <Forward className="w-4 h-4 ms-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "screening" && (
          <Card>
            <CardHeader>
              <CardTitle>{t.phq9.title}</CardTitle>
              <CardDescription>{t.phq9.subtitle}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {t.phq9.questions.map((q, i) => (
                <div key={i} className="space-y-2">
                  <Label className="text-sm font-medium">
                    {i + 1}. {q}
                    {i === 8 && <Badge variant="outline" className="ms-2 text-xs">{t.phq9.safetyBadge}</Badge>}
                  </Label>
                  <RadioGroup
                    value={phq9Responses[i]?.toString()}
                    onValueChange={(v) => setPhq9Responses(prev => ({ ...prev, [i]: parseInt(v) }))}
                    className="flex flex-wrap gap-2"
                  >
                    {t.phq9.likert.map((label, val) => (
                      <div key={val} className="flex items-center">
                        <RadioGroupItem value={val.toString()} id={`q${i}-${val}`} className="peer sr-only" />
                        <Label
                          htmlFor={`q${i}-${val}`}
                          className="px-3 py-2 rounded-md border text-xs cursor-pointer peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground peer-data-[state=checked]:border-primary hover:bg-accent transition-colors"
                        >
                          {label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep("demographics")}>
                  <Backward className="w-4 h-4 me-1" /> {t.phq9.back}
                </Button>
                <Button onClick={saveScreening} disabled={loading} className="flex-1">
                  {loading ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : null}
                  {t.phq9.next}
                  <Forward className="w-4 h-4 ms-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "narrative" && (
          <Card>
            <CardHeader>
              <CardTitle>{t.narrative.title}</CardTitle>
              <CardDescription>{t.narrative.subtitle}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={narrativeText}
                onChange={(e) => setNarrativeText(e.target.value)}
                placeholder={t.narrative.placeholder}
                rows={6}
                className="resize-y"
              />

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant={isRecording ? "destructive" : "outline"} size="sm" onClick={isRecording ? stopRecording : startRecording}>
                  {isRecording ? <MicOff className="w-4 h-4 me-1" /> : <Mic className="w-4 h-4 me-1" />}
                  {isRecording ? t.narrative.stop : t.narrative.speak}
                </Button>

                <Label htmlFor="doc-upload" className="cursor-pointer">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="w-4 h-4 me-1" />
                      {t.narrative.upload}
                    </span>
                  </Button>
                </Label>
                <Input id="doc-upload" type="file" className="hidden" accept=".pdf,.txt,.jpg,.jpeg,.png,.webp" onChange={handleDocumentUpload} />
              </div>

              <p className="text-xs text-muted-foreground">{t.narrative.accepted}</p>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep("screening")}>
                  <Backward className="w-4 h-4 me-1" /> {t.narrative.back}
                </Button>
                <Button onClick={completeAssessment} disabled={loading} className="flex-1">
                  {loading ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : null}
                  {narrativeText.trim() ? t.narrative.submit : t.narrative.skip}
                  <Forward className="w-4 h-4 ms-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "completing" && (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <h3 className="text-lg font-semibold">{t.completing.title}</h3>
              <p className="text-sm text-muted-foreground">{t.completing.subtitle}</p>
            </CardContent>
          </Card>
        )}

        {step === "result" && resultData && (
          <div className="space-y-6">
            {resultData.is_crisis ? (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6" />
                    {t.result.crisisTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm">{t.result.crisisBody}</p>
                  <div className="space-y-3">
                    {CRISIS_NUMBERS_RAW.map(c => (
                      <a
                        key={c.number}
                        href={`tel:${c.number.replace(/\s/g, "")}`}
                        className="flex items-center gap-3 p-3 rounded-lg border border-destructive/30 bg-card hover:bg-destructive/10 transition-colors"
                      >
                        <Phone className="w-5 h-5 text-destructive" />
                        <div>
                          <p className="font-semibold text-sm">{t.crisis.numbers[c.key]}</p>
                          <p className="text-destructive font-mono" dir="ltr">{c.number}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    <Check className="w-6 h-6" />
                    {t.result.completeTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{t.result.completeBody}</p>
                </CardContent>
              </Card>
            )}

            {resultData.facilities && resultData.facilities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t.result.nearbyTitle}</CardTitle>
                  <CardDescription>{t.result.nearbySubtitle}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {resultData.facilities.map((f: any, i: number) => (
                    <div key={i} className="p-4 rounded-lg border bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{f.name}</h4>
                        {f.emergency && <Badge variant="destructive" className="text-xs">{t.result.emergencyBadge}</Badge>}
                      </div>
                      {f.city && <p className="text-sm text-muted-foreground">{f.city}</p>}
                      <div className="flex flex-wrap gap-2 text-sm">
                        {f.phone && (
                          <a href={`tel:${f.phone}`} className="flex items-center gap-1 text-primary hover:underline">
                            <Phone className="w-3 h-3" /> {f.phone}
                          </a>
                        )}
                        {f.email && (
                          <a href={`mailto:${f.email}`} className="flex items-center gap-1 text-primary hover:underline">
                            <Mail className="w-3 h-3" /> {f.email}
                          </a>
                        )}
                        {f.website && (
                          <a href={f.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                            <Globe className="w-3 h-3" /> {t.result.websiteLabel}
                          </a>
                        )}
                      </div>
                      {f.services && f.services.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {f.services.map((s: string, j: number) => (
                            <Badge key={j} variant="secondary" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {resultData.facilities?.length === 0 && !resultData.is_crisis && (
              <Card>
                <CardContent className="py-8 text-center space-y-3">
                  <FileText className="w-10 h-10 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">{t.result.noFacilities}</p>
                  <div className="space-y-1 mt-4">
                    <p className="text-sm font-medium">{t.result.meantime}</p>
                    {CRISIS_NUMBERS_RAW.slice(0, 2).map(c => (
                      <p key={c.number} className="text-sm">
                        <strong>{t.crisis.numbers[c.key]}:</strong>{" "}
                        <a href={`tel:${c.number.replace(/\s/g, "")}`} className="text-primary underline" dir="ltr">{c.number}</a>
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {referralCode && verificationPin && (
              <Card className="border-2 border-primary/40 bg-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-primary" />
                    {t.result.refIdTitle}
                  </CardTitle>
                  <CardDescription>{t.result.refIdSubtitle}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-center">
                      <p className="text-xs uppercase text-muted-foreground tracking-wider mb-1">{t.result.refIdLabel}</p>
                      <p className="text-2xl font-mono font-bold text-primary tracking-widest break-all" dir="ltr">{referralCode}</p>
                      <Button variant="ghost" size="sm" className="mt-2 text-xs"
                        onClick={() => { navigator.clipboard.writeText(referralCode); toast({ title: t.result.copied }); }}>
                        <Copy className="w-3 h-3 me-1" /> {t.result.copy}
                      </Button>
                    </div>
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-center">
                      <p className="text-xs uppercase text-muted-foreground tracking-wider mb-1">{t.result.pinLabel}</p>
                      <p className="text-2xl font-mono font-bold text-primary tracking-widest" dir="ltr">{verificationPin}</p>
                      <Button variant="ghost" size="sm" className="mt-2 text-xs"
                        onClick={() => { navigator.clipboard.writeText(verificationPin); toast({ title: t.result.copied }); }}>
                        <Copy className="w-3 h-3 me-1" /> {t.result.copy}
                      </Button>
                    </div>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 text-sm">
                    <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1">{t.result.saveWarn}</p>
                    <p className="text-muted-foreground text-xs">{t.result.saveWarnBody}</p>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => window.open("/follow-up", "_blank")}>
                    <MessageCircle className="w-4 h-4 me-2" />
                    {t.result.checkStatus}
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.result.nextTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {[t.result.next1, t.result.next2, t.result.next3].map((line, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">{i + 1}</span>
                    </div>
                    <p>{line}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6 text-center space-y-3">
                <p className="text-sm font-medium text-foreground">{t.result.facilityCta}</p>
                <p className="text-xs text-muted-foreground">{t.result.facilityCtaBody}</p>
                <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground" onClick={() => window.location.href = "/facility"}>
                  {t.result.facilityCtaBtn}
                </Button>
              </CardContent>
            </Card>

            <div className="text-center">
              <Button variant="outline" onClick={() => window.location.href = "/"}>
                {t.result.home}
              </Button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
