-- Clean up old non-Australian facilities
DELETE FROM public.facilities;

-- Insert placeholder Australian facilities
INSERT INTO public.facilities (
  id,
  facility_name,
  region,
  province,
  city,
  services_offered,
  contact_phone,
  contact_email,
  website,
  is_active,
  accepts_referrals,
  emergency_capable,
  approval_status
) VALUES
(
  'e0000000-0000-0000-0000-000000000001',
  'headspace Melbourne (Youth Mental Health Service)',
  'Victoria',
  'VIC',
  'Melbourne',
  ARRAY['Youth Counselling', 'Mental Health Support', 'Alcohol & Drug Services', 'Work & Study Support'],
  '03 9027 0100',
  'info@headspacemelbourne.org.au',
  'https://headspace.org.au',
  true,
  true,
  false,
  'approved'
),
(
  'e0000000-0000-0000-0000-000000000002',
  'Alfred Health Mental Health (Clinical Services)',
  'Victoria',
  'VIC',
  'Melbourne',
  ARRAY['Adult Psychiatric Care', 'Crisis Assessment', 'Community Rehabilitation'],
  '03 9076 2000',
  'mentalhealth@alfred.org.au',
  'https://www.alfredhealth.org.au',
  true,
  true,
  false,
  'approved'
),
(
  'e0000000-0000-0000-0000-000000000003',
  'Royal Melbourne Hospital Emergency Department',
  'Victoria',
  'VIC',
  'Melbourne',
  ARRAY['Emergency Psychiatric Assessment', 'Crisis Stabilization', '24/7 Triage'],
  '03 9342 7000',
  'emergency@mh.org.au',
  'https://www.thermh.org.au',
  true,
  true,
  true,
  'approved'
),
(
  'e0000000-0000-0000-0000-000000000004',
  'St Vincent''s Hospital Sydney Emergency Department',
  'New South Wales',
  'NSW',
  'Darlinghurst',
  ARRAY['Emergency Mental Health Assessment', 'Acute Crisis Care', 'Psychiatric Emergency Care Centre'],
  '02 8382 1111',
  'emergency@svha.org.au',
  'https://www.svhs.org.au',
  true,
  true,
  true,
  'approved'
);

-- Ensure extensions like pgcrypto are available for cryptography functions if needed
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Seed the clinician wmchikwanha@gmail.com
INSERT INTO auth.users (
  id,
  email,
  raw_user_meta_data,
  encrypted_password,
  email_confirmed_at,
  role,
  aud,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'wmchikwanha@gmail.com',
  '{"full_name": "Dr. William M. Chikwanha", "role": "psychiatrist"}'::jsonb,
  crypt('ApertaHealth123!', gen_salt('bf')),
  now(),
  'authenticated',
  'authenticated',
  now(),
  now()
)
ON CONFLICT (email) DO NOTHING;

-- In case trigger handle_new_user did not run or for robustness:
INSERT INTO public.profiles (id, full_name, email)
SELECT id, 'Dr. William M. Chikwanha', email
FROM auth.users
WHERE email = 'wmchikwanha@gmail.com'
ON CONFLICT (id) DO UPDATE SET full_name = 'Dr. William M. Chikwanha';

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'psychiatrist'::public.app_role
FROM auth.users
WHERE email = 'wmchikwanha@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
