import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getRoleLabel } from "@/lib/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, UserPlus, Clock, CheckCircle, XCircle, Copy } from "lucide-react";

const ASSIGNABLE_ROLES = ["psychiatrist", "clinical_nurse", "chw", "viewer"] as const;

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}

export const TeamInvitations = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("chw");

  const loadInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from("team_invitations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setInvitations((data as any[]) || []);
    } catch (err) {
      console.error("Error loading invitations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvitations();
  }, []);

  const handleInvite = async () => {
    if (!email.trim()) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase
        .from("team_invitations")
        .insert({
          email: email.trim().toLowerCase(),
          role: role as any,
          invited_by: user!.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      await supabase.from("audit_events").insert({
        actor_id: user!.id,
        actor_role: userRole || "admin",
        action: "user_invited",
        resource_type: "team_invitation",
        resource_id: (data as any).id,
        description: `Invited ${email.trim()} as ${getRoleLabel(role)}`,
        outcome: "success",
      });

      toast({ title: "Invitation Created", description: `${email.trim()} invited as ${getRoleLabel(role)}` });
      setEmail("");
      setInvitations(prev => [(data as any), ...prev]);
    } catch (err: any) {
      console.error("Error creating invitation:", err);
      toast({ title: "Error", description: err.message || "Failed to create invitation", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      const { error } = await supabase
        .from("team_invitations")
        .update({ status: "revoked" } as any)
        .eq("id", id);

      if (error) throw error;
      setInvitations(prev => prev.map(i => i.id === id ? { ...i, status: "revoked" } : i));
      toast({ title: "Invitation Revoked" });
    } catch (err) {
      console.error("Error revoking invitation:", err);
      toast({ title: "Error", description: "Failed to revoke invitation", variant: "destructive" });
    }
  };

  const copySignupLink = (inv: Invitation) => {
    const url = `${window.location.origin}/auth?invite=${inv.token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link Copied", description: "Signup link copied to clipboard" });
  };

  const statusBadge = (inv: Invitation) => {
    const isExpired = new Date(inv.expires_at) < new Date();
    if (inv.status === "accepted") return <Badge variant="default" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
    if (inv.status === "revoked") return <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1" />Revoked</Badge>;
    if (isExpired) return <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 mr-1" />Expired</Badge>;
    return <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  const roleBadgeVariant = (r: string) => {
    switch (r) {
      case "psychiatrist": return "default" as const;
      case "clinical_nurse": return "secondary" as const;
      default: return "outline" as const;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Team Members</CardTitle>
        <CardDescription>
          Send invitation links with a pre-assigned role. When the invitee signs up, they'll automatically receive the assigned role.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Invite Form */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            type="email"
            placeholder="colleague@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
          />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSIGNABLE_ROLES.map(r => (
                <SelectItem key={r} value={r}>{getRoleLabel(r)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleInvite} disabled={sending}>
            <UserPlus className="h-4 w-4 mr-2" />
            {sending ? "Sending…" : "Invite"}
          </Button>
        </div>

        {/* Invitations List */}
        {loading ? (
          <p className="text-muted-foreground text-center py-6">Loading invitations…</p>
        ) : invitations.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">No invitations sent yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map(inv => {
                const isActive = inv.status === "pending" && new Date(inv.expires_at) > new Date();
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(inv.role)}>{getRoleLabel(inv.role)}</Badge>
                    </TableCell>
                    <TableCell>{statusBadge(inv)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {isActive && (
                          <>
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => copySignupLink(inv)}>
                              <Copy className="h-3 w-3 mr-1" />
                              Copy Link
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleRevoke(inv.id)}>
                              Revoke
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
