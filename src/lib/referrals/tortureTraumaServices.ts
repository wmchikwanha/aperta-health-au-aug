/**
 * Torture & Trauma Specialist Refugee Mental Health Services — Australia
 *
 * Static reference list for use in referral suggestions, treatment plans,
 * and clinician tooltips. These are members of the Forum of Australian
 * Services for Survivors of Torture and Trauma (FASSTT) network.
 *
 * Confirm intake pathway and current contact details before sending a
 * referral — service offerings can change.
 */

export type AUState = "NSW" | "VIC" | "QLD" | "WA" | "SA" | "ACT" | "NT" | "TAS";

export interface TortureTraumaService {
  state: AUState;
  organisation: string;
  shortName: string;
  url: string;
  intakePhone: string;
  /** Brief description of catchment / services */
  notes: string;
}

export const TORTURE_TRAUMA_SERVICES: TortureTraumaService[] = [
  {
    state: "NSW",
    organisation: "Service for the Treatment and Rehabilitation of Torture and Trauma Survivors",
    shortName: "STARTTS",
    url: "https://www.startts.org.au",
    intakePhone: "(02) 9646 6700",
    notes: "Statewide NSW. Counselling, psychiatry, physiotherapy, group programs, bicultural workers, youth and family programs.",
  },
  {
    state: "VIC",
    organisation: "Victorian Foundation for Survivors of Torture (Foundation House)",
    shortName: "Foundation House",
    url: "https://foundationhouse.org.au",
    intakePhone: "(03) 9389 8900",
    notes: "Statewide VIC. Counselling, complementary therapies, psychiatry, advocacy, schools program.",
  },
  {
    state: "QLD",
    organisation: "Queensland Program of Assistance to Survivors of Torture and Trauma",
    shortName: "QPASTT",
    url: "https://qpastt.org.au",
    intakePhone: "(07) 3391 6677",
    notes: "Statewide QLD. Counselling, casework, group work, youth and family programs.",
  },
  {
    state: "WA",
    organisation: "Association for Services to Torture and Trauma Survivors",
    shortName: "ASeTTS",
    url: "https://asetts.org.au",
    intakePhone: "(08) 9227 2700",
    notes: "Statewide WA. Counselling, advocacy, complementary therapies, psychiatry partnerships.",
  },
  {
    state: "SA",
    organisation: "Survivors of Torture and Trauma Assistance and Rehabilitation Service",
    shortName: "STTARS",
    url: "https://sttars.org.au",
    intakePhone: "(08) 8206 8900",
    notes: "Statewide SA. Counselling, casework, complementary therapies, bicultural support.",
  },
  {
    state: "ACT",
    organisation: "Companion House Assisting Survivors of Torture and Trauma",
    shortName: "Companion House",
    url: "https://companionhouse.org.au",
    intakePhone: "(02) 6251 4550",
    notes: "ACT and surrounds. Medical clinic, counselling, advocacy, community programs.",
  },
  {
    state: "NT",
    organisation: "Melaleuca Refugee Centre — Torture & Trauma Survivors Service of the Northern Territory",
    shortName: "Melaleuca / MARSS",
    url: "https://melaleuca.org.au",
    intakePhone: "(08) 8985 3311",
    notes: "Statewide NT. Counselling, casework, settlement, youth and women's programs.",
  },
  {
    state: "TAS",
    organisation: "Phoenix Centre (Migrant Resource Centre Tasmania)",
    shortName: "Phoenix Centre",
    url: "https://www.mrctas.org.au/phoenix",
    intakePhone: "(03) 6221 0999",
    notes: "Statewide TAS. Counselling, group programs, community development.",
  },
];

export function getServiceByState(state: AUState): TortureTraumaService | undefined {
  return TORTURE_TRAUMA_SERVICES.find(s => s.state === state);
}

/**
 * Generic federal helpers — surfaced alongside any T&T referral.
 */
export const NATIONAL_REFERRAL_RESOURCES = {
  tisNational:        { name: "TIS National (interpreters)",                 phone: "131 450 (24/7), Doctors Priority Line for GPs" },
  lifeline:           { name: "Lifeline",                                    phone: "13 11 14 (24/7)" },
  thirteenYarn:       { name: "13YARN (Aboriginal & Torres Strait Islander)", phone: "13 92 76 (24/7)" },
  oneEightHundred:    { name: "1800RESPECT (DFV / sexual assault)",          phone: "1800 737 732 (24/7)" },
  suicideCallBack:    { name: "Suicide Call Back Service",                    phone: "1300 659 467 (24/7)" },
  refugeeHealthNet:   { name: "Refugee Health Network Australia",             url:   "https://refugeehealthnetwork.org.au" },
} as const;
