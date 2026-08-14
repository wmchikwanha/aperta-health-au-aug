import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/Footer";
import {
  Loader2,
  Stethoscope,
  HeartPulse,
  Users,
  ShieldCheck,
  ArrowRight,
  FileJson,
  Building2,
  ClipboardList,
} from "lucide-react";

const DEMO_PASSWORD = "AhpertaDemo2026!";

type DemoRole = {
  key: string;
  role: string;
  email: string;
  name: string;
  title: string;
  subtitle: string;
  bullets: string[];
  home: string;
  icon: typeof Stethoscope;
};

const DEMO_ROLES: DemoRole[] = [
  {
    key: "psychiatrist",
    role: "psychiatrist",
    email: "demo.psychiatrist@aperta.health",
    name: "Dr Demo Psychiatrist",
    title: "Psychiatrist / Clinical Psychologist",
    subtitle: "Full clinical workspace",
    bullets: ["Narrative → MSE", "Diagnostics (ICD-10 / DSM-5-TR)", "Treatment plans & MBS items"],
    home: "/",
    icon: Stethoscope,
  },
  {
    key: "clinical_nurse",
    role: "clinical_nurse",
    email: "demo.nurse@aperta.health",
    name: "Demo Refugee Health Nurse",
    title: "Refugee Health Nurse",
    subtitle: "Screening & triage",
    bullets: ["RHS-15, HTQ-IV, WHODAS 2.0", "Crisis protocols", "View-only diagnostics"],
    home: "/",
    icon: HeartPulse,
  },
  {
    key: "chw",
    role: "chw",
    email: "demo.bicultural@aperta.health",
    name: "Demo Bicultural Worker",
    title: "Bicultural Worker",
    subtitle: "Community first contact",
    bullets: ["In-language sessions", "Auto English translation", "Upward referral to clinician"],
    home: "/chw",
    icon: Users,
  },
  {
    key: "admin",
    role: "admin",
    email: "demo.admin@aperta.health",
    name: "Demo Service Administrator",
    title: "Service Administrator",
    subtitle: "Oversight & governance",
    bullets: ["Team & seat management", "Audit trail monitoring", "Analytics dashboard"],
    home: "/",
    icon: ShieldCheck,
  },
];

const DemoEntry = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [busy, setBusy] = useState<string | null>(null);

  const inviteToken = searchParams.get("invite");

  useEffect(() => {
    if (inviteToken) navigate(`/auth/signin?invite=${inviteToken}`, { replace: true });
  }, [inviteToken, navigate]);

  const enterAs = async (demo: DemoRole) => {
    setBusy(demo.key);
    try {
      const { data: current } = await supabase.auth.getSession();
      if (current.session) await supabase.auth.signOut();

      let { error } = await supabase.auth.signInWithPassword({
        email: demo.email,
        password: DEMO_PASSWORD,
      });

      if (error) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: demo.email,
          password: DEMO_PASSWORD,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: demo.name, role: demo.role },
          },
        });
        if (signUpError && !/already/i.test(signUpError.message)) throw signUpError;

        const retry = await supabase.auth.signInWithPassword({
          email: demo.email,
          password: DEMO_PASSWORD,
        });
        if (retry.error) throw retry.error;
      }

      toast({ title: `Signed in as ${demo.title}`, description: "Demo workspace ready." });
      navigate(demo.home, { replace: true });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Could not open the demo workspace",
        description: e?.message ?? "Please try again.",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="relative flex-1">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 pointer-events-none" />
        <div className="relative container mx-auto px-4 py-12 md:py-16 max-w-6xl">
          <header className="text-center space-y-4 mb-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Live demonstration — no sign-up required
            </span>
            <h1 className="text-4xl md:text-5xl font-bold font-display tracking-tight">
              Aperta Health
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Culturally responsive mental health decision support for refugee and CALD communities.
              Choose a role below to step straight into that workspace.
            </p>
            <p className="text-[11px] text-muted-foreground italic max-w-xl mx-auto">
              We acknowledge the Traditional Owners of the lands on which this tool is used and pay
              our respects to Elders past, present and emerging.
            </p>
          </header>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {DEMO_ROLES.map((demo) => {
              const Icon = demo.icon;
              const loading = busy === demo.key;
              return (
                <Card
                  key={demo.key}
                  className="group relative overflow-hidden border-border/70 hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-0.5"
                >
                  <CardContent className="p-5 flex flex-col h-full gap-4">
                    <div className="flex items-start justify-between">
                      <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{demo.subtitle}</Badge>
                    </div>
                    <div className="space-y-1">
                      <h2 className="font-semibold leading-tight">{demo.title}</h2>
                      <ul className="text-xs text-muted-foreground space-y-1 pt-1">
                        {demo.bullets.map((b) => (
                          <li key={b} className="flex gap-1.5">
                            <span className="text-primary">•</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Button
                      className="w-full mt-auto"
                      onClick={() => enterAs(demo)}
                      disabled={busy !== null}
                    >
                      {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="mr-2 h-4 w-4" />
                      )}
                      Enter workspace
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <Link
              to="/self-assess"
              className="rounded-lg border bg-card p-4 hover:border-primary/50 transition-colors flex items-start gap-3"
            >
              <ClipboardList className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm">
                <span className="block font-medium">Patient self-assessment</span>
                <span className="text-muted-foreground text-xs">18 languages, RTL supported</span>
              </span>
            </Link>
            <Link
              to="/facility"
              className="rounded-lg border bg-card p-4 hover:border-primary/50 transition-colors flex items-start gap-3"
            >
              <Building2 className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm">
                <span className="block font-medium">Facility portal</span>
                <span className="text-muted-foreground text-xs">Pilot onboarding & referrals</span>
              </span>
            </Link>
            <Link
              to="/fhir-sandbox"
              className="rounded-lg border bg-card p-4 hover:border-primary/50 transition-colors flex items-start gap-3"
            >
              <FileJson className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm">
                <span className="block font-medium">FHIR R4 sandbox</span>
                <span className="text-muted-foreground text-xs">Export sample bundles</span>
              </span>
            </Link>
          </div>

          <p className="mt-10 text-center text-xs text-muted-foreground">
            Demonstration environment — use non-identifiable test data only.{" "}
            <Link to="/auth/signin" className="text-primary hover:underline">
              Staff sign in
            </Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default DemoEntry;
