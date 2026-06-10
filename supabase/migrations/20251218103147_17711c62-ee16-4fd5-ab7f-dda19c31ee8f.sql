-- Create diagnostic formulations table for Phase 2 Diagnosis
CREATE TABLE public.diagnostic_formulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  
  -- Primary Diagnosis
  primary_diagnosis_code TEXT NOT NULL,
  primary_diagnosis_name TEXT NOT NULL,
  diagnostic_framework TEXT NOT NULL CHECK (diagnostic_framework IN ('ICD-11', 'DSM-5')),
  diagnosis_confidence TEXT CHECK (diagnosis_confidence IN ('definite', 'probable', 'provisional', 'rule_out')),
  
  -- Differential Diagnoses (JSONB array)
  differential_diagnoses JSONB DEFAULT '[]'::jsonb,
  
  -- Diagnostic Reasoning
  diagnostic_reasoning TEXT,
  supporting_evidence JSONB DEFAULT '{}'::jsonb,
  
  -- Cultural Context
  cultural_formulation TEXT,
  
  -- AI Suggestions (stored for audit)
  ai_suggestions JSONB DEFAULT '{}'::jsonb,
  
  -- Audit/Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'superseded')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  
  -- Timestamps
  formulated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diagnostic_formulations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own diagnostic formulations"
ON public.diagnostic_formulations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all diagnostic formulations"
ON public.diagnostic_formulations
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own diagnostic formulations"
ON public.diagnostic_formulations
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (SELECT 1 FROM public.patients WHERE id = patient_id AND user_id = auth.uid())
);

CREATE POLICY "Users can update their own diagnostic formulations"
ON public.diagnostic_formulations
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own draft formulations"
ON public.diagnostic_formulations
FOR DELETE
USING (auth.uid() = user_id AND status = 'draft');

-- Create index for faster lookups
CREATE INDEX idx_diagnostic_formulations_patient ON public.diagnostic_formulations(patient_id);
CREATE INDEX idx_diagnostic_formulations_assessment ON public.diagnostic_formulations(assessment_id);
CREATE INDEX idx_diagnostic_formulations_user ON public.diagnostic_formulations(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_diagnostic_formulations_updated_at
BEFORE UPDATE ON public.diagnostic_formulations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();