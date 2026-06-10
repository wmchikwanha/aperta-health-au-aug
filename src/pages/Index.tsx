import { useState, useEffect } from "react";
import { Stethoscope, LogOut, User, History, BarChart3, Users, ClipboardList, Shield, Inbox, Settings, CloudOff } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { ConnectivityStatus } from "@/components/ConnectivityStatus";
import { OfflineBanner } from "@/components/OfflineBanner";
import { OfflineQueueView } from "@/components/OfflineQueueView";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { InputZone } from "@/components/InputZone";
import { ClinicalAbstract } from "@/components/ClinicalAbstract";
import { DemoScenarios } from "@/components/DemoScenarios";
import { ATSISafetyFlag } from "@/components/ATSISafetyFlag";
import { SafetyPlan } from "@/components/SafetyPlan";
import { AssessmentHistory } from "@/components/AssessmentHistory";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { ClinicalDashboard } from "@/components/ClinicalDashboard";
import { PatientList } from "@/components/PatientList";
import { PatientProfile } from "@/components/PatientProfile";
import { PatientHub } from "@/components/PatientHub";
import { PatientForm } from "@/components/PatientForm";
import { AskAI } from "@/components/AskAI";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Footer } from "@/components/Footer";
import { AboutDialog } from "@/components/AboutDialog";
import { HelpCentre } from "@/components/HelpCentre";
import { OnboardingTour } from "@/components/OnboardingTour";
import { ScreeningToolSelector } from "@/components/screening/ScreeningToolSelector";
import { ScreeningResults } from "@/components/screening/ScreeningResults";
import { GAD7Form } from "@/components/screening/GAD7Form";
import { PHQ9Form } from "@/components/screening/PHQ9Form";
import { PCL5Form } from "@/components/screening/PCL5Form";
import { MMSEForm } from "@/components/screening/MMSEForm";
import { PSQForm } from "@/components/screening/PSQForm";
import { PRIMER5Form } from "@/components/screening/PRIMER5Form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScreeningContext } from "@/components/ScreeningContext";
import { TreatmentPlanSuggestions } from "@/components/TreatmentPlanSuggestions";
import { AppointmentScheduler } from "@/components/AppointmentScheduler";
import { AppointmentList } from "@/components/AppointmentList";
import { DiagnosticFormulation } from "@/components/diagnosis/DiagnosticFormulation";
import { FirstAidModule } from "@/components/firstaid/FirstAidModule";
import { IdiomSubmissionDialog } from "@/components/IdiomSubmissionDialog";
import { IntakeQueue } from "@/components/IntakeQueue";
import { CHWReferralForm } from "@/components/CHWReferralForm";
import { AdminDashboard } from "@/components/AdminDashboard";
import {
  canAccessDiagnostics,
  canProcessNarrative,
  canAccessFullScreening,
  canAccessAnalytics,
  canViewAnalytics,
  canAccessCrisisProtocols,
  canAccessAskAI,
  isCHW,
  isAdmin,
  getRoleLabel,
} from "@/lib/permissions";

