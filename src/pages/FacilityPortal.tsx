import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Footer } from "@/components/Footer";
import { FacilityDashboard } from "@/components/FacilityDashboard";
import { NotificationBell } from "@/components/NotificationBell";
import {
  Building2, LogOut, Loader2, Clock, CheckCircle2, XCircle, Stethoscope,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

const REGIONS = [
  { value: "harare", label: "Harare" },
  { value: "bulawayo", label: "Bulawayo" },
  { value: "manicaland", label: "Manicaland" },
  { value: "mashonaland_central", label: "Mashonaland Central" },
  { value: "mashonaland_east", label: "Mashonaland East" },
  { value: "mashonaland_west", label: "Mashonaland West" },
  { value: "masvingo", label: "Masvingo" },
  { value: "matabeleland_north", label: "Matabeleland North" },
  { value: "matabeleland_south", label: "Matabeleland South" },
  { value: "midlands", label: "Midlands" },
  { value: "gauteng", label: "Gauteng (SA)" },
  { value: "western_cape", label: "Western Cape (SA)" },
  { value: "kwazulu_natal", label: "KwaZulu-Natal (SA)" },
  { value: "limpopo", label: "Limpopo (SA)" },
  { value: "other_za", label: "Other (South Africa)" },
  { value: "botswana", label: "Botswana" },
  { value: "zambia", label: "Zambia" },
  { value: "mozambique", label: "Mozambique" },
  { value: "other", label: "Other" },
];

const SERVICE_OPTIONS = [
  "Inpatient psychiatry",
  "Outpatient clinics",
  "Emergency psychiatric assessment",
  "Crisis stabilisation",
  "Community mental health",
  "Counselling",
  "Psychotherapy",
  "Substance use treatment",
  "Child & adolescent services",
  "Forensic services",
  "Rehabilitation",
  "Neuropsychiatry",
];

type PortalView = "auth" | "pending" | "rejected" | "dashboard" | "register";

export default function FacilityPortal() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [view, setView] = useState<PortalView>("auth");
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [facilityData, setFacilityData] = useState<any>(null);

  // Registration form
  const [regName, setRegName] = useState("");
  const [regRegion, setRegRegion] = useState("");
  const [regCity, setRegCity] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regWebsite, setRegWebsite] = useState("");
  const [regServices, setRegServices] = useState<string[]>([]);
  const [regEmergency, setRegEmergency] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkFacilityStatus(session.user.id);
      } else {
        setView("auth");
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkFacilityStatus(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkFacilityStatus = async (userId: string) => {
    setLoading(true);
    try {
      // Check if user has a facility link
      const { data: facilityUser } = await supabase
        .from("facility_users")
        .select("facility_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!facilityUser) {
        setView("register");
        setLoading(false);
        return;
      }

      setFacilityId(facilityUser.facility_id);

      // Get facility details
      const { data: facility } = await supabase
        .from("facilities")
        .select("*")
        .eq("id", facilityUser.facility_id)
        .single();

      if (!facility) {
        setView("register");
        setLoading(false);
        return;
      }

      setFacilityData(facility);

      if (facility.approval_status === "approved") {
        setView("dashboard");
      } else if (facility.approval_status === "rejected") {
        setView("rejected");
      } else {
        setView("pending");
      }
    } catch (e) {
      console.error("Error checking facility status:", e);
      setView("register");
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthLoading(true);
    const formData = new FormData(e.currentTarget);
    const fullName = formData.get("fullName") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!fullName || !email || !password) {
      toast({ variant: "destructive", title: "Missing fields", description: "Please fill in all fields" });
      setAuthLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/facility`,
        data: { full_name: fullName },
      },
    });

    setAuthLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Sign up failed", description: error.message });
    } else {
      toast({ title: "Account created!", description: "Please check your email to verify, then sign in." });
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Sign in failed", description: error.message });
    }
  };

  const handleRegisterFacility = async () => {
    if (!regName || !regRegion || !regCity) {
      toast({ variant: "destructive", title: "Required fields", description: "Facility name, region, and city are required." });
      return;
    }
    if (!user) return;

    setAuthLoading(true);
    try {
      // Create the facility
      const { data: facility, error: facError } = await supabase
        .from("facilities")
        .insert({
          facility_name: regName,
          region: regRegion,
          city: regCity,
          contact_phone: regPhone || null,
          contact_email: regEmail || null,
          website: regWebsite || null,
          services_offered: regServices,
          emergency_capable: regEmergency,
          registered_by: user.id,
          approval_status: "pending",
          is_active: false,
          accepts_referrals: false,
        })
        .select("id")
        .single();

      if (facError) throw facError;

      // Link user to facility
      const { error: linkError } = await supabase
        .from("facility_users")
        .insert({
          user_id: user.id,
          facility_id: facility.id,
          is_owner: true,
        });

      if (linkError) throw linkError;

      // Assign facility_admin role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: "facility_admin" as any });

      if (roleError && !roleError.message.includes("duplicate")) {
        console.warn("Role assignment warning:", roleError.message);
      }

      toast({ title: "Registration submitted!", description: "Your facility will be reviewed by our team." });
      setFacilityId(facility.id);
      setView("pending");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Registration failed", description: e.message });
    }
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setView("auth");
    setFacilityId(null);
    setFacilityData(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Nzwisiso for Facilities</h1>
              <p className="text-xs text-muted-foreground">Mental Health Facility Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <>
                <NotificationBell />
                <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        {/* ── AUTH ─── */}
        {view === "auth" && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Facility Portal</h2>
              <p className="text-muted-foreground">Sign in or register your mental health facility to receive patient referrals through Nzwisiso.</p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <Tabs defaultValue="signin">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="signin">Sign In</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin">
                    <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">Email</Label>
                        <Input id="signin-email" name="email" type="email" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signin-password">Password</Label>
                        <Input id="signin-password" name="password" type="password" required />
                      </div>
                      <Button type="submit" className="w-full" disabled={authLoading}>
                        {authLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sign In
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Full Name</Label>
                        <Input id="signup-name" name="fullName" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input id="signup-email" name="email" type="email" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <Input id="signup-password" name="password" type="password" minLength={6} required />
                      </div>
                      <Button type="submit" className="w-full" disabled={authLoading}>
                        {authLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Account
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">Are you a patient looking for help?</p>
              <a href="/self-assess" className="text-sm text-primary hover:underline font-medium">
                Take a free self-assessment →
              </a>
            </div>
          </div>
        )}

        {/* ── REGISTER FACILITY ─── */}
        {view === "register" && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Register Your Facility</CardTitle>
                <CardDescription>Provide your facility details. Your registration will be reviewed and approved by the Nzwisiso team before you can receive referrals.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Facility Name <span className="text-destructive">*</span></Label>
                    <Input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="e.g. Harare Mental Health Clinic" />
                  </div>

                  <div className="space-y-2">
                    <Label>Region <span className="text-destructive">*</span></Label>
                    <Select value={regRegion} onValueChange={setRegRegion}>
                      <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                      <SelectContent>
                        {REGIONS.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>City <span className="text-destructive">*</span></Label>
                    <Input value={regCity} onChange={(e) => setRegCity(e.target.value)} placeholder="e.g. Harare" />
                  </div>

                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="+263..." />
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Website</Label>
                    <Input value={regWebsite} onChange={(e) => setRegWebsite(e.target.value)} placeholder="https://..." />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Services Offered</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SERVICE_OPTIONS.map(service => (
                      <div key={service} className="flex items-center gap-2">
                        <Checkbox
                          id={`svc-${service}`}
                          checked={regServices.includes(service)}
                          onCheckedChange={(c) => {
                            setRegServices(prev =>
                              c ? [...prev, service] : prev.filter(s => s !== service)
                            );
                          }}
                        />
                        <Label htmlFor={`svc-${service}`} className="text-sm cursor-pointer">{service}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="emergency"
                    checked={regEmergency}
                    onCheckedChange={(c) => setRegEmergency(!!c)}
                  />
                  <Label htmlFor="emergency" className="cursor-pointer">This facility can handle psychiatric emergencies</Label>
                </div>

                <Button onClick={handleRegisterFacility} disabled={authLoading} className="w-full" size="lg">
                  {authLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit Registration
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── PENDING APPROVAL ─── */}
        {view === "pending" && (
          <div className="max-w-md mx-auto">
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <Clock className="w-16 h-16 text-muted-foreground mx-auto" />
                <h3 className="text-xl font-semibold">Registration Under Review</h3>
                <p className="text-muted-foreground">
                  Your facility registration has been submitted and is being reviewed by the Nzwisiso team. You'll receive access once approved.
                </p>
                <Badge variant="secondary" className="text-sm">
                  <Clock className="w-3 h-3 mr-1" /> Pending Approval
                </Badge>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── REJECTED ─── */}
        {view === "rejected" && (
          <div className="max-w-md mx-auto">
            <Card className="border-destructive/30">
              <CardContent className="py-12 text-center space-y-4">
                <XCircle className="w-16 h-16 text-destructive mx-auto" />
                <h3 className="text-xl font-semibold">Registration Not Approved</h3>
                <p className="text-muted-foreground">
                  {facilityData?.rejection_reason || "Your facility registration was not approved at this time. Please contact us for more information."}
                </p>
                <Badge variant="destructive" className="text-sm">Rejected</Badge>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── DASHBOARD ─── */}
        {view === "dashboard" && facilityId && (
          <FacilityDashboard facilityId={facilityId} facilityData={facilityData} />
        )}
      </main>

      <Footer />
    </div>
  );
}
