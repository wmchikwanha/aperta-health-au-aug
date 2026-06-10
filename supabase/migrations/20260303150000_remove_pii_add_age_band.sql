-- Remove PII fields from patients table
-- date_of_birth (full DOB) → age_band (non-identifying range)
-- contact_notes removed (contained phone numbers)
-- POPIA compliance: no personally identifiable information stored

ALTER TABLE public.patients
  DROP COLUMN IF EXISTS date_of_birth,
  DROP COLUMN IF EXISTS contact_notes,
  ADD COLUMN age_band TEXT CHECK (
    age_band IN ('under_18', '18-25', '26-35', '36-45', '46-55', '56-65', 'over_65')
  );

COMMENT ON COLUMN public.patients.age_band IS
  'Non-identifying age range. Full date of birth is not stored (POPIA compliance).';
