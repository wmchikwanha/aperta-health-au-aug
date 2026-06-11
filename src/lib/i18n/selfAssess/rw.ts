import type { SelfAssessStrings } from "./types";

// Kinyarwanda. review: clinical reviewer sign-off pending.
export const rw: Partial<SelfAssessStrings> = {
  header: { subtitle: "Kwisuzuma Ubuzima bwo mu Mutwe", confidential: "Ibanga" },
  welcome: {
    title: "Kwisuzuma Ubuzima bwo mu Mutwe",
    subtitle: "Iki gikoresho cy'ubuntu kandi cy'ibanga kigufasha gusobanukirwa ubuzima bwawe bwo mu mutwe no kukuhuza n'inzobere mu karere kawe.",
    expectHeading: "Ibyo ushobora kwitega:",
    expect: [
      "Igisuzuma gito (iminota 5)",
      "Uburyo bwo gusangira inkuru yawe mu majwi, mu nyandiko cyangwa mu nyandiko zinjijwe",
      "Guhuzwa n'ibitaro biri hafi yawe mu ibanga",
      "Nta makuru bwite abikwa",
    ],
    notEmergencyTitle: "Iyi si serivisi y'ihutirwa",
    notEmergencyBody: "Niba uri mu kaga gakomeye, hamagara (000) cyangwa ujye ku bitaro biri hafi.",
    languageLabel: "Ururimi rwakunda",
    startButton: "Tangira Kwisuzuma",
  },
  phq9: {
    title: "Wumva umeze ute?",
    subtitle: "Mu byumweru 2 bishize, ni kangahe ibibazo bikurikira byagiye bikubangamira?",
    questions: [
      "Kutagira inyota cyangwa ibyishimo byo gukora ibintu",
      "Kwiyumva uri bubabaye, urambiwe cyangwa utagira icyizere",
      "Ibibazo byo gusinzira cyangwa gusinzira cyane",
      "Kwiyumva unaniwe cyangwa ufite imbaraga nke",
      "Kutagira inyota yo kurya cyangwa kurya cyane",
      "Kwiyumva nabi — cyangwa ko wananiwe cyangwa watesheje umuryango",
      "Ibibazo byo gushyira ibitekerezo ku kintu, nko gusoma cyangwa kureba televiziyo",
      "Kugenda cyangwa kuvuga buhoro bigatuma abandi babibona; cyangwa kidasanzwe kutaruhuka",
      "Ibitekerezo by'uko byaba byiza upfuye, cyangwa ibyo kwiyangiza",
    ],
    likert: ["Nta na rimwe", "Iminsi mike", "Hejuru y'iminsi y'ibice bibiri", "Hafi buri munsi"],
    safetyBadge: "Ikibazo cy'umutekano",
    back: "Subira inyuma",
    next: "Komeza",
    incompleteTitle: "Ntibyuzuye",
    incompleteDesc: "Nyamuneka subiza ibibazo byose 9.",
  },
  common: { errorTitle: "Ikosa" },
};
