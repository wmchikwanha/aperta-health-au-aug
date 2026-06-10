import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { getGenderLabel, getLanguageName } from "@/lib/languages";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Link2, Copy, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Patient {
  id: string;
  patient_identifier: string;
  age_band: string | null;
  gender: string | null;
  language_preference: string | null;
  cultural_background: string | null;
  created_at: string;
}

interface ActivityItem {
  id: string;
  type: "assessment" | "screening";
  label: string;
  detail: string;
  date: string;
  risk: "high" | "moderate" | "stable" | "none";
  badge?: string;
}

interface PatientHubProps {
  patient: Patient;
  onBack: () => void;
  onViewProfile: () => void;
  onStartAssessment: () => void;
  onStartScreening: () => void;
  onStartFirstAid: () => void;
}

const AGE_BAND_LABELS: Record<string, string> = {
  under_18: "Under 18",
  "18-25": "18–25",
  "26-35": "26–35",
  "36-45": "36–45",
  "46-55": "46–55",
  "56-65": "56–65",
  over_65: "Over 65",
};

function getInitials(identifier: string) {
  const parts = identifier.split(/[-_\s]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return identifier.slice(0, 2).toUpperCase();
}

function riskFromLevel(level: string | null): ActivityItem["risk"] {
  const l = (level ?? "").toLowerCase();
  if (l.includes("high") || l.includes("critical") || l.includes("severe")) return "high";
  if (l.includes("mod") || l.includes("moderate")) return "moderate";
  if (l.includes("low") || l.includes("stable") || l.includes("mild")) return "stable";
  return "none";
}

export const PatientHub = ({
  patient,
  onBack,
  onViewProfile,
  onStartAssessment,
  onStartScreening,
  onStartFirstAid,
}: PatientHubProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [assessmentCount, setAssessmentCount] = useState(0);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkTier, setLinkTier] = useState("basic");
  const [generatedLink, setGeneratedLink] = useState("");
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const generateIntakeLink = useCallback(async () => {
    if (!user) return;
    setIsGeneratingLink(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-intake-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ action: "generate_link", patient_id: patient.id, clinician_id: user.id, tier: linkTier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const link = `${window.location.origin}/intake/${data.token}`;
      setGeneratedLink(link);
      toast({ title: "Link Generated", description: "Share this link with your patient." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setIsGeneratingLink(false); }
  }, [user, patient.id, linkTier, toast]);

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    toast({ title: "Copied", description: "Link copied to clipboard." });
  };

  useEffect(() => {
    const fetchActivity = async () => {
      const [assessmentsRes, screeningsRes, countRes] = await Promise.all([
        supabase
          .from("assessments")
          .select("id, assessment_date, risk_level, language_detected")
          .eq("patient_id", patient.id)
          .order("assessment_date", { ascending: false })
          .limit(4),
        supabase
          .from("screening_assessments")
          .select("id, tool_type, administered_at, severity_level, total_score")
          .eq("patient_id", patient.id)
          .order("administered_at", { ascending: false })
          .limit(4),
        supabase
          .from("assessments")
          .select("id", { count: "exact", head: true })
          .eq("patient_id", patient.id),
      ]);

      setAssessmentCount(countRes.count ?? 0);

      const items: ActivityItem[] = [
        ...(assessmentsRes.data ?? []).map((a) => ({
          id: a.id,
          type: "assessment" as const,
          label: "Assessment",
          detail: [
            a.language_detected ? `${a.language_detected} narrative` : null,
            a.risk_level ? `Risk: ${a.risk_level}` : null,
          ]
            .filter(Boolean)
            .join(" · ") || "MSE completed",
          date: a.assessment_date,
          risk: riskFromLevel(a.risk_level),
          badge: a.risk_level ?? undefined,
        })),
        ...(screeningsRes.data ?? []).map((s) => ({
          id: s.id,
          type: "screening" as const,
          label: "Screening",
          detail: `${s.tool_type}: ${s.total_score}${s.severity_level ? ` · ${s.severity_level}` : ""}`,
          date: s.administered_at,
          risk: riskFromLevel(s.severity_level),
          badge: s.severity_level ?? undefined,
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 6);

      setActivity(items);
    };

    fetchActivity();
  }, [patient.id]);

  const metaParts = [
    patient.age_band ? AGE_BAND_LABELS[patient.age_band] ?? patient.age_band : null,
    patient.gender ? getGenderLabel(patient.gender) : null,
    patient.language_preference ? getLanguageName(patient.language_preference) : null,
    patient.cultural_background ?? null,
  ].filter(Boolean);

  const dotColor: Record<ActivityItem["risk"], string> = {
    high:     "bg-destructive shadow-[0_0_6px_rgba(192,57,43,0.5)]",
    moderate: "bg-warning shadow-[0_0_6px_rgba(180,83,9,0.4)]",
    stable:   "bg-clinical-green shadow-[0_0_6px_rgba(26,107,74,0.4)]",
    none:     "bg-text-3",
  };

  const badgeVariant = (risk: ActivityItem["risk"]): "destructive" | "secondary" | "outline" =>
    risk === "high" ? "destructive" : risk === "moderate" ? "secondary" : "outline";

  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {/* ── Breadcrumb ─────────────────────────────── */}
      <div className="flex items-center gap-1.5 text-sm text-text-3">
        <button onClick={onBack} className="hover:text-foreground transition-colors">
          Patients
        </button>
        <span className="opacity-50">/</span>
        <span className="text-foreground font-semibold font-mono">{patient.patient_identifier}</span>
      </div>

      {/* ── Hub header ─────────────────────────────── */}
      <div className="flex items-start gap-5">
        {/* Avatar */}
        <div
          className="w-[60px] h-[60px] rounded-[14px] flex items-center justify-center flex-shrink-0 border border-clinical-green/20 shadow-[0_2px_8px_rgba(26,107,74,0.12)]"
          style={{ background: "linear-gradient(135deg,#d1fae5,#a7f3d0)" }}
        >
          <span className="font-mono text-base font-medium text-clinical-green-dark">
            {getInitials(patient.patient_identifier)}
          </span>
        </div>

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <h2 className="font-mono text-2xl font-semibold tracking-tight leading-none">
            {patient.patient_identifier}
          </h2>
          {metaParts.length > 0 && (
            <p className="text-sm text-text-2 mt-1.5 font-light">
              {metaParts.join(" · ")}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {assessmentCount > 0 && (
              <Badge variant="secondary" className="font-mono text-xs">
                {assessmentCount} assessment{assessmentCount !== 1 ? "s" : ""}
              </Badge>
            )}
            <Badge variant="outline" className="font-mono text-xs">
              Active since {format(new Date(patient.created_at), "MMM yyyy")}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={onViewProfile}>
            Full Profile
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowLinkDialog(true)} className="gap-1">
            <Link2 className="h-3.5 w-3.5" /> Pre-Register
          </Button>
        </div>
      </div>

      {/* ── Action grid (3 columns) ─────────────────── */}
      <div>
        <p className="text-[10px] font-mono font-medium text-text-3 uppercase tracking-widest mb-3">
          Clinical Actions
        </p>
        <div className="grid grid-cols-3 gap-3">
          {/* Assessment */}
          <ActionCard
            onClick={onStartAssessment}
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="hsl(var(--clinical-green))" strokeWidth="1.5">
                <rect x="3" y="2" width="14" height="16" rx="2"/>
                <path d="M7 7h6M7 10h6M7 13h4"/>
              </svg>
            }
            title="Assessment"
            desc="Voice or text narrative → MSE, diagnosis, treatment plan"
            variant="default"
          />

          {/* Screening */}
          <ActionCard
            onClick={onStartScreening}
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="hsl(var(--clinical-green))" strokeWidth="1.5">
                <circle cx="10" cy="10" r="7"/>
                <path d="M10 6v8M6 10h8"/>
              </svg>
            }
            title="Screening"
            desc="PHQ-9 · GAD-7 · PCL-5 · MMSE · PSQ · PRIME-R-5"
            variant="default"
          />

          {/* First Aid */}
          <ActionCard
            onClick={onStartFirstAid}
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="hsl(var(--destructive))" strokeWidth="1.5">
                <path d="M10 2l8 14H2L10 2z"/>
                <path d="M10 8v4M10 14h.01" strokeLinecap="round"/>
              </svg>
            }
            title="First Aid"
            desc="Crisis intervention · WHO mhGAP protocols"
            variant="crisis"
          />
        </div>
      </div>

      {/* ── Timeline ────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-mono font-medium text-text-3 uppercase tracking-widest mb-3">
          Patient Record
        </p>

        {activity.length > 0 ? (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            {activity.map((item, i) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-start gap-3 px-5 py-4",
                  i < activity.length - 1 && "border-b border-border"
                )}
              >
                {/* Dot */}
                <div className="flex flex-col items-center w-2 mt-1.5 flex-shrink-0">
                  <div className={cn("w-2 h-2 rounded-full flex-shrink-0", dotColor[item.risk])} />
                </div>

                {/* Date */}
                <span className="font-mono text-[11px] text-text-3 w-20 flex-shrink-0 pt-px">
                  {format(new Date(item.date), "dd MMM yyyy")}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-sm font-semibold text-foreground leading-tight">
                    {item.label}
                  </p>
                  <p className="text-xs text-text-3 font-light mt-0.5 leading-relaxed">
                    {item.detail}
                  </p>
                </div>

                {/* Badge */}
                {item.badge && item.risk !== "none" && (
                  <Badge variant={badgeVariant(item.risk)} className="text-xs capitalize flex-shrink-0">
                    {item.badge}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl px-5 py-10 text-center shadow-sm">
            <p className="text-sm text-text-3 font-light">
              No activity yet — select an action above to get started.
            </p>
          </div>
        )}
      </div>

      {/* ── Send Pre-Registration Link Dialog ────────── */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Pre-Registration Link</DialogTitle>
            <DialogDescription>
              Generate a secure link for <strong>{patient.patient_identifier}</strong> to complete intake from home.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Intake Tier</Label>
              <Select value={linkTier} onValueChange={setLinkTier}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic — Demographics + PHQ-9</SelectItem>
                  <SelectItem value="standard">Standard — + GAD-7, Narrative, AI Summary</SelectItem>
                  <SelectItem value="comprehensive">Comprehensive — Full battery + Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!generatedLink ? (
              <Button onClick={generateIntakeLink} disabled={isGeneratingLink} className="w-full">
                {isGeneratingLink ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                Generate Link
              </Button>
            ) : (
              <div className="space-y-2">
                <Label>Share this link with your patient</Label>
                <div className="flex gap-2">
                  <Input value={generatedLink} readOnly className="text-xs font-mono" />
                  <Button variant="outline" size="icon" onClick={copyLink}><Copy className="h-4 w-4" /></Button>
                </div>
                <p className="text-xs text-muted-foreground">This link expires in 72 hours and can only be used once.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ── Action card sub-component ──────────────────── */
function ActionCard({
  onClick,
  icon,
  title,
  desc,
  variant,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
  variant: "default" | "crisis";
}) {
  const isCrisis = variant === "crisis";
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative text-left p-6 rounded-xl border bg-card shadow-sm transition-all duration-200 group overflow-hidden",
        isCrisis
          ? "border-destructive/20 hover:border-destructive/40 hover:shadow-[0_12px_40px_rgba(192,57,43,0.10),0_2px_8px_rgba(192,57,43,0.06)]"
          : "border-border hover:border-clinical-green/30 hover:shadow-lg hover:-translate-y-0.5"
      )}
    >
      {/* Icon wrap */}
      <div
        className={cn(
          "w-10 h-10 rounded-[10px] flex items-center justify-center mb-4 border",
          isCrisis
            ? "bg-destructive/7 border-destructive/20"
            : "bg-clinical-green/8 border-clinical-green/20"
        )}
      >
        {icon}
      </div>

      {/* Text */}
      <p className={cn(
        "font-serif text-[15px] font-semibold mb-1.5",
        isCrisis ? "text-destructive" : "text-foreground"
      )}>
        {title}
      </p>
      <p className="text-xs text-text-3 font-light leading-relaxed">{desc}</p>

      {/* Hover arrow */}
      <span className={cn(
        "absolute top-5 right-4 text-sm opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0",
        isCrisis ? "text-destructive" : "text-text-3"
      )}>
        →
      </span>
    </button>
  );
}
