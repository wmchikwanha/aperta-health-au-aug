import type { SelfAssessStrings } from "./types";

// Dinka. review: phrasing awaiting community reviewer sign-off.
export const din: Partial<SelfAssessStrings> = {
  header: { subtitle: "Nyuc Riɛlpiɔu de Yi Guop", confidential: "Cïï Tiŋ" },
  welcome: {
    title: "Nyuc Riɛlpiɔu de Yi Guop",
    subtitle: "Wël kɔnë acï yï kony bï yï ŋic riɛlpiɔu duɔ̈n ku jal yï tuc kek koc ke akut tueeŋ.",
    expectHeading: "Wëët yï bï tïŋ:",
    expect: [
      "Thöök kor yic (kuat 5 mïnit)",
      "Yï leu wël duɔ̈n tëdë kɔ rin, athör tëdë document",
      "Tuc kek akut ke akut yï thïn",
      "Acin wël ke yï guop bï kuat",
    ],
    notEmergencyTitle: "Ka acïï luɔi de kuat ëmërgënthi",
    notEmergencyBody: "Të nu yï thin kuat dït, cɔɔl (000) tëdë lo tueŋ ɣön ɣa pɛi.",
    languageLabel: "Thoŋ yï kuany",
    startButton: "Jɔk Nyuc",
  },
  phq9: {
    title: "Yï tïŋ yï guop kek ŋö?",
    subtitle: "Ke ɣɛɛr 2 cï wan, kɔ ye yï tïŋ kek toolde ke kake?",
    questions: [
      "Apath ku miɛt cïn yenë looi kake",
      "Yï bï thöu, gum tëdë acïn ŋic",
      "Yï bï bɛ̈ɛ̈r tony tëdë tony aŋuum",
      "Yï bï cï dak tëdë riɛlpiɔu lɔŋ",
      "Cïï ŋic kuan tëdë kuany aŋuum",
      "Yï bï tïŋ rotdun yic — tëdë cï yï ku ɣɔndun riak",
      "Yï bï mony aluëëi, kɔ ye athör tëdë TV ŋic",
      "Cët tëdë jam apath kuany piny kuany koc nyic; tëdë ŋic cïn ɣëër",
      "Aŋuun yenë yï tïŋ ye yï pɛi athou apath, tëdë yenë yï bï rotdun riak",
    ],
    likert: ["Acïn", "Niiniin tic", "Aŋuun ka niiniin", "Nin ebën"],
    safetyBadge: "Thöök ke nhom",
    back: "Cïn",
    next: "Bën",
    incompleteTitle: "Acïï thok",
    incompleteDesc: "Bï thöök ka 9 ebën leu.",
  },
  common: { errorTitle: "Käl" },
};
