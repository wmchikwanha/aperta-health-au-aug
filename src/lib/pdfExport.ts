import jsPDF from "jspdf";

interface PatientData {
  patient_identifier?: string;
  age_band?: string;
  gender?: string;
  cultural_background?: string;
  language_preference?: string;
}

interface AssessmentData {
  narrative: string;
  processed_result: any;
  assessment_date: string;
  language_detected?: string;
  cultural_idioms_found?: string[];
  risk_level?: string;
  patient?: PatientData;
}

export const exportAssessmentToPDF = (assessment: AssessmentData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPos = 20;

  // Header
  doc.setFillColor(59, 130, 246); // primary blue
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Aperta Health Clinical Assessment", pageWidth / 2, 15, { align: "center" });
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Multi-lingual Psychiatric Clinical Scribe", pageWidth / 2, 25, { align: "center" });
  doc.setFontSize(10);
  doc.text(new Date(assessment.assessment_date).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }), pageWidth / 2, 33, { align: "center" });

  yPos = 50;
  doc.setTextColor(0, 0, 0);

  // Patient Information Section
  if (assessment.patient) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Patient Information", margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const ageBandLabels: Record<string, string> = {
      under_18: "Under 18", "18-25": "18–25", "26-35": "26–35",
      "36-45": "36–45", "46-55": "46–55", "56-65": "56–65", over_65: "Over 65",
    };
    const patientInfo = [
      `Patient ID: ${assessment.patient.patient_identifier || "N/A"}`,
      `Age Band: ${assessment.patient.age_band ? (ageBandLabels[assessment.patient.age_band] ?? assessment.patient.age_band) : "N/A"}`,
      `Gender: ${assessment.patient.gender || "N/A"}`,
      `Cultural Background: ${assessment.patient.cultural_background || "N/A"}`,
      `Language Preference: ${assessment.patient.language_preference || "N/A"}`,
    ];

    patientInfo.forEach((info) => {
      doc.text(info, margin, yPos);
      yPos += 6;
    });

    yPos += 5;
  }

  // Clinical Narrative Section
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Clinical Narrative", margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const narrativeLines = doc.splitTextToSize(assessment.narrative, maxWidth);
  narrativeLines.forEach((line: string) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 5;

  // Assessment Details
  if (assessment.language_detected || assessment.cultural_idioms_found?.length) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Assessment Details", margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    if (assessment.language_detected) {
      doc.text(`Language Detected: ${assessment.language_detected}`, margin, yPos);
      yPos += 6;
    }

    if (assessment.cultural_idioms_found?.length) {
      doc.text("Cultural Idioms Found:", margin, yPos);
      yPos += 6;
      assessment.cultural_idioms_found.forEach((idiom) => {
        doc.text(`  • ${idiom}`, margin + 5, yPos);
        yPos += 5;
      });
      yPos += 3;
    }
  }

  // Risk Level Alert
  if (assessment.risk_level) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    const isHighRisk = assessment.risk_level.toLowerCase().includes("high") || 
                       assessment.risk_level.toLowerCase().includes("urgent");
    
    if (isHighRisk) {
      doc.setFillColor(239, 68, 68); // red
    } else {
      doc.setFillColor(234, 179, 8); // yellow
    }
    
    doc.roundedRect(margin, yPos, maxWidth, 15, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`⚠ Risk Level: ${assessment.risk_level}`, margin + 5, yPos + 10);
    doc.setTextColor(0, 0, 0);
    yPos += 20;
  }

  // Mental Status Examination
  const result = assessment.processed_result;
  if (result && (result.appearance || result.speech || result.mood || result.perception || result.risk)) {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Mental Status Examination (MSE)", margin, yPos);
    yPos += 8;

    const mseFields = [
      { label: "Appearance & Behaviour", value: result.appearance },
      { label: "Speech & Thought Stream", value: result.speech },
      { label: "Mood & Affect", value: result.mood },
      { label: "Perception (Hallucinations/Illusions)", value: result.perception },
      { label: "Risk Assessment (Suicide/Homicide/Self-harm)", value: result.risk },
    ];

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    mseFields.forEach(({ label, value }) => {
      if (value && value !== "Not documented") {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, margin, yPos);
        yPos += 5;

        doc.setFont("helvetica", "normal");
        const valueLines = doc.splitTextToSize(value, maxWidth - 5);
        valueLines.forEach((line: string) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, margin + 5, yPos);
          yPos += 5;
        });
        yPos += 3;
      }
    });
  }

  // Translation if available
  if (result?.translation) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Translation", margin, yPos);
    yPos += 6;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const translationLines = doc.splitTextToSize(result.translation, maxWidth);
    translationLines.forEach((line: string) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, margin, yPos);
      yPos += 5;
    });
    yPos += 5;
  }

  // Cultural Notes if available
  if (result?.culturalNotes && result.culturalNotes.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Cultural Context", margin, yPos);
    yPos += 6;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    result.culturalNotes.forEach((note: string) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      const noteLines = doc.splitTextToSize(`• ${note}`, maxWidth - 5);
      noteLines.forEach((line: string) => {
        doc.text(line, margin, yPos);
        yPos += 5;
      });
    });
    yPos += 5;
  }

  // Clinical Impressions
  if (assessment.processed_result?.clinical_impressions) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Clinical Impressions", margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const impressionLines = doc.splitTextToSize(
      assessment.processed_result.clinical_impressions,
      maxWidth
    );
    impressionLines.forEach((line: string) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, margin, yPos);
      yPos += 5;
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount} | Generated by Aperta Health Clinical Scribe`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
    doc.text(
      "CONFIDENTIAL - For Clinical Use Only",
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 5,
      { align: "center" }
    );
  }

  // Save the PDF
  const fileName = `assessment_${assessment.patient?.patient_identifier || "report"}_${new Date(assessment.assessment_date).toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
};
