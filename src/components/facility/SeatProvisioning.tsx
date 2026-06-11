import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, UserPlus, Trash2 } from "lucide-react";

type InviteRole = "psychiatrist" | "clinical_nurse" | "chw";

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
}

export function SeatProvisioning({ onCountChange }: { onCountChange?: (counts: Record<string, number>) => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("psychiatrist");
  const [inviting, setInviting] = useState(false);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("team_invitations")
      .select("id,email,role,status,expires_at")
      .order("created_at", { ascending: false });
    setInvites((data || []) as PendingInvite[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { psychiatrist: 0, clinical_nurse: 0, chw: 0 };
    invites.filter((i) => i.status === "accepted" || i.status === "pending").forEach((i) => {
      c[i.role] = (c[i.role] || 0) + 1;
    });
    return c;
  }, [invites]);

  useEffect(() => { onCountChange?.(counts); }, [counts, onCountChange]);

  const invite = async () => {
    if (!email.trim()) return;
    setInviting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setInviting(false); return; }
    const { error } = await supabase.from("team_invitations").insert({
      email: email.trim().toLowerCase(),
      role,
      invited_by: user.id,
    });
    setInviting(false);
    if (error) {
      toast({ title: "Invite failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Seat provisioned", description: `${email} invited as ${role}.` });
    setEmail("");
    load();
  };

  const revoke = async (id: string) => {
    await supabase.from("team_invitations").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {(["psychiatrist", "clinical_nurse", "chw"] as const).map((r) => (
          <Card key={r}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-semibold">{counts[r] || 0}</div>
              <div className="text-xs text-muted-foreground capitalize">{r.replace("_", " ")}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label className="text-xs">Email</Label>
          <Input type="email" placeholder="clinician@example.org.au" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="w-48">
          <Label className="text-xs">Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as InviteRole)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="psychiatrist">Psychiatrist / Clinical Psychologist</SelectItem>
              <SelectItem value="clinical_nurse">Refugee Health Nurse</SelectItem>
              <SelectItem value="chw">Bicultural Worker</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={invite} disabled={inviting || !email.trim()}>
          {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Invite
        </Button>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Pending & accepted invitations</Label>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : invites.length === 0 ? (
          <div className="text-sm text-muted-foreground">No invitations yet.</div>
        ) : (
          <div className="border rounded-md divide-y">
            {invites.slice(0, 10).map((i) => (
              <div key={i.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{i.email}</div>
                  <div className="text-xs text-muted-foreground capitalize">{i.role.replace("_", " ")}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={i.status === "accepted" ? "default" : "secondary"}>{i.status}</Badge>
                  {i.status === "pending" && (
                    <Button size="icon" variant="ghost" onClick={() => revoke(i.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
