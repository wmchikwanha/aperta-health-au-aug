import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Calendar, User, FileText, Plus, Loader2, Brain, Shield, AlertTriangle, ClipboardList, TrendingUp, Download, Clock, Bell, BellOff, CheckCircle, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { z } from "zod";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { exportCaseSummaryToPDF } from "@/lib/caseSummaryPdfExport";
import { getGenderLabel, getLanguageName } from "@/lib/languages";
import { ATSISafetyFlag } from "@/components/ATSISafetyFlag";

interface Patient {
  id: string;
  patient_identifier: string;
  date_of_birth: string | null;
  gender: string | null;
  language_preference: string | null;
  cultural_background: string | null;
  created_at: string;
  metadata?: any;
}

interface Assessment {
  id: string;
  narrative: string;
  assessment_date: string;
  language_detected: string | null;
  risk_level: string | null;
  processed_result?: any;
}

interface TreatmentNote {
  id: string;
  note_type: string;
  content: string;
  created_at: string;
}

interface DiagnosticFormulation {
  id: string;
  primary_diagnosis_code: string;
  primary_diagnosis_name: string;
  diagnostic_framework: string;
  diagnosis_confidence: string | null;
  diagnostic_reasoning: string | null;
  status: string | null;
  formulated_at: string | null;
  created_at: string | null;
  differential_diagnoses?: any;
  cultural_formulation?: string | null;
}

interface CrisisIntervention {
  id: string;
  crisis_type: string;
  severity_level: string;
  outcome: string | null;
  referral_made: boolean | null;
  referral_type: string | null;
  referral_destination: string | null;
  crisis_started_at: string | null;
  resolved_at: string | null;
  created_at: string | null;
  interventions_applied?: any;
}

interface ScreeningAssessment {
  id: string;
  tool_type: string;
  total_score: number;
  severity_level: string | null;
  interpretation: string | null;
  administered_at: string;
}

interface Appointment {
  id: string;
  scheduled_at: string;
  appointment_type: string;
  status: string;
  duration_minutes: number;
  notes: string | null;
  reminder_sent: boolean | null;
  reminder_sent_at: string | null;
  created_at: string;
}

const TOOL_COLORS: Record<string, string> = {
  'PHQ-9': 'hsl(var(--chart-1))',
  'GAD-7': 'hsl(var(--chart-2))',
  'PCL-5': 'hsl(var(--chart-3))',
  'MMSE': 'hsl(var(--chart-4))',
  'PSQ': 'hsl(var(--chart-5))',
  'PRIME-R-5': 'hsl(217, 91%, 60%)',
};

const TOOL_MAX_SCORES: Record<string, number> = {
  'PHQ-9': 27,
  'GAD-7': 21,
  'PCL-5': 80,
  'MMSE': 30,
  'PSQ': 6,
  'PRIME-R-5': 30,
};

interface PatientProfileProps {
  patientId: string;
  onBack: () => void;
}

const noteSchema = z.object({
  content: z.string().trim().min(10, "Note must be at least 10 characters").max(2000),
});

const noteTypes = ["Progress Note", "Treatment Plan", "Clinical Observation", "Follow-up", "Consultation"];