const Index = () => {
  const [narrative, setNarrative] = useState("");
  const [result, setResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingTokens, setProcessingTokens] = useState(0);
  const [activeTab, setActiveTab] = useState("patients");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [hubPatientId, setHubPatientId] = useState<string | null>(null);
  const [selectedPatientForAssessment, setSelectedPatientForAssessment] = useState<string | null>(null);
  const [currentAssessmentDate, setCurrentAssessmentDate] = useState<string>(new Date().toISOString());
  const [currentPatientData, setCurrentPatientData] = useState<any>(null);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [selectedScreeningTool, setSelectedScreeningTool] = useState<string | null>(null);
  const [screeningPatientId, setScreeningPatientId] = useState<string | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [patientScreeningData, setPatientScreeningData] = useState<any[]>([]);
  const { toast } = useToast();
  const { user, signOut, loading, userRole } = useAuth();
  const navigate = useNavigate();
  const { pendingCount: offlinePendingCount } = useOfflineQueue();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const loadPatients = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPatients(data);
      }
    };

    loadPatients();

    const channel = supabase
      .channel('index-patients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => loadPatients())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Sync patient context across all tabs when hub patient changes
  useEffect(() => {
    if (hubPatientId) {
      setSelectedPatientForAssessment(hubPatientId);
      setScreeningPatientId(hubPatientId);
    } else {
      setSelectedPatientForAssessment(null);
      setScreeningPatientId(null);
      setActiveTab((prev) =>
        ["assessment", "screening", "firstaid", "history"].includes(prev) ? "patients" : prev
      );
    }
  }, [hubPatientId]);

  // Load screening data when patient is selected for assessment
  useEffect(() => {
    const loadPatientScreeningData = async () => {
      if (!selectedPatientForAssessment) {
        setPatientScreeningData([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("screening_assessments")
          .select("*")
          .eq("patient_id", selectedPatientForAssessment)
          .order("administered_at", { ascending: false })
          .limit(5);

        if (error) throw error;
        setPatientScreeningData(data || []);
      } catch (error) {
        console.error("Error loading screening data:", error);
      }
    };

    loadPatientScreeningData();
  }, [selectedPatientForAssessment]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const processNarrative = async () => {
    setIsProcessing(true);
    setProcessingTokens(0);
    try {
      const NARRATIVE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-narrative`;
      const response = await fetch(NARRATIVE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ narrative }),
      });

      if (!response.ok || !response.headers.get("Content-Type")?.includes("text/event-stream")) {
        const errData = await response.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? `HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let data = null;

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const jsonStr = trimmed.slice(6).trim();
          if (jsonStr === "[DONE]") break outer;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.result) { data = parsed.result; }
            else if (parsed.error) { throw new Error(parsed.error); }
            else if (parsed.tokens) { setProcessingTokens(parsed.tokens as number); }
          } catch (e) { if ((e as Error).message !== "Unexpected token") throw e; }
        }
      }

      if (!data) throw new Error("No result received from server");

      setResult(data);
      setCurrentAssessmentDate(new Date().toISOString());
      
      // Fetch patient data if a patient is selected
      if (selectedPatientForAssessment) {
        const { data: patientData } = await supabase
          .from("patients")
          .select("patient_identifier, age_band, gender, cultural_background, language_preference")
          .eq("id", selectedPatientForAssessment)
          .single();
        setCurrentPatientData(patientData);
      }

      // Save assessment to database
      const { error: saveError } = await supabase.from("assessments").insert({
        user_id: user!.id,
        patient_id: selectedPatientForAssessment,
        narrative,
        processed_result: data,
        language_detected: data?.language_detected || null,
        cultural_idioms_found: data?.cultural_idioms_found || null,
        risk_level: data?.risk_level || null,
        metadata: {
          processing_time: new Date().toISOString(),
          version: "1.0",
        },
      });

      if (saveError) {
        console.error("Error saving assessment:", saveError);
        toast({
          title: "Warning",
          description: "Assessment processed but could not be saved to history",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Analysis Complete",
          description: "Assessment processed and saved to history",
        });
      }
    } catch (error) {
      console.error("Error processing narrative:", error);
      toast({
        title: "Processing Error",
        description: error.message || "Failed to process narrative. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const loadDemo = (demoNarrative: string) => {
    setNarrative(demoNarrative);
    setResult(null);
    toast({
      title: "Demo Loaded",
      description: "Example scenario loaded. Click 'Process Narrative' to see the analysis.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <OfflineBanner />
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Stethoscope className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground font-display tracking-tight">
                  Aperta Health
                </h1>
                <p className="text-sm text-muted-foreground">
                  Mental Health Decision Support · Refugee &amp; CALD clinical workflows · Hosted in Australia
                </p>
              </div>
              <span className="hidden md:inline-flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium border border-primary/20">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Data Sovereign · Privacy Act 1988 (APPs)
              </span>
              <HelpCentre />
              <AboutDialog />
              <ConnectivityStatus />
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button
                onClick={() => navigate("/self-assess")}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md animate-pulse hover:animate-none"
              >
                🆘 Get Help Now
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.email}</p>
                       {userRole && (
                        <Badge variant={isAdmin(userRole) ? "destructive" : isCHW(userRole) ? "default" : "secondary"} className="w-fit text-xs">
                          {getRoleLabel(userRole)}
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {(() => {
            const tabs = [
              { value: "patients", icon: Users, label: "Patients", show: true, disabled: false },
              { value: "intake", icon: Inbox, label: "Intake", show: true, disabled: false },
              { value: "assessment", icon: Stethoscope, label: "Assessment", show: true, disabled: !hubPatientId },
              { value: "screening", icon: ClipboardList, label: "Screening", show: true, disabled: !hubPatientId },
              { value: "firstaid", icon: Shield, label: "First Aid", show: canAccessCrisisProtocols(userRole), disabled: !hubPatientId, className: "data-[state=active]:text-destructive" },
              { value: "history", icon: History, label: "History", show: true, disabled: !hubPatientId },
              { value: "analytics", icon: BarChart3, label: "Analytics", show: canViewAnalytics(userRole), disabled: false },
              { value: "offline", icon: CloudOff, label: "Offline Queue", show: true, disabled: false },
              { value: "admin", icon: Settings, label: "Admin", show: isAdmin(userRole), disabled: false },
            ];
            const visibleTabs = tabs.filter(t => t.show);
            return (
              <TabsList className={`grid w-full max-w-5xl mx-auto mb-6`} style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}>
                {visibleTabs.map(t => {
                  const Icon = t.icon;
                  return (
                    <TabsTrigger key={t.value} value={t.value} disabled={t.disabled} className={`relative ${t.className || ''}`}>
                      <Icon className="h-4 w-4 mr-2" />
                      {t.label}
                      {t.value === "offline" && offlinePendingCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                          {offlinePendingCount}
                        </span>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            );
          })()}

          <TabsContent value="assessment">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Demo Scenarios (clinicians only) */}
              {canProcessNarrative(userRole) && (
                <div className="lg:col-span-1">
                  <DemoScenarios onLoadDemo={loadDemo} />
                </div>
              )}

              {/* Right Column - Split Screen */}
              <div className={canProcessNarrative(userRole) ? "lg:col-span-2 space-y-6" : "lg:col-span-3 space-y-6"}>
                {/* Input Zone — recording available to all, Process Narrative gated */}
                <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                  <InputZone
                    value={narrative}
                    onChange={setNarrative}
                    onProcess={canProcessNarrative(userRole) ? processNarrative : undefined}
                    isProcessing={isProcessing}
                    processingTokens={processingTokens}
                    selectedPatientId={selectedPatientForAssessment}
                    onPatientSelect={setSelectedPatientForAssessment}
                  />
                </div>

                {/* CHW: Show referral form instead of clinical processing */}
                {isCHW(userRole) && selectedPatientForAssessment && narrative && (
                  <CHWReferralForm
                    patientId={selectedPatientForAssessment}
                    patientName={currentPatientData?.patient_identifier || patients.find(p => p.id === selectedPatientForAssessment)?.patient_identifier || "Patient"}
                    narrativeText={narrative}
                    onSuccess={() => {
                      toast({ title: "Referral Sent", description: "The clinician will be notified." });
                    }}
                  />
                )}

                {/* Clinical-only sections below */}
                {canProcessNarrative(userRole) && (
                  <>
                    {/* Screening Context */}
                    <ScreeningContext
                      patientId={selectedPatientForAssessment}
                      onAutoPopulate={(text) => {
                        setNarrative(prev => prev ? `${text}\n\n---\n\nCLINICIAN INTERVIEW NOTES:\n${prev}` : text);
                      }}
                    />

                    {/* Clinical Abstract */}
                    <div className="bg-card border border-border rounded-lg p-6 shadow-sm min-h-[400px]">
                      <ClinicalAbstract
                        result={result}
                        narrative={narrative}
                        assessmentDate={currentAssessmentDate}
                        patientData={currentPatientData}
                        languageDetected={result?.language_detected}
                        culturalIdioms={result?.cultural_idioms_found}
                        riskLevel={result?.risk_level || null}
                        onClear={() => {
                          setResult(null);
                          setCurrentPatientData(null);
                          toast({
                            title: "Result Discarded",
                            description: "Processed narrative cleared. Transcript preserved.",
                          });
                        }}
                      />
                    </div>

                    {/* Idiom submission — shown after processing */}
                    {result && (
                      <div className="flex items-center justify-between px-1">
                        <p className="text-xs text-muted-foreground">
                          Encountered a cultural expression not captured above?
                        </p>
                        <IdiomSubmissionDialog
                          prefillLanguage={result?.language_detected}
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Treatment Plan — clinicians only */}
                {canAccessDiagnostics(userRole) && result && selectedPatientForAssessment && (
                  <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                    <TreatmentPlanSuggestions
                      screeningData={patientScreeningData}
                      mseFindings={{
                        appearance: result?.appearance,
                        speech: result?.speech,
                        mood: result?.mood,
                        perception: result?.perception,
                        risk: result?.risk,
                        clinical_impressions: result?.clinical_impressions
                      }}
                      patientContext={currentPatientData}
                    />
                  </div>
                )}

                {/* Diagnostic Formulation — clinicians only */}
                {canAccessDiagnostics(userRole) && result && selectedPatientForAssessment && (
                  <DiagnosticFormulation
                    patientId={selectedPatientForAssessment}
                    patientName={currentPatientData?.patient_identifier || "Patient"}
                    screeningData={patientScreeningData.reduce((acc: any, assessment: any) => {
                      const toolType = assessment.tool_type;
                      acc[toolType] = {
                        score: assessment.total_score,
                        severity: assessment.severity_level,
                        interpretation: assessment.interpretation
                      };
                      return acc;
                    }, {})}
                    mseFindings={{
                      appearance: result?.appearance,
                      speech: result?.speech,
                      mood: result?.mood,
                      affect: result?.affect,
                      thought_process: result?.thought_process,
                      thought_content: result?.thought_content,
                      perceptions: result?.perception,
                      cognition: result?.cognition,
                      insight: result?.insight,
                      judgment: result?.judgment,
                      risk_assessment: result?.risk
                    }}
                  />
                )}

                {/* Appointment Scheduler — clinicians only */}
                {canAccessDiagnostics(userRole) && result && selectedPatientForAssessment && (
                  <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                    <AppointmentScheduler
                      patientId={selectedPatientForAssessment}
                      patientName={currentPatientData?.patient_identifier || "Patient"}
                      treatmentPlanFollowUp="2 weeks"
                    />
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="screening">
            <div className="max-w-4xl mx-auto space-y-6">
              {!screeningPatientId ? (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold">Clinical Screening Tools</h2>
                  <p className="text-muted-foreground">
                    Select a patient to begin screening assessment
                  </p>
                  <Select value={screeningPatientId || ""} onValueChange={setScreeningPatientId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.patient_identifier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Clinical Screening Tools</h2>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setScreeningPatientId(null);
                        setSelectedScreeningTool(null);
                      }}
                    >
                      Change Patient
                    </Button>
                  </div>

                  {!selectedScreeningTool ? (
                    <ScreeningToolSelector
                      onSelectTool={setSelectedScreeningTool}
                      allowedTools={canAccessFullScreening(userRole) ? undefined : ["PHQ9"]}
                    />
                  ) : (
                    <div className="space-y-4">
                      <Button
                        variant="ghost"
                        onClick={() => setSelectedScreeningTool(null)}
                      >
                        ← Back to Tools
                      </Button>
                      
                      {selectedScreeningTool === "GAD7" && (
                        <GAD7Form
                          patientId={screeningPatientId}
                          onComplete={() => {
                            setSelectedScreeningTool(null);
                            toast({
                              title: "Assessment Saved",
                              description: "GAD-7 assessment has been saved successfully."
                            });
                          }}
                        />
                      )}
                      
                      {selectedScreeningTool === "PHQ9" && (
                        <PHQ9Form
                          patientId={screeningPatientId}
                          onComplete={() => {
                            setSelectedScreeningTool(null);
                            toast({
                              title: "Assessment Saved",
                              description: "PHQ-9 assessment has been saved successfully."
                            });
                          }}
                        />
                      )}
                      
                      {selectedScreeningTool === "PCL5" && (
                        <PCL5Form
                          patientId={screeningPatientId}
                          onComplete={() => {
                            setSelectedScreeningTool(null);
                            toast({
                              title: "Assessment Saved",
                              description: "PCL-5 assessment has been saved successfully."
                            });
                          }}
                        />
                      )}
                      
                      {selectedScreeningTool === "MMSE" && (
                        <MMSEForm
                          patientId={screeningPatientId}
                          onComplete={() => {
                            setSelectedScreeningTool(null);
                            toast({
                              title: "Assessment Saved",
                              description: "MMSE assessment has been saved successfully."
                            });
                          }}
                        />
                      )}
                      
                      {selectedScreeningTool === "PSQ" && (
                        <PSQForm
                          patientId={screeningPatientId}
                          onComplete={() => {
                            setSelectedScreeningTool(null);
                            toast({
                              title: "Assessment Saved",
                              description: "PSQ assessment has been saved successfully."
                            });
                          }}
                        />
                      )}
                      
                      {selectedScreeningTool === "PRIMER5" && (
                        <PRIMER5Form
                          patientId={screeningPatientId}
                          onComplete={() => {
                            setSelectedScreeningTool(null);
                            toast({
                              title: "Assessment Saved",
                              description: "PRIME-R-5 assessment has been saved successfully."
                            });
                          }}
                        />
                      )}
                    </div>
                  )}

                  <ScreeningResults patientId={screeningPatientId} />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="firstaid">
            <div className="max-w-4xl mx-auto space-y-6">
              {!screeningPatientId ? (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-red-800">Mental Health First Aid</h2>
                  <p className="text-muted-foreground">
                    Select a patient to initiate crisis intervention
                  </p>
                  <Select value={screeningPatientId || ""} onValueChange={setScreeningPatientId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.patient_identifier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setScreeningPatientId(null)}
                    >
                      ← Change Patient
                    </Button>
                  </div>
                  <FirstAidModule
                    patientId={screeningPatientId}
                    patientName={patients.find(p => p.id === screeningPatientId)?.patient_identifier || "Patient"}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="patients">
            {selectedPatientId ? (
              <PatientProfile
                patientId={selectedPatientId}
                onBack={() => setSelectedPatientId(null)}
              />
            ) : hubPatientId && patients.find(p => p.id === hubPatientId) ? (
              <PatientHub
                patient={patients.find(p => p.id === hubPatientId)!}
                onBack={() => setHubPatientId(null)}
                onViewProfile={() => setSelectedPatientId(hubPatientId)}
                onStartAssessment={() => setActiveTab("assessment")}
                onStartScreening={() => setActiveTab("screening")}
                onStartFirstAid={() => setActiveTab("firstaid")}
              />
            ) : (
              <PatientList
                onSelectPatient={(id) => setHubPatientId(id)}
                onCreatePatient={() => setShowPatientForm(true)}
              />
            )}
          </TabsContent>

          <TabsContent value="history">
            <div className="max-w-4xl mx-auto">
              <AssessmentHistory patientId={hubPatientId} />
            </div>
          </TabsContent>

          <TabsContent value="intake">
            <div className="max-w-4xl mx-auto">
              <IntakeQueue />
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="space-y-8">
              <ClinicalDashboard />
              <div className="border-t pt-8">
                <h2 className="text-2xl font-bold mb-6">Assessment Analytics</h2>
                <AnalyticsDashboard />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="offline">
            <OfflineQueueView />
          </TabsContent>

          <TabsContent value="admin">
            <AdminDashboard />
          </TabsContent>
        </Tabs>

        {/* Patient Form Dialog */}
        <Dialog open={showPatientForm} onOpenChange={setShowPatientForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Patient Profile</DialogTitle>
              <DialogDescription>
                Add a new patient to track their assessments and treatment notes.
              </DialogDescription>
            </DialogHeader>
            <PatientForm
              onSuccess={() => setShowPatientForm(false)}
              onCancel={() => setShowPatientForm(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Footer Info */}
        <div className="mt-12 p-6 bg-clinical-green-light/20 rounded-lg border border-clinical-green/30">
          <h3 className="font-semibold text-clinical-green-dark mb-3">
            About This Tool
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div>
              <strong className="text-foreground">Better:</strong> Understands cultural idioms across 10 languages (English, Shona, Ndebele, kiSwahili, Afrikaans, Xhosa, siZulu, Sotho, French, Portuguese)
            </div>
            <div>
              <strong className="text-foreground">Faster:</strong> Converts raw narratives into structured MSE format instantly
            </div>
            <div>
              <strong className="text-foreground">Safer:</strong> Automatic risk detection with RED ALERT protocol for immediate clinical review
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground italic">
            Note: This tool assists clinicians but does not diagnose. All outputs require validation by a qualified psychiatrist.
          </p>
        </div>

        {/* Self-Assessment CTA */}
        <div className="mt-6 p-6 bg-primary/5 rounded-lg border border-primary/20 text-center">
          <h3 className="font-semibold text-foreground mb-2">Client Self-Assessment Portal</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Share the self-assessment link with prospective patients. No login required — they'll be matched with mental health services in their area.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={() => {
                const url = `${window.location.origin}/self-assess`;
                navigator.clipboard.writeText(url);
                toast({ title: "Link copied", description: url });
              }}
            >
              Copy Self-Assessment Link
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/facility")}
            >
              Facility Registration Portal
            </Button>
          </div>
        </div>
      </main>
      <Footer />
      
      {/* AI Assistant — clinicians only */}
      {canAccessAskAI(userRole) && (
        <AskAI 
          context={result ? `Current Assessment:\n${narrative}\n\nMSE Summary:\nAppearance: ${result.appearance}\nSpeech: ${result.speech}\nMood: ${result.mood}\nPerception: ${result.perception}\nRisk: ${result.risk}` : narrative} 
          contextLabel={result ? "Discussing current assessment" : narrative ? "Discussing current narrative" : undefined}
        />
      )}
      
      {/* Onboarding Tour */}
      <OnboardingTour />
    </div>
  );
};

export default Index;