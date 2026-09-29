ALTER TABLE public.screening_assessments
DROP CONSTRAINT screening_assessments_tool_type_check;

ALTER TABLE public.screening_assessments
ADD CONSTRAINT screening_assessments_tool_type_check
CHECK (tool_type = ANY (ARRAY[
  'PHQ9'::text,
  'GAD7'::text,
  'PCL5'::text,
  'MMSE'::text,
  'PSQ'::text,
  'PRIMER5'::text,
  'RHS15'::text,
  'HTQ4'::text,
  'WHODAS2'::text,
  'GDS15'::text,
  'SEWB'::text
]));