import jsPDF from 'jspdf';

interface TreatmentPlan {
  primary_interventions: Array<{
    intervention: string;
    rationale: string;
    evidence_base: string;
    priority: 'urgent' | 'high' | 'moderate' | 'low';
  }>;
  psychosocial_interventions: Array<{
    therapy_type: string;
    description: string;
    target_symptoms: string[];
    session_frequency?: string;
    evidence_level?: string;
  }>;
  pharmacological_considerations?: {
    indicated: boolean;
    medication_classes?: Array<{
      class: string;
      rationale: string;
      monitoring_requirements?: string;
      cultural_considerations?: string;
    }>;
    contraindications_to_assess?: string[];
  };
  monitoring_plan: {
    follow_up_frequency: string;
    outcome_measures: string[];
    red_flags: string[];
    review_timeline?: string;
  };
  referral_criteria: Array<{
    trigger: string;
    specialist_type: string;
    urgency: 'immediate' | 'urgent' | 'routine';
  }>;
  cultural_adaptations?: string[];
  patient_education_points?: string[];
}

interface ExportData {
  treatmentPlan: TreatmentPlan;
  patientContext?: {
    patient_identifier?: string;
    age?: number;
    gender?: string;
  };
  generatedDate?: Date;
}

export const exportTreatmentPlanToPDF = (data: ExportData): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  const addHeader = () => {
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('TREATMENT PLAN', margin, 18);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Evidence-Based Recommendations', margin, 27);
    
    const date = data.generatedDate || new Date();
    doc.text(`Generated: ${date.toLocaleDateString()}`, pageWidth - margin - 45, 27);
    
    yPosition = 45;
  };

  const addFooter = (pageNumber: number) => {
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text('CONFIDENTIAL - Clinical Document', margin, pageHeight - 10);
    doc.text('AI-Generated - Requires Clinical Review', pageWidth - margin - 55, pageHeight - 10);
  };

  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - 30) {
      addFooter(doc.getNumberOfPages());
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  const addSectionTitle = (title: string, color: [number, number, number] = [59, 130, 246]) => {
    checkPageBreak(20);
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(margin, yPosition, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 3, yPosition + 6);
    yPosition += 12;
    doc.setTextColor(0, 0, 0);
  };

  const addText = (text: string, indent: number = 0, bold: boolean = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    lines.forEach((line: string) => {
      checkPageBreak(6);
      doc.text(line, margin + indent, yPosition);
      yPosition += 5;
    });
  };

  const addBadge = (text: string, x: number, color: [number, number, number]) => {
    doc.setFillColor(color[0], color[1], color[2]);
    const badgeWidth = doc.getTextWidth(text) + 6;
    doc.roundedRect(x, yPosition - 4, badgeWidth, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text(text, x + 3, yPosition);
    doc.setTextColor(0, 0, 0);
  };

  const getPriorityColor = (priority: string): [number, number, number] => {
    switch (priority) {
      case 'urgent': return [220, 38, 38];
      case 'high': return [234, 88, 12];
      case 'moderate': return [59, 130, 246];
      case 'low': return [34, 197, 94];
      default: return [128, 128, 128];
    }
  };

  // Start document
  addHeader();

  // Patient info if available
  if (data.patientContext) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const patientInfo = [];
    if (data.patientContext.patient_identifier) patientInfo.push(`Patient: ${data.patientContext.patient_identifier}`);
    if (data.patientContext.age) patientInfo.push(`Age: ${data.patientContext.age}`);
    if (data.patientContext.gender) patientInfo.push(`Gender: ${data.patientContext.gender}`);
    if (patientInfo.length > 0) {
      doc.text(patientInfo.join('  |  '), margin, yPosition);
      yPosition += 10;
    }
  }

  // Disclaimer
  doc.setFillColor(254, 243, 199);
  doc.rect(margin, yPosition, contentWidth, 12, 'F');
  doc.setTextColor(146, 64, 14);
  doc.setFontSize(8);
  doc.text('⚠ CLINICAL JUDGMENT REQUIRED: These are AI-generated suggestions. Always apply clinical', margin + 3, yPosition + 4);
  doc.text('judgment, consider patient preferences, and adapt to local context and resources.', margin + 3, yPosition + 9);
  yPosition += 16;
  doc.setTextColor(0, 0, 0);

  // Primary Interventions
  const plan = data.treatmentPlan;
  addSectionTitle('PRIMARY INTERVENTIONS', [220, 38, 38]);
  
  plan.primary_interventions.forEach((int, i) => {
    checkPageBreak(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${i + 1}. ${int.intervention}`, margin + 3, yPosition);
    addBadge(int.priority.toUpperCase(), pageWidth - margin - 25, getPriorityColor(int.priority));
    yPosition += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    addText(`Rationale: ${int.rationale}`, 6);
    doc.setTextColor(100, 100, 100);
    addText(`Evidence: ${int.evidence_base}`, 6);
    doc.setTextColor(0, 0, 0);
    yPosition += 3;
  });

  // Psychosocial Interventions
  yPosition += 5;
  addSectionTitle('PSYCHOSOCIAL INTERVENTIONS', [34, 197, 94]);
  
  plan.psychosocial_interventions.forEach((psi, i) => {
    checkPageBreak(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${i + 1}. ${psi.therapy_type}`, margin + 3, yPosition);
    if (psi.evidence_level) {
      addBadge(psi.evidence_level, pageWidth - margin - 30, [100, 100, 100]);
    }
    yPosition += 6;
    
    addText(psi.description, 6);
    addText(`Target Symptoms: ${psi.target_symptoms.join(', ')}`, 6);
    if (psi.session_frequency) {
      addText(`Frequency: ${psi.session_frequency}`, 6);
    }
    yPosition += 3;
  });

  // Pharmacological Considerations
  if (plan.pharmacological_considerations?.indicated) {
    yPosition += 5;
    addSectionTitle('PHARMACOLOGICAL CONSIDERATIONS', [147, 51, 234]);
    
    plan.pharmacological_considerations.medication_classes?.forEach((med, i) => {
      checkPageBreak(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`${i + 1}. ${med.class}`, margin + 3, yPosition);
      yPosition += 6;
      
      addText(`Rationale: ${med.rationale}`, 6);
      if (med.monitoring_requirements) {
        addText(`Monitoring: ${med.monitoring_requirements}`, 6);
      }
      if (med.cultural_considerations) {
        addText(`Cultural Note: ${med.cultural_considerations}`, 6);
      }
      yPosition += 3;
    });

    if (plan.pharmacological_considerations.contraindications_to_assess?.length) {
      doc.setFillColor(254, 226, 226);
      checkPageBreak(12);
      doc.rect(margin + 3, yPosition, contentWidth - 6, 10, 'F');
      doc.setTextColor(153, 27, 27);
      doc.setFontSize(8);
      doc.text(`⚠ Assess for contraindications: ${plan.pharmacological_considerations.contraindications_to_assess.join(', ')}`, margin + 6, yPosition + 6);
      yPosition += 14;
      doc.setTextColor(0, 0, 0);
    }
  }

  // Monitoring Plan
  yPosition += 5;
  addSectionTitle('MONITORING & FOLLOW-UP', [59, 130, 246]);
  
  addText(`Follow-up Frequency: ${plan.monitoring_plan.follow_up_frequency}`, 3, true);
  yPosition += 2;
  addText(`Outcome Measures: ${plan.monitoring_plan.outcome_measures.join(', ')}`, 3);
  yPosition += 3;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Red Flags for Escalation:', margin + 3, yPosition);
  yPosition += 5;
  
  plan.monitoring_plan.red_flags.forEach(flag => {
    checkPageBreak(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(220, 38, 38);
    doc.text(`• ${flag}`, margin + 6, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 5;
  });

  // Referral Criteria
  yPosition += 5;
  addSectionTitle('REFERRAL CRITERIA', [234, 88, 12]);
  
  plan.referral_criteria.forEach((ref, i) => {
    checkPageBreak(12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${i + 1}. ${ref.trigger}`, margin + 3, yPosition);
    yPosition += 5;
    doc.text(`   → ${ref.specialist_type}`, margin + 3, yPosition);
    addBadge(ref.urgency.toUpperCase(), pageWidth - margin - 25, getPriorityColor(ref.urgency === 'immediate' ? 'urgent' : ref.urgency));
    yPosition += 7;
  });

  // Cultural Adaptations
  if (plan.cultural_adaptations?.length) {
    yPosition += 5;
    addSectionTitle('CULTURAL ADAPTATIONS', [20, 184, 166]);
    plan.cultural_adaptations.forEach(adaptation => {
      addText(`• ${adaptation}`, 3);
    });
  }

  // Patient Education
  if (plan.patient_education_points?.length) {
    yPosition += 5;
    addSectionTitle('PATIENT EDUCATION POINTS', [99, 102, 241]);
    plan.patient_education_points.forEach(point => {
      addText(`• ${point}`, 3);
    });
  }

  // Add footer to last page
  addFooter(doc.getNumberOfPages());

  // Save the PDF
  const filename = `treatment-plan-${data.patientContext?.patient_identifier || 'patient'}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};
