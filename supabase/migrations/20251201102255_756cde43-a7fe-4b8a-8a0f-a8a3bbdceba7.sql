-- Create screening_assessments table
CREATE TABLE public.screening_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  tool_type TEXT NOT NULL CHECK (tool_type IN ('GAD7', 'PHQ9', 'PCL5', 'MMSE', 'PSQ')),
  responses JSONB NOT NULL,
  total_score INTEGER NOT NULL,
  severity_level TEXT,
  interpretation TEXT,
  administered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.screening_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view screenings for their patients"
ON public.screening_assessments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.patients
    WHERE patients.id = screening_assessments.patient_id
    AND patients.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert screenings for their patients"
ON public.screening_assessments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.patients
    WHERE patients.id = screening_assessments.patient_id
    AND patients.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all screenings"
ON public.screening_assessments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_screening_assessments_updated_at
BEFORE UPDATE ON public.screening_assessments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();