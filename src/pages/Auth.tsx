import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Eye, EyeOff } from "lucide-react";
import { getRoleLabel } from "@/lib/permissions";
import type { User, Session } from "@supabase/supabase-js";
import { Footer } from "@/components/Footer";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [inviteInfo, setInviteInfo] = useState<{ email: string; role: string } | null>(null);
  const [showSignInPwd, setShowSignInPwd] = useState(false);
  const [showSignUpPwd, setShowSignUpPwd] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const inviteToken = searchParams.get("invite");

  // Look up invitation details
  useEffect(() => {
    if (!inviteToken) return;
    supabase
      .from("team_invitations")
      .select("email, role, status, expires_at")
      .eq("token", inviteToken)
      .single()
      .then(({ data }) => {
        if (data && (data as any).status === "pending" && new Date((data as any).expires_at) > new Date()) {
          setInviteInfo({ email: (data as any).email, role: (data as any).role });
        }
      });
  }, [inviteToken]);

  const redirectAfterAuth = async (userId: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
    navigate(data?.role === "chw" ? "/chw" : "/");
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => redirectAfterAuth(session.user.id), 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        redirectAfterAuth(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const fullName = formData.get("fullName") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const accountType = (formData.get("accountType") as string) || "clinician";

    if (!fullName || !email || !password) {
      toast({ variant: "destructive", title: "Missing fields", description: "Please fill in all fields" });
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      toast({ variant: "destructive", title: "Password too short", description: "Password must be at least 6 characters" });
      setLoading(false);
      return;
    }

    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: accountType === "chw" ? "chw" : undefined,
        },
      },
    });

    setLoading(false);

    if (error) {
      toast({ variant: "destructive", title: "Sign up failed", description: error.message });
    } else if (data.session) {
      // Auto-confirm is on — user is signed in immediately
      toast({ title: "Welcome to Aperta Health", description: "Account created and signed in." });
      // onAuthStateChange will redirect
    } else {
      toast({
        title: "Check your email",
        description: "We sent a confirmation link to verify your address.",
      });
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      toast({ variant: "destructive", title: "Missing fields", description: "Please fill in all fields" });
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast({ variant: "destructive", title: "Sign in failed", description: error.message });
    }
  };

  const defaultTab = inviteToken ? "signup" : "signin";

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium border border-primary/20">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Data Sovereign · Hosted in Australia
              </span>
            </div>
            <CardTitle className="text-2xl font-bold text-center font-display">
              Aperta Health
            </CardTitle>
            <CardDescription className="text-center">
              Mental Health Decision Support · sign in to continue
            </CardDescription>
            <p className="text-[11px] text-center text-muted-foreground italic px-2">
              We acknowledge the Traditional Owners of the lands on which this tool is used and pay
              our respects to Elders past, present and emerging.
            </p>
            {inviteInfo && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <UserPlus className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  You've been invited as{" "}
                  <Badge variant="secondary" className="text-xs">{getRoleLabel(inviteInfo.role)}</Badge>
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input id="signin-email" name="email" type="email" placeholder="psychiatrist@example.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input id="signin-password" name="password" type="password" required />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  {!inviteInfo && (
                    <div className="space-y-2">
                      <Label>I am signing up as</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-start gap-2 border rounded-md p-2 cursor-pointer hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                          <input type="radio" name="accountType" value="clinician" defaultChecked className="mt-1" />
                          <span className="text-xs">
                            <span className="block font-medium text-foreground">Clinician / Facility</span>
                            <span className="text-muted-foreground">Psychiatrist / Clinical Psychologist, Refugee Health Nurse, Service Admin</span>
                          </span>
                        </label>
                        <label className="flex items-start gap-2 border rounded-md p-2 cursor-pointer hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                          <input type="radio" name="accountType" value="chw" className="mt-1" />
                          <span className="text-xs">
                            <span className="block font-medium text-foreground">Bicultural Worker</span>
                            <span className="text-muted-foreground">Community / bicultural support, first port of call</span>
                          </span>
                        </label>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input id="signup-name" name="fullName" type="text" placeholder="Jane Smith" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="psychiatrist@example.com"
                      defaultValue={inviteInfo?.email || ""}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input id="signup-password" name="password" type="password" minLength={6} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {inviteInfo ? "Accept Invitation & Sign Up" : "Sign Up"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
      </Card>
      </div>

      <div className="py-6 text-center bg-background border-t">
        <p className="text-sm text-muted-foreground mb-2">Not a clinician? Need mental health support?</p>
        <a href="/self-assess" className="text-sm text-primary hover:underline font-medium">
          Take a free self-assessment →
        </a>
      </div>

      <Footer />
    </div>
  );
};

export default Auth;
