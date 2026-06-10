/**
 * Australian visa-status taxonomy for refugee / CALD mental-health practice.
 *
 * Stored in patients.metadata.visa_status (JSONB). Used by:
 *  - Treatment-plan suggestions (Medicare eligibility, MHTP access)
 *  - Referral letters and intake forms
 *  - Clinical risk framing (precarity is a foundational stressor)
 *
 * Source: Department of Home Affairs subclass numbers, RACGP Refugee Health
 * Guidelines, Refugee Council of Australia visa explainers.
 */

export type VisaStatus =
  | "citizen"
  | "permanent_humanitarian_200_201_202_203_204"
  | "refugee_866"
  | "tpv_785"
  | "shev_790"
  | "bridging_visa_e"
  | "bridging_visa_a_b"
  | "asylum_seeker_no_visa"
  | "student_visa"
  | "skilled_or_family_permanent"
  | "skilled_or_family_temporary"
  | "other"
  | "prefer_not_to_say";

export interface VisaStatusOption {
  value: VisaStatus;
  label: string;
  /** True if visa holder typically has unrestricted Medicare access */
  medicareEligible: boolean;
  /** Brief clinical-context note */
  note: string;
}

export const VISA_STATUS_OPTIONS: VisaStatusOption[] = [
  { value: "citizen", label: "Australian citizen",
    medicareEligible: true, note: "Full access to Medicare and Better Access." },
  { value: "permanent_humanitarian_200_201_202_203_204",
    label: "Permanent humanitarian (200/201/202/203/204)",
    medicareEligible: true,
    note: "Refugee, in-country special humanitarian, global special humanitarian, emergency rescue, woman at risk. Full Medicare." },
  { value: "refugee_866", label: "Permanent protection — subclass 866",
    medicareEligible: true, note: "Onshore protection visa granted. Full Medicare." },
  { value: "tpv_785", label: "Temporary Protection Visa — subclass 785",
    medicareEligible: true, note: "3-year temporary visa. Medicare eligible but visa insecurity is a foundational stressor." },
  { value: "shev_790", label: "Safe Haven Enterprise Visa — subclass 790",
    medicareEligible: true, note: "5-year temporary visa with work/study pathway. Medicare eligible." },
  { value: "bridging_visa_e", label: "Bridging Visa E (BVE)",
    medicareEligible: false, note: "Often issued to asylum seekers. Medicare access variable — confirm with ASRC / Refugee Health Network. May rely on state-funded clinics." },
  { value: "bridging_visa_a_b", label: "Bridging Visa A or B",
    medicareEligible: true, note: "Generally Medicare eligible while substantive application is processed." },
  { value: "asylum_seeker_no_visa", label: "Asylum seeker — no current visa",
    medicareEligible: false, note: "Refer to ASRC / state-funded refugee health clinic. Significant access barriers." },
  { value: "student_visa", label: "Student visa (subclass 500)",
    medicareEligible: false, note: "OSHC required. Reciprocal Medicare for some nationalities only." },
  { value: "skilled_or_family_permanent", label: "Skilled or family — permanent",
    medicareEligible: true, note: "Full Medicare." },
  { value: "skilled_or_family_temporary", label: "Skilled or family — temporary",
    medicareEligible: false, note: "Reciprocal Medicare may apply. Confirm individually." },
  { value: "other", label: "Other", medicareEligible: false, note: "Confirm with practice." },
  { value: "prefer_not_to_say", label: "Prefer not to say",
    medicareEligible: false, note: "Respect non-disclosure. Visa status is sensitive." },
];

export function getVisaStatus(value: string | null | undefined): VisaStatusOption | undefined {
  return VISA_STATUS_OPTIONS.find(v => v.value === value);
}
