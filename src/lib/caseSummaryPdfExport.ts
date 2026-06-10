import jsPDF from "jspdf";
import { format } from "date-fns";

interface PatientData {
  patient_identifier: string;
  age_band?: string | null;
  gender?: string | null;
  cultural_background?: string | null;
  language_preference?: string | null;
  created_at: string;
}

interface Assessment {
  id: string;
  narrative: string;
  assessment_date: string;
  language_detected?: string | null;
  risk_level?: string | null;
  processed_result?: any;
}

interface ScreeningAssessment {
  id: string;
  tool_type: string;
  total_score: number;
  severity_level?: string | null;
  interpretation?: string | null;
  administered_at: string;
}

interface DiagnosticFormulation {
  id: string;
  primary_diagnosis_code: string;
  primary_diagnosis_name: string;
  diagnostic_framework: string;
  diagnosis_confidence?: string | null;
  diagnostic_reasoning?: string | null;
  status?: string | null;
  formulated_at?: string | null;
  differential_diagnoses?: any;
  cultural_formulation?: string | null;
}

interface TreatmentNote {
  id: string;
  note_type: string;
  content: string;
  created_at: string;
}

interface CrisisIntervention {
  id: string;
  crisis_type: string;
  severity_level: string;
  outcome?: string | null;
  referral_made?: boolean | null;
  referral_type?: string | null;
  referral_destination?: string | null;
  crisis_started_at?: string | null;
  resolved_at?: string | null;
  interventions_applied?: any;
}

interface CaseSummaryData {
  patient: PatientData;
  assessments: Assessment[];
  screeningAssessments: ScreeningAssessment[];
  diagnosticFormulations: DiagnosticFormulation[];
  treatmentNotes: TreatmentNote[];
  crisisInterventions: CrisisIntervention[];
}

const TOOL_MAX_SCORES: Record<string, number> = {
  'PHQ-9': 27,
  'GAD-7': 21,
  'PCL-5': 80,
  'MMSE': 30,
  'PSQ': 6,
  'PRIME-R-5': 30,
};

