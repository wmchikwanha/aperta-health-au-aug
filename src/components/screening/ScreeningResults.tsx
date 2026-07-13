import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Download, AlertTriangle, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { format } from "date-fns";
import { exportScreeningToPDF } from "@/lib/screening/screeningPdfExport";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface ScreeningResultsProps {
  patientId: string;
}

interface ScreeningAssessment {
  id: string;
  tool_type: string;
  total_score: number;
  severity_level: string;
  interpretation: string;
  administered_at: string;
  notes?: string;
  responses: any;
}

const TOOL_NAMES = {
  GAD7: "GAD-7",
  PHQ9: "PHQ-9",
  PCL5: "PCL-5",
  MMSE: "MMSE",
  PSQ: "PSQ",
  PRIMER5: "PRIME-R-5",
  RHS15: "RHS-15",
  HTQ4: "HTQ-IV",
  WHODAS2: "WHODAS 2.0",
  GDS15: "GDS-15",
};

const getSeverityColor = (severity: string) => {
  const lower = severity.toLowerCase();
  if (lower.includes("severe") || lower.includes("urgent") || lower.includes("multiple")) return "destructive";
  if (lower.includes("moderate")) return "default";
  if (lower.includes("mild") || lower.includes("positive")) return "secondary";
  return "outline";
};

const getTrendData = (assessments: ScreeningAssessment[], toolType: string) => {
  return assessments
    .filter(a => a.tool_type === toolType)
    .sort((a, b) => new Date(a.administered_at).getTime() - new Date(b.administered_at).getTime())
    .map(a => ({
      date: format(new Date(a.administered_at), "MMM d"),
      score: a.total_score,
      fullDate: a.administered_at
    }));
};

const calculateTrend = (data: { score: number }[], toolType: string) => {
  if (data.length < 2) return "stable";
  
  const firstScore = data[0].score;
  const lastScore = data[data.length - 1].score;
  const change = lastScore - firstScore;
  
  // For MMSE, higher is better. For others, lower is better.
  const isMMSE = toolType === "MMSE";
  
  if (Math.abs(change) < 2) return "stable"; // Within 2 points is stable
  
  if (isMMSE) {
    return change > 0 ? "improving" : "worsening";
  } else {
    return change < 0 ? "improving" : "worsening";
  }
};

const getTrendIcon = (trend: string) => {
  if (trend === "improving") return <TrendingDown className="h-4 w-4 text-success" />;
  if (trend === "worsening") return <TrendingUp className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const getTrendBadge = (trend: string) => {
  if (trend === "improving") return <Badge variant="outline" className="border-success text-success">Improving</Badge>;
  if (trend === "worsening") return <Badge variant="outline" className="border-destructive text-destructive">Worsening</Badge>;
  return <Badge variant="outline">Stable</Badge>;
};

export const ScreeningResults = ({ patientId }: ScreeningResultsProps) => {
  const [assessments, setAssessments] = useState<ScreeningAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [patientIdentifier, setPatientIdentifier] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    loadAssessments();
    loadPatientInfo();
  }, [patientId]);

  const loadPatientInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("patient_identifier")
        .eq("id", patientId)
        .single();

      if (error) throw error;
      if (data) setPatientIdentifier(data.patient_identifier);
    } catch (error) {
      console.error("Error loading patient info:", error);
    }
  };

  const loadAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from("screening_assessments")
        .select("*")
        .eq("patient_id", patientId)
        .order("administered_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setAssessments(data || []);
    } catch (error) {
      console.error("Error loading assessments:", error);
      toast({
        title: "Error",
        description: "Failed to load screening results.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hasAlerts = (assessment: ScreeningAssessment) => {
    if (assessment.tool_type === "PHQ9" && Array.isArray(assessment.responses)) {
      return assessment.responses[8] >= 1; // Suicidality question
    }
    if (assessment.tool_type === "PSQ") {
      return assessment.total_score > 1; // Multiple positive screens
    }
    return false;
  };

  const handleExportPDF = (assessment: ScreeningAssessment) => {
    const maxScores: Record<string, number> = {
      GAD7: 21,
      PHQ9: 27,
      PCL5: 80,
      MMSE: 30,
      PSQ: 5,
      PRIMER5: 30,
      RHS15: 56,
      HTQ4: 4,
      WHODAS2: 48,
      GDS15: 15,
    };

    exportScreeningToPDF({
      patientIdentifier,
      toolName: TOOL_NAMES[assessment.tool_type as keyof typeof TOOL_NAMES],
      totalScore: assessment.total_score,
      maxScore: maxScores[assessment.tool_type],
      severityLevel: assessment.severity_level,
      interpretation: assessment.interpretation,
      administeredAt: format(new Date(assessment.administered_at), "PPp"),
      notes: assessment.notes,
      responses: assessment.responses
    });

    toast({
      title: "PDF Exported",
      description: "Assessment report has been downloaded."
    });
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading results...</div>;
  }

  if (assessments.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No screening assessments yet. Select a tool above to begin.
        </CardContent>
      </Card>
    );
  }

  // Group assessments by tool type for trends
  const toolTypes = [...new Set(assessments.map(a => a.tool_type))];
  const trendsData = toolTypes.map(toolType => ({
    toolType,
    data: getTrendData(assessments, toolType),
    trend: calculateTrend(getTrendData(assessments, toolType), toolType)
  })).filter(t => t.data.length > 0);

  return (
    <div className="space-y-6">
      {/* Trend Charts Section */}
      {trendsData.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Score Trends</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {trendsData.map(({ toolType, data, trend }) => (
              <Card key={toolType}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {TOOL_NAMES[toolType as keyof typeof TOOL_NAMES]}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(trend)}
                      {getTrendBadge(trend)}
                    </div>
                  </div>
                  <CardDescription>
                    {data.length} assessment{data.length !== 1 ? 's' : ''} recorded
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        className="text-xs"
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis 
                        className="text-xs"
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px"
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="score" 
                        stroke={
                          trend === "improving" ? "hsl(var(--success))" :
                          trend === "worsening" ? "hsl(var(--destructive))" :
                          "hsl(var(--primary))"
                        }
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--background))", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Results Detail */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Recent Screening Results</h3>
        {assessments.map((assessment) => (
          <Card key={assessment.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">
                    {TOOL_NAMES[assessment.tool_type as keyof typeof TOOL_NAMES]}
                  </CardTitle>
                  <CardDescription>
                    {format(new Date(assessment.administered_at), "PPp")}
                  </CardDescription>
                </div>
                <Badge variant={getSeverityColor(assessment.severity_level)}>
                  {assessment.severity_level}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {hasAlerts(assessment) && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="font-semibold">
                    {assessment.tool_type === "PHQ9"
                      ? "Suicidality alert: Immediate safety assessment required"
                      : "Multiple psychotic symptoms: Urgent psychiatric evaluation required"}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Total Score: {assessment.total_score}
                </p>
                <p className="text-sm text-muted-foreground">
                  {assessment.interpretation}
                </p>
              </div>

              {assessment.notes && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground">Clinical Notes:</p>
                  <p className="text-sm mt-1">{assessment.notes}</p>
                </div>
              )}

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => handleExportPDF(assessment)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
