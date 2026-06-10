CREATE TABLE public.idiom_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submitted_by UUID NOT NULL,
  idiom TEXT NOT NULL,
  language_code TEXT NOT NULL,
  patient_utterance TEXT NOT NULL,
  clinician_interpretation TEXT NOT NULL,
  clinical_context TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.idiom_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own idiom submissions"
ON public.idiom_submissions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can view their own idiom submissions"
ON public.idiom_submissions
FOR SELECT
TO authenticated
USING (auth.uid() = submitted_by);

CREATE POLICY "Admins can view all idiom submissions"
ON public.idiom_submissions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));