import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { isAdmin, getRoleLabel } from "@/lib/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Users, Activity, Shield, RefreshCw, UserX, UserCheck, Trash2, Mail, Building2, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { TeamInvitations } from "@/components/TeamInvitations";

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  is_deactivated?: boolean;
}

interface AuditEntry {
  id: string;
  actor_id: string;
  actor_role: string;
  action: string;
  resource_type: string;
  outcome: string;
  description: string | null;
  recorded_at: string;
  actor_name?: string;
}

const ASSIGNABLE_ROLES = ["psychiatrist", "clinical_nurse", "chw", "viewer"] as const;

export const AdminDashboard = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [facilityLoading, setFacilityLoading] = useState(false);
  const [facilityActionId, setFacilityActionId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadTeamMembers = async () => {
    try {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, email, created_at")
        .order("created_at", { ascending: true });

      if (pErr) throw pErr;

      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rErr) throw rErr;

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      setMembers(
        (profiles || []).map(p => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          role: roleMap.get(p.id) || "viewer",
          created_at: p.created_at,
        }))
      );
    } catch (err) {
      console.error("Error loading team:", err);
      toast({ title: "Error", description: "Failed to load team members", variant: "destructive" });
    }
  };

  const loadAuditLog = async () => {
    try {
      const { data, error } = await supabase
        .from("audit_events")
        .select("id, actor_id, actor_role, action, resource_type, outcome, description, recorded_at")
        .order("recorded_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const actorIds = [...new Set((data || []).map(e => e.actor_id))];
      const { data: actorProfiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", actorIds);

      const nameMap = new Map((actorProfiles || []).map(p => [p.id, p.full_name]));

      setAuditLog(
        (data || []).map(e => ({
          ...e,
          actor_name: nameMap.get(e.actor_id) || "Unknown",
        }))
      );
    } catch (err) {
      console.error("Error loading audit log:", err);
    }
  };

  const loadFacilities = async () => {
    setFacilityLoading(true);
    try {
      const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setFacilities(data || []);
    } catch (err) {
      console.error("Error loading facilities:", err);
    }
    setFacilityLoading(false);
  };

  const handleFacilityApproval = async (facilityId: string, approve: boolean) => {
    setFacilityActionId(facilityId);
    try {
      const update: any = {
        approval_status: approve ? "approved" : "rejected",
        is_active: approve,
        accepts_referrals: approve,
      };
      if (!approve && rejectionReason) {
        update.rejection_reason = rejectionReason;
      }

      const { error } = await supabase
        .from("facilities")
        .update(update)
        .eq("id", facilityId);

      if (error) throw error;

      await supabase.from("audit_events").insert({
        actor_id: user!.id,
        actor_role: userRole || "admin",
        action: approve ? "facility_approved" : "facility_rejected",
        resource_type: "facility",
        resource_id: facilityId,
        description: approve ? "Facility registration approved" : `Facility rejected: ${rejectionReason || "No reason given"}`,
        outcome: "success",
      });

      toast({ title: approve ? "Facility Approved" : "Facility Rejected" });
      setRejectionReason("");
      loadFacilities();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
    setFacilityActionId(null);
  };

  useEffect(() => {
    if (!isAdmin(userRole)) return;
    setLoading(true);
    Promise.all([loadTeamMembers(), loadAuditLog(), loadFacilities()]).finally(() => setLoading(false));
  }, [userRole]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userId === user?.id) {
      toast({ title: "Not allowed", description: "You cannot change your own role", variant: "destructive" });
      return;
    }

    setUpdatingId(userId);
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole as any })
        .eq("user_id", userId);

      if (error) throw error;

      setMembers(prev => prev.map(m => m.id === userId ? { ...m, role: newRole } : m));

      await supabase.from("audit_events").insert({
        actor_id: user!.id,
        actor_role: userRole || "admin",
        action: "role_change",
        resource_type: "user_role",
        resource_id: userId,
        description: `Changed role to ${getRoleLabel(newRole)}`,
        outcome: "success",
      });

      toast({ title: "Role Updated", description: `User role changed to ${getRoleLabel(newRole)}` });
    } catch (err) {
      console.error("Error updating role:", err);
      toast({ title: "Error", description: "Failed to update role", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUserAction = async (userId: string, action: "deactivate" | "reactivate" | "delete") => {
    setActionInProgress(userId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action, target_user_id: userId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const labels: Record<string, string> = {
        deactivate: "User deactivated",
        reactivate: "User reactivated",
        delete: "User permanently deleted",
      };

      toast({ title: labels[action], description: data.message });

      if (action === "delete") {
        setMembers(prev => prev.filter(m => m.id !== userId));
      } else {
        setMembers(prev =>
          prev.map(m => m.id === userId ? { ...m, is_deactivated: action === "deactivate" } : m)
        );
      }

      loadAuditLog();
    } catch (err: any) {
      console.error(`Error ${action}:`, err);
      toast({
        title: "Error",
        description: err.message || `Failed to ${action} user`,
        variant: "destructive",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  if (!isAdmin(userRole)) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p>Administrator access required</p>
        </CardContent>
      </Card>
    );
  }

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive" as const;
      case "psychiatrist": return "default" as const;
      case "clinical_nurse": return "secondary" as const;
      case "chw": return "outline" as const;
      default: return "outline" as const;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Admin Dashboard</h2>
          <p className="text-muted-foreground">Manage team members and monitor activity</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.location.assign("/fhir-sandbox")}>
            FHIR Sandbox
          </Button>
          <Button variant="outline" size="sm" onClick={() => { loadTeamMembers(); loadAuditLog(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(["psychiatrist", "clinical_nurse", "chw", "viewer"] as const).map(role => (
          <Card key={role}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{getRoleLabel(role)}s</p>
                <Badge variant={roleBadgeVariant(role)}>{members.filter(m => m.role === role).length}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="team">
        <TabsList>
          <TabsTrigger value="team">
            <Users className="h-4 w-4 mr-2" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="h-4 w-4 mr-2" />
            Activity Log
          </TabsTrigger>
          <TabsTrigger value="invitations">
            <Mail className="h-4 w-4 mr-2" />
            Invitations
          </TabsTrigger>
          <TabsTrigger value="facilities">
            <Building2 className="h-4 w-4 mr-2" />
            Facilities
            {facilities.filter(f => f.approval_status === "pending").length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full">
                {facilities.filter(f => f.approval_status === "pending").length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Assign roles, deactivate, or remove user accounts. CHWs are restricted to patient registration and PHQ-9 screening.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-center py-8">Loading team…</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Current Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Change Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map(member => {
                      const isSelf = member.id === user?.id;
                      const isMemberAdmin = member.role === "admin";
                      const isDeactivated = member.is_deactivated;
                      const isActioning = actionInProgress === member.id;

                      return (
                        <TableRow key={member.id} className={isDeactivated ? "opacity-50" : ""}>
                          <TableCell className="font-medium">
                            {member.full_name}
                            {isDeactivated && (
                              <Badge variant="destructive" className="ml-2 text-xs">Deactivated</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{member.email}</TableCell>
                          <TableCell>
                            <Badge variant={roleBadgeVariant(member.role)}>
                              {getRoleLabel(member.role)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(member.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {isSelf ? (
                              <span className="text-xs text-muted-foreground italic">You</span>
                            ) : isMemberAdmin ? (
                              <span className="text-xs text-muted-foreground italic">Admin</span>
                            ) : (
                              <Select
                                value={member.role}
                                onValueChange={(val) => handleRoleChange(member.id, val)}
                                disabled={updatingId === member.id || isDeactivated}
                              >
                                <SelectTrigger className="w-[160px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ASSIGNABLE_ROLES.map(r => (
                                    <SelectItem key={r} value={r}>{getRoleLabel(r)}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell>
                            {isSelf || isMemberAdmin ? (
                              <span className="text-xs text-muted-foreground italic">—</span>
                            ) : (
                              <div className="flex items-center gap-1">
                                {isDeactivated ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isActioning}
                                    onClick={() => handleUserAction(member.id, "reactivate")}
                                    className="h-8 text-xs"
                                  >
                                    <UserCheck className="h-3 w-3 mr-1" />
                                    Reactivate
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isActioning}
                                    onClick={() => handleUserAction(member.id, "deactivate")}
                                    className="h-8 text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                                  >
                                    <UserX className="h-3 w-3 mr-1" />
                                    Deactivate
                                  </Button>
                                )}

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled={isActioning}
                                      className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Permanently delete user?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently remove <strong>{member.full_name}</strong> ({member.email}) and all their authentication data. Their clinical records will be preserved for audit purposes but the account cannot be recovered.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={() => handleUserAction(member.id, "delete")}
                                      >
                                        Delete permanently
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>Recent actions across all users (last 50 events)</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-center py-8">Loading activity…</p>
              ) : auditLog.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No activity recorded yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLog.map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(entry.recorded_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{entry.actor_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{getRoleLabel(entry.actor_role)}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{entry.action.replace(/_/g, " ")}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{entry.resource_type.replace(/_/g, " ")}</TableCell>
                        <TableCell>
                          <Badge variant={entry.outcome === "success" ? "default" : "destructive"} className="text-xs">
                            {entry.outcome}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {entry.description || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations">
          <TeamInvitations />
        </TabsContent>

        <TabsContent value="facilities">
          <Card>
            <CardHeader>
              <CardTitle>Registered Facilities</CardTitle>
              <CardDescription>Review and approve mental health facility registrations</CardDescription>
            </CardHeader>
            <CardContent>
              {facilityLoading ? (
                <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
              ) : facilities.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No facilities registered yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Facility</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {facilities.map(f => (
                      <TableRow key={f.id} className={f.approval_status === "pending" ? "bg-accent/30" : ""}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{f.facility_name}</p>
                            <p className="text-xs text-muted-foreground">{f.city}</p>
                            {f.contact_phone && <p className="text-xs text-muted-foreground">{f.contact_phone}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{f.region}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {(f.services_offered || []).slice(0, 3).map((s: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                            ))}
                            {(f.services_offered || []).length > 3 && (
                              <Badge variant="outline" className="text-xs">+{f.services_offered.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              f.approval_status === "approved" ? "default" :
                              f.approval_status === "rejected" ? "destructive" : "secondary"
                            }
                            className="text-xs"
                          >
                            {f.approval_status === "approved" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                            {f.approval_status === "rejected" && <XCircle className="w-3 h-3 mr-1" />}
                            {f.approval_status}
                          </Badge>
                          {f.emergency_capable && (
                            <Badge variant="outline" className="text-xs ml-1">Emergency</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {f.approval_status === "pending" && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleFacilityApproval(f.id, true)}
                                disabled={facilityActionId === f.id}
                              >
                                {facilityActionId === f.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                                Approve
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" disabled={facilityActionId === f.id}>
                                    <XCircle className="w-3 h-3 mr-1" /> Reject
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Reject {f.facility_name}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Provide a reason for rejection (optional). The facility will be notified.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <Input
                                    placeholder="Reason for rejection..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                  />
                                  <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setRejectionReason("")}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleFacilityApproval(f.id, false)}>
                                      Confirm Rejection
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                          {f.approval_status === "approved" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFacilityApproval(f.id, false)}
                              disabled={facilityActionId === f.id}
                            >
                              Revoke
                            </Button>
                          )}
                          {f.approval_status === "rejected" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFacilityApproval(f.id, true)}
                              disabled={facilityActionId === f.id}
                            >
                              Re-approve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
