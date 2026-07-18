import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, AlertTriangle, FileText, TrendingUp, Download } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { exportAssessmentToPDF } from "@/lib/pdfExport";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Assessment {
  id: string;
  narrative: string;
  processed_result: any;
  assessment_date: string;
  language_detected: string | null;
  cultural_idioms_found: string[] | null;
  risk_level: string | null;
  metadata: any;
  patient_id?: string | null;
}

interface AssessmentHistoryProps {
  patientId?: string | null;
}

export const AssessmentHistory = ({ patientId }: AssessmentHistoryProps = {}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    highRisk: 0,
  });

  useEffect(() => {
    if (!user) return;

    fetchAssessments();

    // Set up real-time subscription
    const channel = supabase
      .channel("assessment-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "assessments",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setAssessments((prev) => [payload.new as Assessment, ...prev]);
          updateStats([payload.new as Assessment, ...assessments]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, patientId]);

  const fetchAssessments = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from("assessments")
        .select(`
          *,
          patients (
            patient_identifier,
            date_of_birth,
            gender,
            cultural_background,
            language_preference
          )
        `)
        .eq("user_id", user.id)
        .order("assessment_date", { ascending: false })
        .limit(50);

      if (patientId) {
        query = query.eq("patient_id", patientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setAssessments(data || []);
      updateStats(data || []);
    } catch (error) {
      console.error("Error fetching assessments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async (assessment: Assessment) => {
    let patientData = null;
    
    if (assessment.patient_id) {
      const { data } = await supabase
        .from("patients")
        .select("patient_identifier, date_of_birth, gender, cultural_background, language_preference")
        .eq("id", assessment.patient_id)
        .single();
      
      patientData = data;
    }

    exportAssessmentToPDF({
      ...assessment,
      patient: patientData,
    });

    toast({
      title: "PDF Exported",
      description: "Assessment report has been downloaded",
    });
  };

  const updateStats = (data: Assessment[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = data.filter(
      (a) => new Date(a.assessment_date) >= today
    ).length;

    const highRiskCount = data.filter(
      (a) => a.risk_level === "high" || a.risk_level === "critical"
    ).length;

    setStats({
      total: data.length,
      today: todayCount,
      highRisk: highRiskCount,
    });
  };

  const getRiskBadgeVariant = (riskLevel: string | null) => {
    switch (riskLevel?.toLowerCase()) {
      case "critical":
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Assessment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading history...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Assessment History
        </CardTitle>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <FileText className="h-3 w-3" />
              Total
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3" />
              Today
            </div>
            <div className="text-2xl font-bold">{stats.today}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <AlertTriangle className="h-3 w-3" />
              High Risk
            </div>
            <div className="text-2xl font-bold text-destructive">
              {stats.highRisk}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {assessments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No assessments yet. Process your first narrative to start building history.
            </p>
          ) : (
            <div className="space-y-3">
              {assessments.map((assessment) => (
                <Dialog key={assessment.id}>
                  <DialogTrigger asChild>
                    <div className="border rounded-lg p-3 hover:bg-muted/50 cursor-pointer transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {format(
                              new Date(assessment.assessment_date),
                              "MMM d, yyyy 'at' h:mm a"
                            )}
                          </span>
                        </div>
                        {assessment.risk_level && (
                          <Badge
                            variant={getRiskBadgeVariant(assessment.risk_level)}
                            className="text-xs"
                          >
                            {assessment.risk_level}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                        {assessment.narrative}
                      </p>
                      <p className="text-[11px] text-primary mt-1">Click to view full assessment →</p>
                      {assessment.cultural_idioms_found &&
                        assessment.cultural_idioms_found.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {assessment.cultural_idioms_found
                              .slice(0, 3)
                              .map((idiom, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {idiom}
                                </Badge>
                              ))}
                            {assessment.cultural_idioms_found.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{assessment.cultural_idioms_found.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center justify-between">
                        <span>Assessment Details</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportPDF(assessment)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export PDF
                        </Button>
                      </DialogTitle>
                      <DialogDescription>
                        Recorded on{" "}
                        {format(
                          new Date(assessment.assessment_date),
                          "MMMM d, yyyy 'at' h:mm a"
                        )}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Original Narrative</h4>
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                          {assessment.narrative}
                        </p>
                      </div>
                      {assessment.language_detected && (
                        <div>
                          <h4 className="font-semibold mb-2">Language Detected</h4>
                          <Badge variant="secondary">
                            {assessment.language_detected}
                          </Badge>
                        </div>
                      )}
                      {assessment.processed_result && (
                        <div>
                          <h4 className="font-semibold mb-2">Clinical Abstract</h4>
                          <div className="text-sm space-y-2 bg-muted p-3 rounded">
                            {Object.entries(assessment.processed_result).map(
                              ([key, value]) => (
                                <div key={key}>
                                  <strong className="capitalize">
                                    {key.replace(/_/g, " ")}:
                                  </strong>{" "}
                                  {typeof value === "object"
                                    ? JSON.stringify(value)
                                    : String(value)}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
