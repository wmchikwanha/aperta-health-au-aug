import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Activity, TrendingUp, Languages, AlertTriangle } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { getLanguageName } from "@/lib/languages";

interface AssessmentData {
  total: number;
  thisWeek: number;
  highRisk: number;
  totalPatients: number;
  languages: { name: string; value: number }[];
  riskLevels: { name: string; value: number }[];
  trends: { date: string; count: number }[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const AnalyticsDashboard = () => {
  const { user, userRole } = useAuth();
  const [data, setData] = useState<AssessmentData>({
    total: 0,
    thisWeek: 0,
    highRisk: 0,
    totalPatients: 0,
    languages: [],
    riskLevels: [],
    trends: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();

    const channel = supabase
      .channel('analytics-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assessments' }, () => fetchAnalytics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => fetchAnalytics())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userRole]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Build base queries filtered by role
      let assessmentQuery = supabase
        .from('assessments')
        .select('*')
        .order('assessment_date', { ascending: false });

      let patientQuery = supabase
        .from('patients')
        .select('language_preference');

      if (userRole !== 'admin') {
        assessmentQuery = assessmentQuery.eq('user_id', user!.id);
        patientQuery = patientQuery.eq('user_id', user!.id);
      }

      const [{ data: assessments, error: aErr }, { data: patients, error: pErr }] =
        await Promise.all([assessmentQuery, patientQuery]);

      if (aErr) throw aErr;
      if (pErr) throw pErr;

      // Assessment stats
      const total = assessments?.length ?? 0;
      const weekAgo = startOfDay(subDays(new Date(), 7));
      const thisWeek = (assessments ?? []).filter(a => new Date(a.assessment_date) >= weekAgo).length;
      const highRisk = (assessments ?? []).filter(a => a.risk_level === 'high').length;

      // Language distribution — sourced from patient language_preference, not assessment language_detected
      const langCount: { [key: string]: number } = {};
      (patients ?? []).forEach(p => {
        const code = p.language_preference;
        if (!code) return;
        const name = getLanguageName(code) || code;
        langCount[name] = (langCount[name] || 0) + 1;
      });
      const languages = Object.entries(langCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Risk level distribution — from assessments
      const riskCount: { [key: string]: number } = {};
      (assessments ?? []).forEach(a => {
        const risk = a.risk_level || 'Unknown';
        riskCount[risk] = (riskCount[risk] || 0) + 1;
      });
      const riskLevels = Object.entries(riskCount).map(([name, value]) => ({ name, value }));

      // Trends over last 30 days
      const trends: { [key: string]: number } = {};
      const thirtyDaysAgo = startOfDay(subDays(new Date(), 30));

      (assessments ?? [])
        .filter(a => new Date(a.assessment_date) >= thirtyDaysAgo)
        .forEach(a => {
          const dateKey = format(new Date(a.assessment_date), 'MMM dd');
          trends[dateKey] = (trends[dateKey] || 0) + 1;
        });

      const trendsArray = Object.entries(trends)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setData({
        total,
        thisWeek,
        highRisk,
        totalPatients: patients?.length ?? 0,
        languages,
        riskLevels,
        trends: trendsArray,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.thisWeek}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Cases</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.highRisk}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Languages className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalPatients}</div>
            <p className="text-xs text-muted-foreground">{data.languages.length} language{data.languages.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Assessment Trends</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Language Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Language Distribution</CardTitle>
            <CardDescription>Assessment languages</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.languages}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#3b82f6">
                  {data.languages.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Risk Level Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Level Distribution</CardTitle>
            <CardDescription>Assessment risk levels</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.riskLevels}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.riskLevels.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
            <CardDescription>Summary of assessment patterns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">Most Common Language</p>
              <p className="text-2xl font-bold text-primary">
                {data.languages.length > 0
                  ? data.languages.reduce((a, b) => (a.value > b.value ? a : b)).name
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Average Assessments/Week</p>
              <p className="text-2xl font-bold text-primary">
                {data.total > 0 ? Math.round((data.thisWeek / 7) * 7) : 0}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">High Risk Percentage</p>
              <p className="text-2xl font-bold text-destructive">
                {data.total > 0 ? ((data.highRisk / data.total) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
