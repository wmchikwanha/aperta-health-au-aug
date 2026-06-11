import type { SelfAssessStrings } from "./types";

// Kirundi. review: clinical reviewer sign-off pending.
export const rn: Partial<SelfAssessStrings> = {
  header: { subtitle: "Kwisuzuma Amagara y'Umutwe", confidential: "Ibanga" },
  welcome: {
    title: "Kwisuzuma Amagara y'Umutwe",
    subtitle: "Iki gikoresho ku buntu, c'ibanga gifasha gutahura amagara y'umutwe wawe no kuguhuza n'abahanga mu karere kawe.",
    expectHeading: "Ico ushobora kwitega:",
    expect: [
      "Ikibazo kigufi (nk'iminota 5)",
      "Uburyo bwo gusangira inkuru yawe mu majwi, mu nyandiko canke mu nyandiko zinjijwe",
      "Guhuzwa n'ibikorwa vy'amagara y'umutwe iruhande yawe mu banga",
      "Nta makuru y'umuntu abikwa",
    ],
    notEmergencyTitle: "Iki si igikorwa c'ihutirwa",
    notEmergencyBody: "Niba uri mu kaga gakomeye, terefona (000) canke uje mu bitaro biri hafi.",
    languageLabel: "Ururimi wahisemwo",
    startButton: "Tangura Kwisuzuma",
  },
  phq9: {
    title: "Wamerewe Gute?",
    subtitle: "Mu ndwi 2 ziheze, kangahe wahungabanijwe n'ibibazo bikurikira?",
    questions: [
      "Kutagira inyota canke umunezero wo gukora ibintu",
      "Kwiyumva wagwa intege, ubabaye canke utagira icizigiro",
      "Ingorane zo gusinzira canke gusinzira cane",
      "Kwiyumva uruhuye canke ukagira inguvu nke",
      "Kudashaka kurya canke kurya cane",
      "Kwiyumva nabi — canke ko wananiwe canke ko utesheje umuryango",
      "Ingorane zo guhugukira ibintu, nko gusoma canke kuraba televiziyo",
      "Kugenda canke kuvuga buhoro bishika abandi babibone, canke ukidatuza",
      "Iciyumviro c'uko vyoba vyiza upfuye, canke ico kwiyangira",
    ],
    likert: ["Nta na rimwe", "Iminsi mike", "Hejuru y'iminsi nk'ibice bibiri", "Hafi y'imisi yose"],
    safetyBadge: "Ikibazo c'umutekano",
    back: "Subira inyuma",
    next: "Bandanya",
    incompleteTitle: "Ntibirashika",
    incompleteDesc: "Subiriza ibibazo 9 vyose.",
  },
  common: { errorTitle: "Ikosa" },
};
