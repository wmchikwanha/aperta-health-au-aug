/**
 * Aperta Health Supported Languages
 *
 * Single source of truth for all language references across the app.
 *
 * BCP-47 codes (ISO 639-1 subtags) are used:
 *   - As database values in patients.language_preference
 *   - In FHIR resources (Communication.language, Patient.communication)
 *   - As keys in culturalIdioms.ts (language_code field)
 *   - In AI prompts for language-aware processing
 *
 * transcriptionCode: the BCP-47 tag sent to the transcribe-audio edge function
 *   (Gemini Speech-to-Text requires region-qualified tags for African languages)
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
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en',  name: 'English',    transcriptionCode: 'en-ZW', primaryRegion: 'ZW' },
  { code: 'sn',  name: 'Shona',      transcriptionCode: 'sn-ZW', primaryRegion: 'ZW' },
  { code: 'nd',  name: 'Ndebele',    transcriptionCode: 'nd-ZW', primaryRegion: 'ZW' },
  { code: 'zu',  name: 'Zulu',       transcriptionCode: 'zu-ZA', primaryRegion: 'ZA' },
  { code: 'xh',  name: 'Xhosa',      transcriptionCode: 'xh-ZA', primaryRegion: 'ZA' },
  { code: 'st',  name: 'Sotho',      transcriptionCode: 'st-ZA', primaryRegion: 'ZA' },
  { code: 'af',  name: 'Afrikaans',  transcriptionCode: 'af-ZA', primaryRegion: 'ZA' },
  { code: 'sw',  name: 'Swahili',    transcriptionCode: 'sw-KE', primaryRegion: 'KE' },
  { code: 'fr',  name: 'French',     transcriptionCode: 'fr-CD', primaryRegion: 'CD' },
  { code: 'pt',  name: 'Portuguese', transcriptionCode: 'pt-MZ', primaryRegion: 'MZ' },
  // Mixed-language / code-switching — not a standard BCP-47 tag
  // Used only for AI processing hints, not stored in FHIR resources
  { code: 'mixed', name: 'Mixed / Code-switching', transcriptionCode: 'en-ZW', primaryRegion: 'ZW' },
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
