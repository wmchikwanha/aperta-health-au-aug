import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Users,
  AlertTriangle,
  Calendar,
  TrendingUp,
  Clock,
  Activity,
  ClipboardList,
  Shield,
  Bell,
} from "lucide-react";
import { format, subDays, startOfDay, isAfter, isBefore, addDays } from "date-fns";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(217, 91%, 60%)",
];

const TOOL_COLORS: Record<string, string> = {
  "PHQ-9": "hsl(var(--chart-1))",
  "GAD-7": "hsl(var(--chart-2))",
  "PCL-5": "hsl(var(--chart-3))",
  "MMSE": "hsl(var(--chart-4))",
  "PSQ": "hsl(var(--chart-5))",
  "PRIME-R-5": "hsl(217, 91%, 60%)",
};

interface DashboardData {
  totalPatients: number;
  newPatientsThisWeek: number;
  activePatients: number;
  riskDistribution: { name: string; value: number; color: string }[];
  pendingFollowUps: {
    id: string;
    patientIdentifier: string;
    type: string;
    date: string;
    daysOverdue?: number;
  }[];
  upcomingAppointments: {
    id: string;
    patientIdentifier: string;
    scheduledAt: string;
    type: string;
    status: string;
  }[];
  screeningTrends: { date: string; [key: string]: number | string }[];
  toolAverages: { tool: string; average: number; count: number }[];
  crisisCount: number;
  unsentReminders: number;
}