export const PatientProfile = ({ patientId, onBack }: PatientProfileProps) => {
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [treatmentNotes, setTreatmentNotes] = useState<TreatmentNote[]>([]);
  const [diagnosticFormulations, setDiagnosticFormulations] = useState<DiagnosticFormulation[]>([]);
  const [crisisInterventions, setCrisisInterventions] = useState<CrisisIntervention[]>([]);
  const [screeningAssessments, setScreeningAssessments] = useState<ScreeningAssessment[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingNote, setAddingNote] = useState(false);
  const [noteType, setNoteType] = useState(noteTypes[0]);
  const [noteContent, setNoteContent] = useState("");
  const [noteError, setNoteError] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchPatientData();

    const assessmentsChannel = supabase
      .channel(`patient-assessments-${patientId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assessments', filter: `patient_id=eq.${patientId}` },
        () => fetchAssessments()
      )
      .subscribe();

    const notesChannel = supabase
      .channel(`patient-notes-${patientId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'treatment_notes', filter: `patient_id=eq.${patientId}` },
        () => fetchTreatmentNotes()
      )
      .subscribe();

    const diagnosticChannel = supabase
      .channel(`patient-diagnostics-${patientId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'diagnostic_formulations', filter: `patient_id=eq.${patientId}` },
        () => fetchDiagnosticFormulations()
      )
      .subscribe();

    const crisisChannel = supabase
      .channel(`patient-crisis-${patientId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crisis_interventions', filter: `patient_id=eq.${patientId}` },
        () => fetchCrisisInterventions()
      )
      .subscribe();

    const screeningChannel = supabase
      .channel(`patient-screening-${patientId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'screening_assessments', filter: `patient_id=eq.${patientId}` },
        () => fetchScreeningAssessments()
      )
      .subscribe();

    const appointmentsChannel = supabase
      .channel(`patient-appointments-${patientId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments', filter: `patient_id=eq.${patientId}` },
        () => fetchAppointments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(assessmentsChannel);
      supabase.removeChannel(notesChannel);
      supabase.removeChannel(diagnosticChannel);
      supabase.removeChannel(crisisChannel);
      supabase.removeChannel(screeningChannel);
      supabase.removeChannel(appointmentsChannel);
    };
  }, [patientId]);

  const fetchPatientData = async () => {
    setLoading(true);
    await Promise.all([
      fetchPatient(),
      fetchAssessments(),
      fetchTreatmentNotes(),
      fetchDiagnosticFormulations(),
      fetchCrisisInterventions(),
      fetchScreeningAssessments(),
      fetchAppointments()
    ]);
    setLoading(false);
  };

  const fetchPatient = async () => {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (error) {
      console.error('Error fetching patient:', error);
      toast({
        title: "Error",
        description: "Failed to load patient data",
        variant: "destructive",
      });
      return;
    }
    setPatient(data);
  };

  const fetchAssessments = async () => {
    const { data, error } = await supabase
      .from('assessments')
      .select('id, narrative, assessment_date, language_detected, risk_level, processed_result')
      .eq('patient_id', patientId)
      .order('assessment_date', { ascending: false });

    if (error) {
      console.error('Error fetching assessments:', error);
      return;
    }
    setAssessments(data || []);
  };

  const fetchTreatmentNotes = async () => {
    const { data, error } = await supabase
      .from('treatment_notes')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching treatment notes:', error);
      return;
    }
    setTreatmentNotes(data || []);
  };

  const fetchDiagnosticFormulations = async () => {
    const { data, error } = await supabase
      .from('diagnostic_formulations')
      .select('id, primary_diagnosis_code, primary_diagnosis_name, diagnostic_framework, diagnosis_confidence, diagnostic_reasoning, status, formulated_at, created_at, differential_diagnoses, cultural_formulation')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching diagnostic formulations:', error);
      return;
    }
    setDiagnosticFormulations(data || []);
  };

  const fetchCrisisInterventions = async () => {
    const { data, error } = await supabase
      .from('crisis_interventions')
      .select('id, crisis_type, severity_level, outcome, referral_made, referral_type, referral_destination, crisis_started_at, resolved_at, created_at, interventions_applied')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching crisis interventions:', error);
      return;
    }
    setCrisisInterventions(data || []);
  };

  const fetchScreeningAssessments = async () => {
    const { data, error } = await supabase
      .from('screening_assessments')
      .select('id, tool_type, total_score, severity_level, interpretation, administered_at')
      .eq('patient_id', patientId)
      .order('administered_at', { ascending: true });

    if (error) {
      console.error('Error fetching screening assessments:', error);
      return;
    }
    setScreeningAssessments(data || []);
  };

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select('id, scheduled_at, appointment_type, status, duration_minutes, notes, reminder_sent, reminder_sent_at, created_at')
      .eq('patient_id', patientId)
      .order('scheduled_at', { ascending: false });

    if (error) {
      console.error('Error fetching appointments:', error);
      return;
    }
    setAppointments(data || []);
  };

  // Prepare chart data - group by date and include all tool types
  const getChartData = () => {
    const dateMap = new Map<string, any>();
    
    screeningAssessments.forEach(assessment => {
      const dateKey = format(new Date(assessment.administered_at), 'MMM dd');
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { date: dateKey });
      }
      const entry = dateMap.get(dateKey);
      // Normalize scores to percentage for comparison
      const maxScore = TOOL_MAX_SCORES[assessment.tool_type] || 100;
      entry[assessment.tool_type] = Math.round((assessment.total_score / maxScore) * 100);
      entry[`${assessment.tool_type}_raw`] = assessment.total_score;
    });
    
    return Array.from(dateMap.values());
  };

  // Get unique tool types used
  const getUsedToolTypes = () => {
    const types = new Set(screeningAssessments.map(a => a.tool_type));
    return Array.from(types);
  };

  const handleAddNote = async () => {
    setNoteError("");
    
    const validation = noteSchema.safeParse({ content: noteContent });
    if (!validation.success) {
      setNoteError(validation.error.errors[0].message);
      return;
    }

    setAddingNote(true);
    try {
      const { error } = await supabase.from('treatment_notes').insert({
        patient_id: patientId,
        user_id: user!.id,
        note_type: noteType,
        content: noteContent,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Treatment note added",
      });
      setNoteContent("");
      setNoteType(noteTypes[0]);
      fetchTreatmentNotes();
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: "Error",
        description: "Failed to add treatment note",
        variant: "destructive",
      });
    } finally {
      setAddingNote(false);
    }
  };

  const formatAgeBand = (band: string | null) => {
    if (!band) return null;
    const labels: Record<string, string> = {
      under_18: "Under 18", "18-25": "18–25", "26-35": "26–35",
      "36-45": "36–45", "46-55": "46–55", "56-65": "56–65", over_65: "Over 65",
    };
    return labels[band] ?? band;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading patient profile...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">Patient not found</p>
        </CardContent>
      </Card>
    );
  }

  const handleExportCaseSummary = () => {
    exportCaseSummaryToPDF({
      patient: patient!,
      assessments,
      screeningAssessments,
      diagnosticFormulations,
      treatmentNotes,
      crisisInterventions,
    });
    toast({
      title: "PDF Generated",
      description: "Case summary has been downloaded",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Patients
        </Button>
        <Button onClick={handleExportCaseSummary} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Case Summary
        </Button>
      </div>

      {/* Aboriginal & Torres Strait Islander cultural safety banner */}
      <ATSISafetyFlag
        identifies={!!patient.metadata?.atsi_identifies}
        identityLabel={patient.metadata?.atsi_identity_label}
      />

      {/* Patient Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>{patient.patient_identifier}</CardTitle>
              <CardDescription>
                Patient since {format(new Date(patient.created_at), 'MMMM dd, yyyy')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patient.date_of_birth && (
              <div>
                <p className="text-sm text-muted-foreground">Date of Birth</p>
                <p className="font-medium">{patient.date_of_birth}</p>
              </div>
            )}
            {patient.gender && (
              <div>
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="font-medium">{getGenderLabel(patient.gender)}</p>
              </div>
            )}
            {patient.language_preference && (
              <div>
                <p className="text-sm text-muted-foreground">Language</p>
                <p className="font-medium">{getLanguageName(patient.language_preference ?? '')}</p>
              </div>
            )}
            {patient.cultural_background && (
              <div>
                <p className="text-sm text-muted-foreground">Cultural Background</p>
                <p className="font-medium">{patient.cultural_background}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assessment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Assessment History
            </CardTitle>
            <CardDescription>{assessments.length} total assessments</CardDescription>
          </CardHeader>
          <CardContent>
            {assessments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No assessments yet
              </p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {assessments.map((assessment) => (
                  <div key={assessment.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {format(new Date(assessment.assessment_date), 'MMM dd, yyyy')}
                      </span>
                      {assessment.risk_level && (
                        <Badge variant={assessment.risk_level === 'high' ? 'destructive' : 'secondary'}>
                          {assessment.risk_level}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {assessment.narrative}
                    </p>
                    {assessment.language_detected && (
                      <Badge variant="outline" className="text-xs">
                        {assessment.language_detected}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Treatment Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Treatment Notes
            </CardTitle>
            <CardDescription>{treatmentNotes.length} total notes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Add Note Form */}
              <div className="space-y-3 border-b pb-4">
                <div>
                  <Label htmlFor="note_type">Note Type</Label>
                  <Select value={noteType} onValueChange={setNoteType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {noteTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="note_content">Note Content</Label>
                  <Textarea
                    id="note_content"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Enter treatment note..."
                    rows={3}
                  />
                  {noteError && (
                    <p className="text-sm text-destructive mt-1">{noteError}</p>
                  )}
                </div>
                <Button onClick={handleAddNote} disabled={addingNote} size="sm">
                  {addingNote ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add Note
                </Button>
              </div>

              {/* Notes List */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {treatmentNotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No treatment notes yet
                  </p>
                ) : (
                  treatmentNotes.map((note) => (
                    <div key={note.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{note.note_type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(note.created_at), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diagnostic History and Crisis Interventions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Diagnostic Formulation History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Diagnostic History
            </CardTitle>
            <CardDescription>{diagnosticFormulations.length} diagnostic formulations</CardDescription>
          </CardHeader>
          <CardContent>
            {diagnosticFormulations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No diagnostic formulations yet
              </p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {diagnosticFormulations.map((formulation) => (
                  <div key={formulation.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {formulation.formulated_at 
                          ? format(new Date(formulation.formulated_at), 'MMM dd, yyyy')
                          : formulation.created_at 
                            ? format(new Date(formulation.created_at), 'MMM dd, yyyy')
                            : 'Date unknown'}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {formulation.diagnostic_framework}
                        </Badge>
                        {formulation.status && (
                          <Badge variant={formulation.status === 'approved' ? 'default' : 'secondary'}>
                            {formulation.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{formulation.primary_diagnosis_name}</p>
                      <p className="text-xs text-muted-foreground">{formulation.primary_diagnosis_code}</p>
                    </div>
                    {formulation.diagnosis_confidence && (
                      <Badge 
                        variant={
                          formulation.diagnosis_confidence === 'definite' ? 'default' :
                          formulation.diagnosis_confidence === 'probable' ? 'secondary' : 'outline'
                        }
                        className="text-xs"
                      >
                        {formulation.diagnosis_confidence}
                      </Badge>
                    )}
                    {formulation.diagnostic_reasoning && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {formulation.diagnostic_reasoning}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Crisis Intervention Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="h-5 w-5" />
              Crisis Intervention Logs
            </CardTitle>
            <CardDescription>{crisisInterventions.length} crisis interventions</CardDescription>
          </CardHeader>
          <CardContent>
            {crisisInterventions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No crisis interventions recorded
              </p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {crisisInterventions.map((intervention) => (
                  <div key={intervention.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {intervention.crisis_started_at 
                          ? format(new Date(intervention.crisis_started_at), 'MMM dd, yyyy HH:mm')
                          : intervention.created_at 
                            ? format(new Date(intervention.created_at), 'MMM dd, yyyy HH:mm')
                            : 'Date unknown'}
                      </span>
                      <Badge 
                        variant={
                          intervention.severity_level === 'critical' ? 'destructive' :
                          intervention.severity_level === 'high' ? 'destructive' :
                          intervention.severity_level === 'moderate' ? 'secondary' : 'outline'
                        }
                      >
                        {intervention.severity_level}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="font-medium text-sm capitalize">
                        {intervention.crisis_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {intervention.outcome && (
                      <div>
                        <p className="text-xs text-muted-foreground">Outcome</p>
                        <p className="text-sm">{intervention.outcome}</p>
                      </div>
                    )}
                    {intervention.referral_made && (
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="text-xs">
                          Referral: {intervention.referral_type || 'Made'}
                        </Badge>
                        {intervention.referral_destination && (
                          <span className="text-muted-foreground text-xs">
                            → {intervention.referral_destination}
                          </span>
                        )}
                      </div>
                    )}
                    {intervention.resolved_at && (
                      <p className="text-xs text-green-600">
                        Resolved: {format(new Date(intervention.resolved_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Appointment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Appointment History
          </CardTitle>
          <CardDescription>
            {appointments.length} appointments • Past and upcoming sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No appointments scheduled
            </p>
          ) : (
            <Tabs defaultValue="upcoming" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="upcoming">
                  Upcoming ({appointments.filter(a => new Date(a.scheduled_at) >= new Date()).length})
                </TabsTrigger>
                <TabsTrigger value="past">
                  Past ({appointments.filter(a => new Date(a.scheduled_at) < new Date()).length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="upcoming" className="space-y-3 max-h-[400px] overflow-y-auto">
                {appointments
                  .filter(a => new Date(a.scheduled_at) >= new Date())
                  .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
                  .map((appointment) => (
                    <div key={appointment.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">
                            {format(new Date(appointment.scheduled_at), 'MMM dd, yyyy')} at {format(new Date(appointment.scheduled_at), 'HH:mm')}
                          </span>
                        </div>
                        <Badge 
                          variant={
                            appointment.status === 'confirmed' ? 'default' :
                            appointment.status === 'scheduled' ? 'secondary' :
                            appointment.status === 'cancelled' ? 'destructive' : 'outline'
                          }
                        >
                          {appointment.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="capitalize">
                          {appointment.appointment_type.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {appointment.duration_minutes} min
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {appointment.reminder_sent ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <Bell className="h-3 w-3" />
                            <span>Reminder sent {appointment.reminder_sent_at ? format(new Date(appointment.reminder_sent_at), 'MMM dd') : ''}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <BellOff className="h-3 w-3" />
                            <span>Reminder not sent</span>
                          </div>
                        )}
                      </div>
                      {appointment.notes && (
                        <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                      )}
                    </div>
                  ))}
                {appointments.filter(a => new Date(a.scheduled_at) >= new Date()).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming appointments
                  </p>
                )}
              </TabsContent>
              
              <TabsContent value="past" className="space-y-3 max-h-[400px] overflow-y-auto">
                {appointments
                  .filter(a => new Date(a.scheduled_at) < new Date())
                  .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
                  .map((appointment) => (
                    <div key={appointment.id} className="border rounded-lg p-3 space-y-2 opacity-80">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {format(new Date(appointment.scheduled_at), 'MMM dd, yyyy')} at {format(new Date(appointment.scheduled_at), 'HH:mm')}
                          </span>
                        </div>
                        <Badge 
                          variant={
                            appointment.status === 'completed' ? 'default' :
                            appointment.status === 'cancelled' ? 'destructive' :
                            appointment.status === 'no_show' ? 'destructive' : 'outline'
                          }
                        >
                          <span className="flex items-center gap-1">
                            {appointment.status === 'completed' && <CheckCircle className="h-3 w-3" />}
                            {appointment.status === 'cancelled' && <XCircle className="h-3 w-3" />}
                            {appointment.status === 'no_show' && <XCircle className="h-3 w-3" />}
                            {appointment.status}
                          </span>
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="capitalize">
                          {appointment.appointment_type.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {appointment.duration_minutes} min
                        </span>
                      </div>
                      {appointment.reminder_sent && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Bell className="h-3 w-3" />
                          <span>Reminder was sent {appointment.reminder_sent_at ? format(new Date(appointment.reminder_sent_at), 'MMM dd') : ''}</span>
                        </div>
                      )}
                      {appointment.notes && (
                        <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                      )}
                    </div>
                  ))}
                {appointments.filter(a => new Date(a.scheduled_at) < new Date()).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No past appointments
                  </p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Screening Assessment History with Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Screening Assessment History
          </CardTitle>
          <CardDescription>
            {screeningAssessments.length} screening assessments • Trend visualization shows normalized scores (0-100%)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {screeningAssessments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No screening assessments yet
            </p>
          ) : (
            <div className="space-y-6">
              {/* Trend Chart */}
              {getChartData().length > 1 && (
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getChartData()}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis 
                        domain={[0, 100]} 
                        tickFormatter={(value) => `${value}%`}
                        className="text-xs"
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-popover border rounded-lg p-2 shadow-lg">
                                <p className="font-medium text-sm">{label}</p>
                                {payload.map((entry: any) => {
                                  const toolType = entry.dataKey;
                                  const rawScore = entry.payload[`${toolType}_raw`];
                                  const maxScore = TOOL_MAX_SCORES[toolType] || 100;
                                  return (
                                    <p key={toolType} className="text-sm" style={{ color: entry.color }}>
                                      {toolType}: {rawScore}/{maxScore} ({entry.value}%)
                                    </p>
                                  );
                                })}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      {getUsedToolTypes().map(toolType => (
                        <Line
                          key={toolType}
                          type="monotone"
                          dataKey={toolType}
                          stroke={TOOL_COLORS[toolType] || 'hsl(var(--primary))'}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Tool Legend with latest scores */}
              <div className="flex flex-wrap gap-2">
                {getUsedToolTypes().map(toolType => {
                  const latest = screeningAssessments
                    .filter(a => a.tool_type === toolType)
                    .sort((a, b) => new Date(b.administered_at).getTime() - new Date(a.administered_at).getTime())[0];
                  return (
                    <Badge
                      key={toolType}
                      variant="outline"
                      className="flex items-center gap-1"
                      style={{ borderColor: TOOL_COLORS[toolType] }}
                    >
                      <TrendingUp className="h-3 w-3" style={{ color: TOOL_COLORS[toolType] }} />
                      {toolType}: {latest?.total_score}/{TOOL_MAX_SCORES[toolType] || '?'}
                    </Badge>
                  );
                })}
              </div>

              {/* Assessment List */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {[...screeningAssessments]
                  .sort((a, b) => new Date(b.administered_at).getTime() - new Date(a.administered_at).getTime())
                  .map((assessment) => (
                  <div key={assessment.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline"
                          style={{ borderColor: TOOL_COLORS[assessment.tool_type] }}
                        >
                          {assessment.tool_type}
                        </Badge>
                        <span className="text-sm font-medium">
                          {assessment.total_score}/{TOOL_MAX_SCORES[assessment.tool_type] || '?'}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(assessment.administered_at), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {assessment.severity_level && (
                        <Badge 
                          variant={
                            assessment.severity_level.toLowerCase().includes('severe') ? 'destructive' :
                            assessment.severity_level.toLowerCase().includes('moderate') ? 'secondary' : 'outline'
                          }
                        >
                          {assessment.severity_level}
                        </Badge>
                      )}
                    </div>
                    {assessment.interpretation && (
                      <p className="text-sm text-muted-foreground">{assessment.interpretation}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