export const exportCaseSummaryToPDF = (data: CaseSummaryData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPos = 20;

  const checkNewPage = (requiredSpace: number = 30) => {
    if (yPos > pageHeight - requiredSpace) {
      doc.addPage();
      yPos = 20;
    }
  };

  const addSectionHeader = (title: string) => {
    checkNewPage(40);
    doc.setFillColor(59, 130, 246);
    doc.rect(margin, yPos, maxWidth, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin + 5, yPos + 7);
    doc.setTextColor(0, 0, 0);
    yPos += 15;
  };

  const addSubsectionHeader = (title: string) => {
    checkNewPage(25);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(59, 130, 246);
    doc.text(title, margin, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 6;
  };

  const addText = (text: string, indent: number = 0) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(text, maxWidth - indent);
    lines.forEach((line: string) => {
      checkNewPage(10);
      doc.text(line, margin + indent, yPos);
      yPos += 4.5;
    });
  };

  const addLabelValue = (label: string, value: string | null | undefined, indent: number = 0) => {
    if (!value) return;
    checkNewPage(10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`${label}: `, margin + indent, yPos);
    const labelWidth = doc.getTextWidth(`${label}: `);
    doc.setFont("helvetica", "normal");
    const valueLines = doc.splitTextToSize(value, maxWidth - indent - labelWidth);
    valueLines.forEach((line: string, idx: number) => {
      if (idx === 0) {
        doc.text(line, margin + indent + labelWidth, yPos);
      } else {
        yPos += 4.5;
        checkNewPage(10);
        doc.text(line, margin + indent + labelWidth, yPos);
      }
    });
    yPos += 5;
  };

  // ========== HEADER ==========
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 45, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("COMPREHENSIVE CASE SUMMARY", pageWidth / 2, 18, { align: "center" });
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Aperta Health Clinical Scribe", pageWidth / 2, 28, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Generated: ${format(new Date(), "MMMM dd, yyyy 'at' HH:mm")}`, pageWidth / 2, 38, { align: "center" });

  yPos = 55;
  doc.setTextColor(0, 0, 0);

  // ========== PATIENT DEMOGRAPHICS ==========
  addSectionHeader("PATIENT DEMOGRAPHICS");
  
  const formatAgeBand = (band: string | null | undefined) => {
    if (!band) return null;
    const labels: Record<string, string> = {
      under_18: "Under 18", "18-25": "18–25", "26-35": "26–35",
      "36-45": "36–45", "46-55": "46–55", "56-65": "56–65", over_65: "Over 65",
    };
    return labels[band] ?? band;
  };

  addLabelValue("Patient ID", data.patient.patient_identifier);
  if (data.patient.age_band) {
    addLabelValue("Age Band", formatAgeBand(data.patient.age_band));
  }
  addLabelValue("Gender", data.patient.gender);
  addLabelValue("Cultural Background", data.patient.cultural_background);
  addLabelValue("Language Preference", data.patient.language_preference);
  addLabelValue("Patient Since", format(new Date(data.patient.created_at), "MMMM dd, yyyy"));
  yPos += 5;

  // ========== SCREENING ASSESSMENTS ==========
  if (data.screeningAssessments.length > 0) {
    addSectionHeader("SCREENING ASSESSMENTS");
    
    // Group by tool type
    const toolGroups = data.screeningAssessments.reduce((acc, assessment) => {
      if (!acc[assessment.tool_type]) {
        acc[assessment.tool_type] = [];
      }
      acc[assessment.tool_type].push(assessment);
      return acc;
    }, {} as Record<string, ScreeningAssessment[]>);

    Object.entries(toolGroups).forEach(([toolType, assessments]) => {
      addSubsectionHeader(`${toolType} Results`);
      
      // Sort by date descending
      const sorted = [...assessments].sort((a, b) => 
        new Date(b.administered_at).getTime() - new Date(a.administered_at).getTime()
      );

      sorted.forEach((assessment, idx) => {
        const maxScore = TOOL_MAX_SCORES[assessment.tool_type] || '?';
        const dateStr = format(new Date(assessment.administered_at), "MMM dd, yyyy");
        let resultLine = `${dateStr}: Score ${assessment.total_score}/${maxScore}`;
        if (assessment.severity_level) {
          resultLine += ` - ${assessment.severity_level}`;
        }
        addText(`• ${resultLine}`, 3);
        if (assessment.interpretation && idx === 0) {
          addText(`  Interpretation: ${assessment.interpretation}`, 6);
        }
      });
      yPos += 3;
    });
    yPos += 5;
  }

  // ========== MSE FINDINGS (from most recent assessment) ==========
  const latestAssessment = data.assessments[0];
  if (latestAssessment?.processed_result) {
    addSectionHeader("MENTAL STATUS EXAMINATION (LATEST)");
    
    addText(`Assessment Date: ${format(new Date(latestAssessment.assessment_date), "MMMM dd, yyyy")}`, 0);
    yPos += 3;

    const result = latestAssessment.processed_result;
    
    if (latestAssessment.risk_level) {
      checkNewPage(20);
      const isHighRisk = latestAssessment.risk_level.toLowerCase().includes("high");
      doc.setFillColor(isHighRisk ? 239 : 234, isHighRisk ? 68 : 179, isHighRisk ? 68 : 8);
      doc.roundedRect(margin, yPos, maxWidth, 12, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`RISK LEVEL: ${latestAssessment.risk_level.toUpperCase()}`, margin + 5, yPos + 8);
      doc.setTextColor(0, 0, 0);
      yPos += 17;
    }

    const mseFields = [
      { label: "Appearance & Behaviour", value: result.appearance },
      { label: "Speech", value: result.speech },
      { label: "Mood & Affect", value: result.mood || result.affect },
      { label: "Thought Process", value: result.thought_process },
      { label: "Thought Content", value: result.thought_content },
      { label: "Perceptions", value: result.perception || result.perceptions },
      { label: "Cognition", value: result.cognition },
      { label: "Insight & Judgment", value: result.insight || result.judgment },
      { label: "Risk Assessment", value: result.risk || result.risk_assessment },
    ];

    mseFields.forEach(({ label, value }) => {
      if (value && value !== "Not documented") {
        addLabelValue(label, value);
      }
    });

    if (result.clinical_impressions) {
      yPos += 3;
      addSubsectionHeader("Clinical Impressions");
      addText(result.clinical_impressions);
    }

    if (latestAssessment.language_detected) {
      addLabelValue("Language Detected", latestAssessment.language_detected);
    }
    yPos += 5;
  }

  // ========== DIAGNOSTIC FORMULATIONS ==========
  if (data.diagnosticFormulations.length > 0) {
    addSectionHeader("DIAGNOSTIC FORMULATIONS");
    
    data.diagnosticFormulations.forEach((formulation, idx) => {
      const dateStr = formulation.formulated_at 
        ? format(new Date(formulation.formulated_at), "MMM dd, yyyy")
        : "Date unknown";
      
      addSubsectionHeader(`Diagnosis ${idx + 1} (${dateStr})`);
      
      addLabelValue("Primary Diagnosis", `${formulation.primary_diagnosis_name} (${formulation.primary_diagnosis_code})`);
      addLabelValue("Framework", formulation.diagnostic_framework);
      addLabelValue("Confidence", formulation.diagnosis_confidence);
      addLabelValue("Status", formulation.status);
      
      if (formulation.diagnostic_reasoning) {
        addLabelValue("Clinical Reasoning", formulation.diagnostic_reasoning);
      }

      if (formulation.differential_diagnoses && Array.isArray(formulation.differential_diagnoses) && formulation.differential_diagnoses.length > 0) {
        yPos += 2;
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Differential Diagnoses:", margin, yPos);
        yPos += 5;
        formulation.differential_diagnoses.forEach((diff: any) => {
          const diffText = typeof diff === 'string' ? diff : `${diff.name || diff.diagnosis} (${diff.code || ''})`;
          addText(`• ${diffText}`, 5);
        });
      }

      if (formulation.cultural_formulation) {
        addLabelValue("Cultural Formulation", formulation.cultural_formulation);
      }
      yPos += 5;
    });
  }

  // ========== TREATMENT NOTES ==========
  if (data.treatmentNotes.length > 0) {
    addSectionHeader("TREATMENT NOTES & PLANS");
    
    // Group by note type
    const noteGroups = data.treatmentNotes.reduce((acc, note) => {
      if (!acc[note.note_type]) {
        acc[note.note_type] = [];
      }
      acc[note.note_type].push(note);
      return acc;
    }, {} as Record<string, TreatmentNote[]>);

    Object.entries(noteGroups).forEach(([noteType, notes]) => {
      addSubsectionHeader(noteType);
      
      const sorted = [...notes].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      sorted.slice(0, 5).forEach(note => {
        const dateStr = format(new Date(note.created_at), "MMM dd, yyyy");
        addText(`[${dateStr}]`, 0);
        addText(note.content, 3);
        yPos += 2;
      });

      if (sorted.length > 5) {
        addText(`... and ${sorted.length - 5} more ${noteType.toLowerCase()} notes`, 3);
      }
      yPos += 3;
    });
  }

  // ========== CRISIS INTERVENTIONS ==========
  if (data.crisisInterventions.length > 0) {
    addSectionHeader("CRISIS INTERVENTIONS");
    
    // Alert banner
    checkNewPage(20);
    doc.setFillColor(239, 68, 68);
    doc.roundedRect(margin, yPos, maxWidth, 10, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`${data.crisisInterventions.length} CRISIS INTERVENTION(S) DOCUMENTED`, margin + 5, yPos + 7);
    doc.setTextColor(0, 0, 0);
    yPos += 15;

    data.crisisInterventions.forEach((intervention, idx) => {
      const dateStr = intervention.crisis_started_at 
        ? format(new Date(intervention.crisis_started_at), "MMM dd, yyyy HH:mm")
        : "Date unknown";
      
      addSubsectionHeader(`Crisis ${idx + 1}: ${intervention.crisis_type.replace(/_/g, ' ')} (${dateStr})`);
      
      addLabelValue("Severity", intervention.severity_level.toUpperCase());
      
      if (intervention.outcome) {
        addLabelValue("Outcome", intervention.outcome);
      }

      if (intervention.referral_made) {
        let referralText = "Yes";
        if (intervention.referral_type) referralText += ` - ${intervention.referral_type}`;
        if (intervention.referral_destination) referralText += ` → ${intervention.referral_destination}`;
        addLabelValue("Referral Made", referralText);
      }

      if (intervention.resolved_at) {
        addLabelValue("Resolved", format(new Date(intervention.resolved_at), "MMM dd, yyyy HH:mm"));
      } else {
        addText("⚠ NOT YET RESOLVED", 0);
      }

      if (intervention.interventions_applied && Array.isArray(intervention.interventions_applied)) {
        yPos += 2;
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Interventions Applied:", margin, yPos);
        yPos += 5;
        intervention.interventions_applied.forEach((int: any) => {
          const intText = typeof int === 'string' ? int : int.action || int.name || JSON.stringify(int);
          addText(`• ${intText}`, 5);
        });
      }
      yPos += 5;
    });
  }

  // ========== ASSESSMENT HISTORY SUMMARY ==========
  if (data.assessments.length > 1) {
    addSectionHeader("ASSESSMENT HISTORY SUMMARY");
    addText(`Total Assessments: ${data.assessments.length}`);
    yPos += 3;
    
    data.assessments.slice(0, 10).forEach(assessment => {
      const dateStr = format(new Date(assessment.assessment_date), "MMM dd, yyyy");
      let line = `• ${dateStr}`;
      if (assessment.risk_level) line += ` [Risk: ${assessment.risk_level}]`;
      if (assessment.language_detected) line += ` (${assessment.language_detected})`;
      addText(line, 0);
    });

    if (data.assessments.length > 10) {
      addText(`... and ${data.assessments.length - 10} more assessments`, 3);
    }
  }

  // ========== FOOTER ==========
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
    
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount}`,
      margin,
      pageHeight - 12
    );
    doc.text(
      `Patient: ${data.patient.patient_identifier}`,
      pageWidth / 2,
      pageHeight - 12,
      { align: "center" }
    );
    doc.text(
      format(new Date(), "yyyy-MM-dd"),
      pageWidth - margin,
      pageHeight - 12,
      { align: "right" }
    );
    doc.setFontSize(7);
    doc.text(
      "CONFIDENTIAL - For Clinical Use Only | Generated by Aperta Health Clinical Scribe",
      pageWidth / 2,
      pageHeight - 7,
      { align: "center" }
    );
  }

  // Save the PDF
  const fileName = `case_summary_${data.patient.patient_identifier}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
};
