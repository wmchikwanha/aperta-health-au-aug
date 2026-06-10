-- Create crisis intervention logs table for Phase 3 First Aid
CREATE TABLE public.crisis_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Crisis Details
  crisis_type TEXT NOT NULL CHECK (crisis_type IN ('suicidal_ideation', 'self_harm', 'psychotic_episode', 'severe_anxiety', 'substance_crisis', 'violence_risk', 'other')),
  severity_level TEXT NOT NULL CHECK (severity_level IN ('low', 'moderate', 'high', 'critical')),
  
  -- Intervention
  interventions_applied JSONB DEFAULT '[]'::jsonb,
  checklist_completed JSONB DEFAULT '{}'::jsonb,
  
  -- Referral
  referral_made BOOLEAN DEFAULT false,
  referral_type TEXT,
  referral_destination TEXT,
  referral_notes TEXT,
  
  -- Outcome
  outcome TEXT,
  follow_up_required BOOLEAN DEFAULT true,
  follow_up_date DATE,
  
  -- Timestamps
  crisis_started_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crisis_interventions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own crisis interventions"
ON public.crisis_interventions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all crisis interventions"
ON public.crisis_interventions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert crisis interventions for their patients"
ON public.crisis_interventions FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (SELECT 1 FROM public.patients WHERE id = patient_id AND user_id = auth.uid())
);

CREATE POLICY "Users can update their own crisis interventions"
ON public.crisis_interventions FOR UPDATE
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_crisis_interventions_patient ON public.crisis_interventions(patient_id);
CREATE INDEX idx_crisis_interventions_user ON public.crisis_interventions(user_id);
CREATE INDEX idx_crisis_interventions_severity ON public.crisis_interventions(severity_level);

-- Trigger for updated_at
CREATE TRIGGER update_crisis_interventions_updated_at
BEFORE UPDATE ON public.crisis_interventions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();