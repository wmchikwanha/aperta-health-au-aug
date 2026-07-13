ALTER TABLE public.screening_assessments DROP CONSTRAINT IF EXISTS screening_assessments_tool_type_check;
ALTER TABLE public.screening_assessments ADD CONSTRAINT screening_assessments_tool_type_check
  CHECK (tool_type IN ('PHQ9','GAD7','PCL5','MMSE','PSQ','PRIMER5','RHS15','HTQ4','WHODAS2','GDS15'));