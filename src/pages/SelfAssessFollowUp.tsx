import { useState, useCallback } from "react";
import { Stethoscope, Loader2, Send, Search, AlertTriangle, CheckCircle2, MessageCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/Footer";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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

interface ReferralRow {
  id: string;
  status: string;
  matched_at: string;
  accepted_at: string | null;
  facility_id: string;
  facilities: { facility_name: string; city: string | null; region: string; contact_phone: string | null; contact_email: string | null } | null;
}

interface MessageRow {
  id: string;
  facility_id: string;
  sender: "facility" | "self_assessor";
  body: string;
  created_at: string;
}

export default function SelfAssessFollowUp() {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [activeFacilityId, setActiveFacilityId] = useState<string>("");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const load = useCallback(async () => {
    if (!code.trim() || !pin.trim()) {
      toast({ title: "Required", description: "Enter your referral ID and PIN.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const data = await callApi({ action: "lookup", referral_code: code.trim().toUpperCase(), pin: pin.trim() });
      setSessionInfo(data.session);
      setReferrals(data.referrals || []);
      setMessages(data.messages || []);
      if ((data.referrals || []).length > 0) setActiveFacilityId(data.referrals[0].facility_id);
      setContactName(data.session?.contact_name || "");
      setContactPhone(data.session?.contact_phone || "");
      setContactEmail(data.session?.contact_email || "");
    } catch (e: any) {
      toast({ title: "Unable to load", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [code, pin, toast]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !activeFacilityId) return;
    setSending(true);
    try {
      await callApi({
        action: "post_message",
        referral_code: code.trim().toUpperCase(),
        pin: pin.trim(),
        facility_id: activeFacilityId,
        message: newMessage.trim(),
      });
      setNewMessage("");
      // refresh
      const data = await callApi({ action: "lookup", referral_code: code.trim().toUpperCase(), pin: pin.trim() });
      setMessages(data.messages || []);
      toast({ title: "Message sent" });
    } catch (e: any) {
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }, [newMessage, activeFacilityId, code, pin, toast]);

  const saveContact = useCallback(async () => {
    setSending(true);
    try {
      await callApi({
        action: "add_contact",
        referral_code: code.trim().toUpperCase(),
        pin: pin.trim(),
        contact_name: contactName,
        contact_phone: contactPhone,
        contact_email: contactEmail,
      });
      toast({ title: "Contact details saved", description: "Your matched facility can now reach you directly." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }, [code, pin, contactName, contactPhone, contactEmail, toast]);

  const facilityName = (id: string) => referrals.find(r => r.facility_id === id)?.facilities?.facility_name || "Facility";
  const activeMessages = messages.filter(m => m.facility_id === activeFacilityId);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Aperta Health</h1>
              <p className="text-xs text-muted-foreground">Check your referral status</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">Confidential</Badge>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8 space-y-6">
        {!sessionInfo && (
          <Card>
            <CardHeader>
              <CardTitle>Enter your referral details</CardTitle>
              <CardDescription>
                Use the Referral ID and 4-digit PIN you received at the end of your self-assessment. Keep these private.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Referral ID</Label>
                <Input
                  id="code"
                  placeholder="NZW-XXXX-XXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="font-mono tracking-wider"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin">PIN</Label>
                <Input
                  id="pin"
                  placeholder="4-digit PIN"
                  value={pin}
                  inputMode="numeric"
                  maxLength={4}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  className="font-mono tracking-widest w-32"
                />
              </div>
              <Button onClick={load} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                Find my referral
              </Button>
              <p className="text-xs text-muted-foreground">
                Lost your details? You will need to start a new self-assessment. We cannot recover the PIN.
              </p>
            </CardContent>
          </Card>
        )}

        {sessionInfo && (
          <>
            <Card className={sessionInfo.risk_level === "CRISIS" ? "border-destructive/50 bg-destructive/5" : "border-primary/30 bg-primary/5"}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {sessionInfo.risk_level === "CRISIS" ? <AlertTriangle className="w-5 h-5 text-destructive" /> : <CheckCircle2 className="w-5 h-5 text-primary" />}
                  Referral {sessionInfo.referral_code}
                </CardTitle>
                <CardDescription>
                  Submitted {new Date(sessionInfo.created_at).toLocaleString()} · status: {sessionInfo.status}
                </CardDescription>
              </CardHeader>
            </Card>

            {referrals.length === 0 ? (
              <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">No facility has been matched yet.</CardContent></Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Matched facilities</CardTitle>
                  <CardDescription>Tap a facility to message them or see status.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {referrals.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setActiveFacilityId(r.facility_id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${activeFacilityId === r.facility_id ? "border-primary bg-primary/5" : "bg-card hover:bg-accent/40"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{r.facilities?.facility_name}</p>
                          <p className="text-xs text-muted-foreground">{r.facilities?.city ?? r.facilities?.region}</p>
                        </div>
                        <Badge variant={r.status === "accepted" ? "secondary" : r.status === "urgent" ? "destructive" : "outline"} className="text-xs">{r.status}</Badge>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}

            {activeFacilityId && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" /> Messages with {facilityName(activeFacilityId)}
                  </CardTitle>
                  <CardDescription>Pseudonymous — they only know you by your referral ID.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="max-h-80 overflow-y-auto space-y-2 border rounded p-3 bg-muted/30">
                    {activeMessages.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">No messages yet.</p>
                    ) : activeMessages.map(m => (
                      <div key={m.id} className={`flex ${m.sender === "self_assessor" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.sender === "self_assessor" ? "bg-primary text-primary-foreground" : "bg-card border"}`}>
                          <p className="whitespace-pre-wrap">{m.body}</p>
                          <p className="text-[10px] opacity-70 mt-1">
                            {m.sender === "facility" ? "Facility" : "You"} · {new Date(m.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Type a message to the facility…"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={3}
                      maxLength={4000}
                    />
                    <Button onClick={sendMessage} disabled={sending || !newMessage.trim()} className="w-full">
                      {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      Send message
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><UserPlus className="w-4 h-4" /> Share contact details (optional)</CardTitle>
                <CardDescription>
                  If you'd like the facility to call or email you directly to arrange an appointment, you can share contact details. This is fully optional — your assessment remains anonymous otherwise.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="cn" className="text-xs">Name to use</Label>
                    <Input id="cn" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g. Tendai" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cp" className="text-xs">Phone</Label>
                    <Input id="cp" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+61…" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ce" className="text-xs">Email</Label>
                    <Input id="ce" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@example.com" />
                  </div>
                </div>
                <Button variant="outline" onClick={saveContact} disabled={sending} className="w-full">
                  {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save contact details
                </Button>
              </CardContent>
            </Card>

            <Separator />
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => { setSessionInfo(null); setCode(""); setPin(""); setMessages([]); setReferrals([]); }}>Sign out</Button>
              <Button variant="outline" onClick={load} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Refresh
              </Button>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