export const ClinicalDashboard = () => {
  const { user, userRole } = useAuth();
  const [data, setData] = useState<DashboardData>({
    totalPatients: 0,
    newPatientsThisWeek: 0,
    activePatients: 0,
    riskDistribution: [],
    pendingFollowUps: [],
    upcomingAppointments: [],
    screeningTrends: [],
    toolAverages: [],
    crisisCount: 0,
    unsentReminders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();

    // Set up real-time subscriptions
    const channels = [
      supabase
        .channel("dashboard-patients")
        .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, fetchDashboardData)
        .subscribe(),
      supabase
        .channel("dashboard-appointments")
        .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, fetchDashboardData)
        .subscribe(),
      supabase
        .channel("dashboard-screenings")
        .on("postgres_changes", { event: "*", schema: "public", table: "screening_assessments" }, fetchDashboardData)
        .subscribe(),
      supabase
        .channel("dashboard-crisis")
        .on("postgres_changes", { event: "*", schema: "public", table: "crisis_interventions" }, fetchDashboardData)
        .subscribe(),
    ];

    return () => {
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, [user, userRole]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const weekAgo = startOfDay(subDays(now, 7));
      const thirtyDaysAgo = startOfDay(subDays(now, 30));

      // Fetch patients
      const { data: patients, error: patientsError } = await supabase
        .from("patients")
        .select("id, patient_identifier, created_at")
        .order("created_at", { ascending: false });

      if (patientsError) throw patientsError;

      const totalPatients = patients?.length || 0;
      const newPatientsThisWeek = patients?.filter((p) => new Date(p.created_at) >= weekAgo).length || 0;

      // Fetch assessments for risk distribution
      const { data: assessments, error: assessmentsError } = await supabase
        .from("assessments")
        .select("patient_id, risk_level")
        .order("assessment_date", { ascending: false });

      if (assessmentsError) throw assessmentsError;

      // Get unique patients with their most recent risk level
      const patientRisks = new Map<string, string>();
      assessments?.forEach((a) => {
        if (a.patient_id && !patientRisks.has(a.patient_id)) {
          patientRisks.set(a.patient_id, a.risk_level || "Unknown");
        }
      });

      const riskCount: Record<string, number> = { high: 0, moderate: 0, low: 0, Unknown: 0 };
      patientRisks.forEach((risk) => {
        const normalizedRisk = risk.toLowerCase();
        if (normalizedRisk === "high") riskCount.high++;
        else if (normalizedRisk === "moderate") riskCount.moderate++;
        else if (normalizedRisk === "low") riskCount.low++;
        else riskCount.Unknown++;
      });

      const riskDistribution = [
        { name: "High Risk", value: riskCount.high, color: "hsl(var(--destructive))" },
        { name: "Moderate", value: riskCount.moderate, color: "hsl(var(--chart-3))" },
        { name: "Low Risk", value: riskCount.low, color: "hsl(var(--chart-2))" },
        { name: "Not Assessed", value: riskCount.Unknown, color: "hsl(var(--muted))" },
      ].filter((r) => r.value > 0);

      // Fetch appointments
      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select("id, patient_id, scheduled_at, appointment_type, status, reminder_sent")
        .order("scheduled_at", { ascending: true });

      if (appointmentsError) throw appointmentsError;

      // Create patient ID to identifier map
      const patientMap = new Map(patients?.map((p) => [p.id, p.patient_identifier]) || []);

      // Pending follow-ups (overdue or due soon)
      const pendingFollowUps =
        appointments
          ?.filter((a) => {
            const scheduledDate = new Date(a.scheduled_at);
            return (
              (a.status === "scheduled" || a.status === "confirmed") &&
              isBefore(scheduledDate, addDays(now, 7))
            );
          })
          .map((a) => {
            const scheduledDate = new Date(a.scheduled_at);
            const isOverdue = isBefore(scheduledDate, now);
            return {
              id: a.id,
              patientIdentifier: patientMap.get(a.patient_id) || "Unknown",
              type: a.appointment_type,
              date: a.scheduled_at,
              daysOverdue: isOverdue
                ? Math.floor((now.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24))
                : undefined,
            };
          })
          .slice(0, 10) || [];

      // Upcoming appointments (next 7 days)
      const upcomingAppointments =
        appointments
          ?.filter((a) => {
            const scheduledDate = new Date(a.scheduled_at);
            return isAfter(scheduledDate, now) && isBefore(scheduledDate, addDays(now, 7));
          })
          .map((a) => ({
            id: a.id,
            patientIdentifier: patientMap.get(a.patient_id) || "Unknown",
            scheduledAt: a.scheduled_at,
            type: a.appointment_type,
            status: a.status,
          }))
          .slice(0, 10) || [];

      // Unsent reminders
      const unsentReminders =
        appointments?.filter((a) => {
          const scheduledDate = new Date(a.scheduled_at);
          return (
            !a.reminder_sent &&
            isAfter(scheduledDate, now) &&
            (a.status === "scheduled" || a.status === "confirmed")
          );
        }).length || 0;

      // Fetch screening assessments for trends
      const { data: screenings, error: screeningsError } = await supabase
        .from("screening_assessments")
        .select("tool_type, total_score, administered_at")
        .gte("administered_at", thirtyDaysAgo.toISOString())
        .order("administered_at", { ascending: true });

      if (screeningsError) throw screeningsError;

      // Calculate screening trends by week
      const weeklyTrends: Record<string, Record<string, { sum: number; count: number }>> = {};
      screenings?.forEach((s) => {
        const weekKey = format(new Date(s.administered_at), "MMM dd");
        if (!weeklyTrends[weekKey]) {
          weeklyTrends[weekKey] = {};
        }
        if (!weeklyTrends[weekKey][s.tool_type]) {
          weeklyTrends[weekKey][s.tool_type] = { sum: 0, count: 0 };
        }
        weeklyTrends[weekKey][s.tool_type].sum += s.total_score;
        weeklyTrends[weekKey][s.tool_type].count++;
      });

      const screeningTrends = Object.entries(weeklyTrends)
        .map(([date, tools]) => {
          const entry: { date: string; [key: string]: number | string } = { date };
          Object.entries(tools).forEach(([tool, data]) => {
            entry[tool] = Math.round(data.sum / data.count);
          });
          return entry;
        })
        .slice(-10);

      // Tool averages
      const toolStats: Record<string, { sum: number; count: number }> = {};
      screenings?.forEach((s) => {
        if (!toolStats[s.tool_type]) {
          toolStats[s.tool_type] = { sum: 0, count: 0 };
        }
        toolStats[s.tool_type].sum += s.total_score;
        toolStats[s.tool_type].count++;
      });

      const toolAverages = Object.entries(toolStats).map(([tool, stats]) => ({
        tool,
        average: Math.round(stats.sum / stats.count),
        count: stats.count,
      }));

      // Fetch active crisis interventions
      const { data: crisisData, error: crisisError } = await supabase
        .from("crisis_interventions")
        .select("id")
        .is("resolved_at", null);

      if (crisisError) throw crisisError;
      const crisisCount = crisisData?.length || 0;

      // Active patients (with assessments or appointments in last 30 days)
      const activePatientIds = new Set<string>();
      assessments
        ?.filter((a) => a.patient_id)
        .forEach((a) => activePatientIds.add(a.patient_id!));
      appointments
        ?.filter((a) => new Date(a.scheduled_at) >= thirtyDaysAgo)
        .forEach((a) => activePatientIds.add(a.patient_id));

      setData({
        totalPatients,
        newPatientsThisWeek,
        activePatients: activePatientIds.size,
        riskDistribution,
        pendingFollowUps,
        upcomingAppointments,
        screeningTrends,
        toolAverages,
        crisisCount,
        unsentReminders,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  const usedTools = [...new Set(data.screeningTrends.flatMap((t) => Object.keys(t).filter((k) => k !== "date")))];

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalPatients}</div>
            <p className="text-xs text-muted-foreground">
              +{data.newPatientsThisWeek} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Caseload</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activePatients}</div>
            <p className="text-xs text-muted-foreground">
              {data.totalPatients > 0
                ? Math.round((data.activePatients / data.totalPatients) * 100)
                : 0}
              % of total
            </p>
          </CardContent>
        </Card>

        <Card className={data.crisisCount > 0 ? "border-destructive" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Crises</CardTitle>
            <Shield className={`h-4 w-4 ${data.crisisCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.crisisCount > 0 ? "text-destructive" : ""}`}>
              {data.crisisCount}
            </div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>

        <Card className={data.unsentReminders > 0 ? "border-amber-500" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reminders</CardTitle>
            <Bell className={`h-4 w-4 ${data.unsentReminders > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.unsentReminders > 0 ? "text-amber-500" : ""}`}>
              {data.unsentReminders}
            </div>
            <p className="text-xs text-muted-foreground">Reminders not sent</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution and Pending Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Risk Distribution
            </CardTitle>
            <CardDescription>Patient risk levels based on latest assessments</CardDescription>
          </CardHeader>
          <CardContent>
            {data.riskDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No assessment data available</p>
            ) : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.riskDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {data.riskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-4">
                  {data.riskDistribution.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm">
                        {item.name}: {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Follow-ups
            </CardTitle>
            <CardDescription>Overdue and upcoming appointments this week</CardDescription>
          </CardHeader>
          <CardContent>
            {data.pendingFollowUps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No pending follow-ups</p>
            ) : (
              <div className="space-y-3 max-h-[280px] overflow-y-auto">
                {data.pendingFollowUps.map((followUp) => (
                  <div
                    key={followUp.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      followUp.daysOverdue ? "border-destructive bg-destructive/5" : "border-border"
                    }`}
                  >
                    <div>
                      <p className="font-medium text-sm">{followUp.patientIdentifier}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {followUp.type.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{format(new Date(followUp.date), "MMM dd, HH:mm")}</p>
                      {followUp.daysOverdue && (
                        <Badge variant="destructive" className="text-xs">
                          {followUp.daysOverdue}d overdue
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Screening Score Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Screening Score Trends
          </CardTitle>
          <CardDescription>Average screening scores across all patients (last 30 days)</CardDescription>
        </CardHeader>
        <CardContent>
          {data.screeningTrends.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No screening data available</p>
          ) : (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.screeningTrends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  {usedTools.map((tool) => (
                    <Area
                      key={tool}
                      type="monotone"
                      dataKey={tool}
                      stroke={TOOL_COLORS[tool] || COLORS[0]}
                      fill={TOOL_COLORS[tool] || COLORS[0]}
                      fillOpacity={0.2}
                      strokeWidth={2}
                      connectNulls
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>

              {/* Tool Averages */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-4 border-t">
                {data.toolAverages.map((tool) => (
                  <div key={tool.tool} className="text-center">
                    <div
                      className="text-2xl font-bold"
                      style={{ color: TOOL_COLORS[tool.tool] || COLORS[0] }}
                    >
                      {tool.average}
                    </div>
                    <p className="text-xs text-muted-foreground">{tool.tool}</p>
                    <p className="text-xs text-muted-foreground">({tool.count} tests)</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Appointments
          </CardTitle>
          <CardDescription>Scheduled appointments for the next 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          {data.upcomingAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No upcoming appointments</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{appointment.patientIdentifier}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {appointment.type.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(appointment.scheduledAt), "EEE, MMM dd 'at' HH:mm")}
                    </p>
                  </div>
                  <Badge
                    variant={
                      appointment.status === "confirmed"
                        ? "default"
                        : appointment.status === "scheduled"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {appointment.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
