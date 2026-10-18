// Multilingual prompt-injection guard (Batch 3). Pure, no I/O — tested in input-guard_test.ts.
// Detected instruction text is replaced with [redacted-instruction]; the clinical content is kept.

export interface GuardResult {
  text: string;
  detections: string[];
  truncated: boolean;
  tooLong: boolean;
}

const P = (id: string, re: RegExp) => ({ id, re });

// Patterns span all 18 supported languages plus structural/role tokens.
export const INJECTION_PATTERNS = [
  // Structural / role tokens
  P("role_token", /<\|?\s*(?:system|assistant|im_start|im_end|endoftext)\s*\|?>/gi),
  P("tag_escape", /<\/?\s*(?:user_content|system|instructions?|assistant)\s*>/gi),
  P("role_prefix", /(?:^|\n)\s*(?:system|assistant|developer)\s*[:：]/gi),
  P("markdown_role", /#{2,}\s*(?:system|instruction)s?\b/gi),
  // English
  P("en_ignore", /\b(?:ignore|disregard|forget|override|bypass)\b[^.\n]{0,40}\b(?:previous|prior|above|earlier|all|your|system)\b[^.\n]{0,20}\b(?:instructions?|prompts?|rules?|directions?)\b/gi),
  P("en_you_are_now", /\byou\s+are\s+now\b|\bact\s+as\s+(?:a|an|the)\b|\bpretend\s+to\s+be\b|\bnew\s+instructions?\s*:/gi),
  P("en_jailbreak", /\b(?:jailbreak|DAN mode|developer mode|do anything now)\b/gi),
  P("en_reveal", /\b(?:reveal|print|show|repeat)\b[^.\n]{0,30}\b(?:system prompt|your instructions|hidden prompt)\b/gi),
  // Arabic
  P("ar_ignore", /(?:تجاهل|انس|تخط)[^.\n]{0,40}(?:التعليمات|الأوامر|التوجيهات)/g),
  P("ar_you_are_now", /أنت\s+الآن|تصرف\s+ك/g),
  // Farsi / Dari / Hazaragi
  P("fa_ignore", /(?:نادیده\s*بگیر|فراموش\s*کن)[^.\n]{0,40}(?:دستور|دستورالعمل|قوانین)|(?:دستور|دستورالعمل)[^.\n]{0,40}(?:نادیده\s*بگیر|فراموش\s*کن)/g),
  P("fa_you_are_now", /تو\s+(?:اکنون|حالا)\s/g),
  // Pashto
  P("ps_ignore", /(?:لارښوونې|امرونه)[^.\n]{0,40}(?:له\s*پامه|هیر)/g),
  // Urdu
  P("ur_ignore", /(?:ہدایات|احکامات)[^.\n]{0,40}(?:نظرانداز|بھول)|(?:نظرانداز|بھول\s*جاؤ)[^.\n]{0,40}(?:ہدایات)/g),
  P("ur_you_are_now", /تم\s+اب\s/g),
  // Burmese
  P("my_ignore", /ညွှန်ကြားချက်[^\n]{0,40}(?:လျစ်လျူရှု|မေ့)/g),
  // Tigrinya / Amharic (Ge'ez)
  P("ti_ignore", /መምርሒ[^\n]{0,40}(?:ሕደግ|ሕደጎ|ረስዕ)/g),
  P("am_ignore", /(?:መመሪያ|ትዕዛዝ)[^\n]{0,40}(?:ችላ|እርሳ|ተው)/g),
  // Swahili / Kirundi / Kinyarwanda
  P("sw_ignore", /\b(?:puuza|sahau|acha)\b[^.\n]{0,40}\b(?:maagizo|maelekezo)\b/gi),
  P("rw_rn_ignore", /\b(?:irengagize|wibagirwe|ntiwite)\b[^.\n]{0,40}\b(?:amabwiriza|amategeko)\b/gi),
  // Vietnamese
  P("vi_ignore", /\b(?:bỏ qua|phớt lờ|quên)\b[^.\n]{0,40}\b(?:hướng dẫn|chỉ dẫn|lệnh)\b/gi),
  P("vi_you_are_now", /\bbạn\s+bây\s+giờ\s+là\b/gi),
  // Tamil
  P("ta_ignore", /(?:அறிவுறுத்தல்|கட்டளை)[^\n]{0,40}(?:புறக்கணி|மறந்து)/g),
  // Dinka / Nuer / Rohingya (romanised) — conservative English-loan patterns
  P("romanised_ignore", /\b(?:ignore|forget)\s+(?:instruction|instructions|hukum|kotha)\b/gi),
];

const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF\u202A-\u202E]/g;

export function normalise(input: string): string {
  return input.normalize("NFKC").replace(ZERO_WIDTH, "");
}

export function guardInput(raw: unknown, maxChars = 30000): GuardResult {
  const original = typeof raw === "string" ? raw : "";
  const tooLong = original.length > maxChars;
  let text = normalise(original.slice(0, maxChars));
  const detections: string[] = [];
  for (const { id, re } of INJECTION_PATTERNS) {
    re.lastIndex = 0;
    if (re.test(text)) {
      detections.push(id);
      re.lastIndex = 0;
      text = text.replace(re, "[redacted-instruction]");
    }
  }
  return { text, detections, truncated: tooLong, tooLong };
}

/** Wrap guarded user text in delimiters the safety preamble tells the model never to obey. */
export function wrapUserContent(text: string, label = "clinical_input"): string {
  return `<user_content type="${label}">\n${text}\n</user_content>`;
}
