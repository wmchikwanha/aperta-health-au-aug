/**
 * Aperta Health Supported Languages — Australian CALD / Refugee Context
 *
 * Single source of truth for all language references across the app.
 *
 * BCP-47 codes (ISO 639-1/-3 subtags) are used:
 *   - As database values in patients.language_preference
 *   - In FHIR resources (Communication.language, Patient.communication)
 *   - As keys in culturalIdioms.ts (language_code field)
 *   - In AI prompts for language-aware processing
 *
 * Languages reflect priority CALD/humanitarian populations in Australia
 * (DSS Settlement Data, AIHW 2024, RACGP Refugee Health Guidelines):
 *   Dari, Pashto, Arabic, Farsi/Persian, Urdu, Hazaragi, Kirundi,
 *   Kinyarwanda, Burmese (Karen/Chin), Swahili, Dinka, Nuer,
 *   Tigrinya, Amharic, Vietnamese, Tamil, Rohingya.
 *
 * transcriptionCode: BCP-47 tag sent to the transcribe-audio edge function.
 * interpreterAssisted: true for languages where ASR coverage is limited and
 *   TIS National / on-site interpreter is the recommended primary modality.
 */

export interface SupportedLanguage {
  /** BCP-47 language subtag — stored in DB and FHIR resources */
  code: string;
  /** Human-readable name shown in UI */
  name: string;
  /** BCP-47 tag for Gemini speech transcription (may include region subtag) */
  transcriptionCode: string;
  /** IETF region this language is primarily associated with in our context */
  primaryRegion: string;
  /**
   * True when ASR is unreliable for this language in Australian clinical
   * settings — UI should default to TIS National interpreter workflow and
   * treat any AI transcript as a draft requiring interpreter confirmation.
   */
  interpreterAssisted?: boolean;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en',  name: 'English',                 transcriptionCode: 'en-AU', primaryRegion: 'AU' },
  { code: 'ar',  name: 'Arabic',                  transcriptionCode: 'ar-XA', primaryRegion: 'AU' },
  { code: 'fa',  name: 'Farsi / Persian',         transcriptionCode: 'fa-IR', primaryRegion: 'IR' },
  { code: 'prs', name: 'Dari',                    transcriptionCode: 'fa-AF', primaryRegion: 'AF', interpreterAssisted: true },
  { code: 'ps',  name: 'Pashto',                  transcriptionCode: 'ps-AF', primaryRegion: 'AF', interpreterAssisted: true },
  { code: 'haz', name: 'Hazaragi',                transcriptionCode: 'fa-AF', primaryRegion: 'AF', interpreterAssisted: true },
  { code: 'ur',  name: 'Urdu',                    transcriptionCode: 'ur-PK', primaryRegion: 'PK' },
  { code: 'ti',  name: 'Tigrinya',                transcriptionCode: 'ti-ER', primaryRegion: 'ER', interpreterAssisted: true },
  { code: 'am',  name: 'Amharic',                 transcriptionCode: 'am-ET', primaryRegion: 'ET' },
  { code: 'sw',  name: 'Swahili',                 transcriptionCode: 'sw-TZ', primaryRegion: 'TZ' },
  { code: 'rn',  name: 'Kirundi',                 transcriptionCode: 'rn-BI', primaryRegion: 'BI', interpreterAssisted: true },
  { code: 'rw',  name: 'Kinyarwanda',             transcriptionCode: 'rw-RW', primaryRegion: 'RW', interpreterAssisted: true },
  { code: 'my',  name: 'Burmese',                 transcriptionCode: 'my-MM', primaryRegion: 'MM', interpreterAssisted: true },
  { code: 'din', name: 'Dinka',                   transcriptionCode: 'en-AU', primaryRegion: 'SS', interpreterAssisted: true },
  { code: 'nus', name: 'Nuer',                    transcriptionCode: 'en-AU', primaryRegion: 'SS', interpreterAssisted: true },
  { code: 'vi',  name: 'Vietnamese',              transcriptionCode: 'vi-VN', primaryRegion: 'VN' },
  { code: 'ta',  name: 'Tamil',                   transcriptionCode: 'ta-LK', primaryRegion: 'LK' },
  { code: 'rhg', name: 'Rohingya',                transcriptionCode: 'en-AU', primaryRegion: 'MM', interpreterAssisted: true },
  // Mixed-language / code-switching — not a standard BCP-47 tag
  // Used only for AI processing hints, not stored in FHIR resources
  { code: 'mixed', name: 'Mixed / Code-switching', transcriptionCode: 'en-AU', primaryRegion: 'AU' },
];

/** BCP-47 codes only — for type-safe language_code fields */
export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

/** Lookup by BCP-47 code */
export function getLanguage(code: string): SupportedLanguage | undefined {
  return SUPPORTED_LANGUAGES.find(l => l.code === code);
}

/** Display name for a BCP-47 code — falls back to the code itself */
export function getLanguageName(code: string): string {
  return getLanguage(code)?.name ?? code;
}

/** Transcription code for a BCP-47 code — for use with transcribe-audio edge function */
export function getTranscriptionCode(code: string): string {
  return getLanguage(code)?.transcriptionCode ?? code;
}

/** True when an on-site / TIS National interpreter is the recommended modality */
export function requiresInterpreter(code: string): boolean {
  return Boolean(getLanguage(code)?.interpreterAssisted);
}

/**
 * FHIR R4 system URI for BCP-47 language codes
 * Used in Patient.communication.language and Communication.language
 */
export const BCP47_SYSTEM = 'urn:ietf:bcp:47';

// =============================================================================
// FHIR R4 Administrative Gender
// http://hl7.org/fhir/administrative-gender
// Stored in patients.gender — used in FHIR Patient.gender
// =============================================================================

export const FHIR_GENDER_SYSTEM = 'http://hl7.org/fhir/administrative-gender';

export interface FHIRGender {
  /** FHIR administrative-gender code — stored in DB */
  code: 'male' | 'female' | 'other' | 'unknown';
  /** Human-readable label shown in UI */
  label: string;
  /** Brief description for clinicians */
  description: string;
}

export const FHIR_GENDERS: FHIRGender[] = [
  { code: 'male',    label: 'Male',               description: 'Male gender identity' },
  { code: 'female',  label: 'Female',             description: 'Female gender identity' },
  { code: 'other',   label: 'Other / Non-binary', description: 'Non-binary, intersex, or other gender identity' },
  { code: 'unknown', label: 'Prefer not to say',  description: 'Not disclosed or unknown' },
];

export type FHIRGenderCode = FHIRGender['code'];

/** Display label for a FHIR gender code — falls back to the code itself */
export function getGenderLabel(code: string | null | undefined): string {
  if (!code) return 'Not specified';
  return FHIR_GENDERS.find(g => g.code === code)?.label ?? code;
}
