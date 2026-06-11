import type { SelfAssessStrings } from "./types";
import { fa } from "./fa";

// Dari (Afghan Persian) — leverages Farsi bundle with Dari-specific adjustments.
// review: Dari clinical phrasing for PHQ-9 should be verified by a clinical reviewer.
export const prs: Partial<SelfAssessStrings> = {
  ...fa,
  header: { subtitle: "ارزیابی شخصی روانی", confidential: "محرمانه" },
  welcome: {
    ...(fa.welcome as any),
    title: "ارزیابی شخصی صحت روانی",
    startButton: "ارزیابی شخصی را آغاز کنید",
    languageLabel: "زبان دلخواه",
  },
  consent: { ...(fa.consent as any), title: "رضایت و معلومات ایمنی", agree: "موافقم و دوام میدهم" },
  demographics: { ...(fa.demographics as any), title: "درباره شما", next: "ادامه به معاینه" },
  phq9: {
    ...(fa.phq9 as any),
    title: "چه احساسی داشته‌اید؟",
    likert: ["هیچ", "چند روز", "بیشتر از نصف روزها", "تقریباً هر روز"],
  },
};
