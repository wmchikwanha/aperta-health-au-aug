-- Create patients table for managing patient profiles and demographics
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  patient_identifier TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  language_preference TEXT,
  cultural_background TEXT,
  contact_notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on patients
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- RLS policies for patients
CREATE POLICY "Users can view their own patients"
  ON public.patients
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own patients"
  ON public.patients
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patients"
  ON public.patients
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own patients"
  ON public.patients
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all patients"
  ON public.patients
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Create treatment_notes table for longitudinal care tracking
CREATE TABLE public.treatment_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  note_type TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on treatment_notes
ALTER TABLE public.treatment_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for treatment_notes
CREATE POLICY "Users can view notes for their patients"
  ON public.treatment_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = treatment_notes.patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert notes for their patients"
  ON public.treatment_notes
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all treatment notes"
  ON public.treatment_notes
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Add patient_id to assessments table to link assessments to patients
ALTER TABLE public.assessments
ADD COLUMN patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_assessments_patient_id ON public.assessments(patient_id);
CREATE INDEX idx_treatment_notes_patient_id ON public.treatment_notes(patient_id);
CREATE INDEX idx_patients_user_id ON public.patients(user_id);

-- Trigger for updating patients updated_at
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for patients and treatment_notes
ALTER PUBLICATION supabase_realtime ADD TABLE public.patients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.treatment_notes;