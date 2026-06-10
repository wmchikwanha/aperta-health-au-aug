import jsPDF from "jspdf";

interface ScreeningPdfData {
  patientIdentifier: string;
  toolName: string;
  totalScore: number;
  maxScore: number;
  severityLevel: string;
  interpretation: string;
  administeredAt: string;
  notes?: string;
  responses: any;
}

export const exportScreeningToPDF = (data: ScreeningPdfData): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Header
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Clinical Screening Assessment", margin, 25);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 25, { align: "right" });

  yPosition = 55;

  // Patient Information
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Patient Information", margin, yPosition);
  yPosition += 10;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Patient ID: ${data.patientIdentifier}`, margin, yPosition);
  yPosition += 7;
  doc.text(`Date Administered: ${data.administeredAt}`, margin, yPosition);
  yPosition += 15;

  // Assessment Details
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Assessment Details", margin, yPosition);
  yPosition += 10;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Tool: ${data.toolName}`, margin, yPosition);
  yPosition += 10;

  // Score box
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 30, 3, 3, "F");
  
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`Total Score: ${data.totalScore}/${data.maxScore}`, margin + 10, yPosition + 12);
  
  // Severity badge
  let severityColor: [number, number, number] = [100, 100, 100];
  const severityLower = data.severityLevel.toLowerCase();
  if (severityLower.includes("severe") || severityLower.includes("urgent")) {
    severityColor = [239, 68, 68]; // Red
  } else if (severityLower.includes("moderate")) {
    severityColor = [245, 158, 11]; // Orange
  } else if (severityLower.includes("mild") || severityLower.includes("positive")) {
    severityColor = [234, 179, 8]; // Yellow
  } else {
    severityColor = [34, 197, 94]; // Green
  }

  doc.setFillColor(...severityColor);
  doc.roundedRect(margin + 10, yPosition + 17, 60, 8, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(data.severityLevel, margin + 40, yPosition + 23, { align: "center" });
  
  yPosition += 40;

  // Clinical Interpretation
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Clinical Interpretation:", margin, yPosition);
  yPosition += 8;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const interpretationLines = doc.splitTextToSize(data.interpretation, pageWidth - 2 * margin);
  doc.text(interpretationLines, margin, yPosition);
  yPosition += interpretationLines.length * 6 + 10;

  // Clinical Notes
  if (data.notes) {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Clinical Notes:", margin, yPosition);
    yPosition += 8;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const notesLines = doc.splitTextToSize(data.notes, pageWidth - 2 * margin);
    doc.text(notesLines, margin, yPosition);
    yPosition += notesLines.length * 6 + 10;
  }

  // Footer
  const footerY = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text("CONFIDENTIAL - Clinical Assessment Report", pageWidth / 2, footerY, { align: "center" });
  doc.text(`Page 1 of ${doc.internal.pages.length - 1}`, pageWidth - margin, footerY, { align: "right" });

  // Save the PDF
  const fileName = `Screening_${data.toolName}_${data.patientIdentifier}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
