// Batch 4 — deterministic identifier scrubber. Pure, no I/O. Runs inside guardInput before every AI call.
// Regex-only by design: sending text to a model to find PII would itself disclose the PII.

export type PiiType = "PHONE" | "MEDICARE" | "TFN" | "EMAIL" | "ADDRESS" | "DATE" | "ID_NUMBER" | "PERSON";
export interface PiiResult { text: string; count: number; types: PiiType[] }

const SUBURBS = [
  "Fairfield","Liverpool","Auburn","Merrylands","Blacktown","Bankstown","Lakemba","Cabramatta","Parramatta","Granville","Mount Druitt",
  "Dandenong","Noble Park","Springvale","Broadmeadows","Sunshine","St Albans","Footscray","Werribee","Craigieburn","Shepparton",
  "Logan","Woodridge","Inala","Toowoomba","Salisbury","Elizabeth","Mirrabooka","Balga","Girrawheen","Armadale","Wodonga","Albury","Coffs Harbour","Wagga Wagga",
];
const suburbRe = new RegExp(`\\b(?:${SUBURBS.map((s) => s.replace(/ /g, "\\s+")).join("|")})\\b(?:\\s+(?:NSW|VIC|QLD|SA|WA|TAS|NT|ACT))?(?:\\s+\\d{4})?`, "gi");

// Order matters: specific identifiers first so generic digit patterns don't swallow them.
const RULES: Array<[PiiType, RegExp]> = [
  ["EMAIL", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g],
  // Burmese NRC e.g. 12/OUKAMA(N)123456
  ["ID_NUMBER", /\b\d{1,2}\/[A-Za-z]{3,9}\s?\((?:N|E|P|T|Naing)\)\s?\d{5,6}\b/g],
  // Sri Lankan NIC: 9 digits + V/X, or 12 digits starting 19/20
  ["ID_NUMBER", /\b\d{9}[VvXx]\b/g],
  // Afghan e-Tazkira 1400-0000-00000, Iraqi civil ID, Iranian (xxx-xxxxxx-x), Sudanese national number — keyword-anchored
  ["ID_NUMBER", /\b(?:tazkira|tazkera|تذکره|civil\s*id|national\s*(?:id|number|no\.?)|کد\s*ملی|NIN|NRC|NIC|passport(?:\s*no\.?)?)\s*[:#]?\s*[A-Za-z0-9][A-Za-z0-9\-\/ ]{4,20}\d/gi],
  ["ID_NUMBER", /\b\d{4}-\d{4}-\d{5}\b/g],
  ["ID_NUMBER", /\b\d{3}-\d{6}-\d\b/g],
  // Medicare: 10 digits (first 2–6), optional IRN, often spaced 4-5-1
  ["MEDICARE", /\b[2-6]\d{3}\s?\d{5}\s?\d(?:[\s-]?\d)?\b/g],
  // TFN: 9 digits, 3-3-3
  ["TFN", /\b\d{3}[\s-]?\d{3}[\s-]?\d{3}\b/g],
  // AU phones: mobile 04xx, +61, landline (0x) xxxx xxxx
  ["PHONE", /(?:\+?61[\s-]?|\b0)4\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/g],
  ["PHONE", /(?:\+?61[\s-]?\(?[2378]\)?|\(?0[2378]\)?)[\s-]?\d{4}[\s-]?\d{4}\b/g],
  ["PHONE", /\+\d{2,3}[\s-]?\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/g],
  // DOB / dates
  ["DATE", /\b(?:DOB|D\.O\.B\.?|born\s+on|date\s+of\s+birth)\s*[:\-]?\s*[^\n,;]{4,20}/gi],
  ["DATE", /\b\d{1,2}[\/.-]\d{1,2}[\/.-](?:19|20)\d{2}\b/g],
  // Street addresses
  ["ADDRESS", /\b\d{1,5}[A-Za-z]?(?:\/\d{1,5})?\s+(?:[A-Z][a-z]+\s){1,3}(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Court|Ct|Place|Pl|Crescent|Cres|Parade|Pde|Lane|Ln|Way|Highway|Hwy|Close|Terrace|Tce|Boulevard|Blvd)\b\.?/g],
  ["ADDRESS", suburbRe],
  // Names introduced explicitly
  ["PERSON", /\b(?:my name is|name\s*:|called|patient\s+name\s*:?|Mr\.?|Mrs\.?|Ms\.?|Dr\.?)\s+[A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+){0,2}/g],
];

export function scrubPii(input: string): PiiResult {
  let text = input;
  let count = 0;
  const types = new Set<PiiType>();
  for (const [type, re] of RULES) {
    re.lastIndex = 0;
    text = text.replace(re, () => { count++; types.add(type); return `[${type}]`; });
  }
  return { text, count, types: [...types] };
}
