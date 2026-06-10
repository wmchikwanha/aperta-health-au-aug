-- Create assessments table for clinical session history
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  narrative TEXT NOT NULL,
  processed_result JSONB NOT NULL,
  assessment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  language_detected TEXT,
  cultural_idioms_found TEXT[],
  risk_level TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_assessments_user_id ON public.assessments(user_id);
CREATE INDEX idx_assessments_date ON public.assessments(assessment_date DESC);

-- RLS Policies
CREATE POLICY "Users can view their own assessments"
  ON public.assessments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assessments"
  ON public.assessments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all assessments"
  ON public.assessments
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for live updates
ALTER TABLE public.assessments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assessments;