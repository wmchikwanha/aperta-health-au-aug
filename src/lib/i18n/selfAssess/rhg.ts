import type { SelfAssessStrings } from "./types";

// Rohingya (Hanifi/Latin transliteration commonly used in Australian resettlement settings).
// review: phrasing awaiting community reviewer sign-off — English fallback covers any missing key.
export const rhg: Partial<SelfAssessStrings> = {
  header: { subtitle: "Manor Sastho Nizor Jachai", confidential: "Gufon" },
  welcome: {
    title: "Manor Sastho Nizor Jachai",
    subtitle:
      "Iin ekta moftor, gufon ouzar ase jiba apnar manor sastho bujhaite modot gore edde apnare elaka or daktor sob loi milaide.",
    expectHeading: "Ki azabe:",
    expect: [
      "Ekta chutu jachai (5 minute or aro)",
      "Apnar gôtha awaz, lekha ba document diye bolaite paribi",
      "Apnar elaka or manor sastho daktor sob loi gufon e mil hoibo",
      "Kunor naam ba khôbôr rakha noi",
    ],
    notEmergencyTitle: "Iin emergency seva noi",
    notEmergencyBody:
      "Apni khub khotor o thain ba nize ke jokhom goron buli sotcho korile, emergency (000) re call goron ba kase or hospital re zaite paribi.",
    languageLabel: "Asha or bhasha",
    startButton: "Nizor Jachai Suru Goron",
  },
  phq9: {
    title: "Apni kemne anubhab gorer?",
    subtitle: "Ekhon 2 hapta or bitore, kotbar apni in samasya gula loi onuvob gorile?",
    questions: [
      "Kam korite man na lawa ba khusi na pawa",
      "Mon kharap, dukkho ba aksha-na lagai",
      "Ghum aha mushkil ba beshi ghum",
      "Klanto lage ba kom shokti",
      "Khaite mon na lawa ba beshi khawa",
      "Nije ke kharap lagai — ba nije ke ba poribar ke nairaj korechi",
      "Kunoo bishoy e mon dite na para, jemon lekha ba TV deka",
      "Beshi aaste cholon ba kotha bolon je oinno manush bujhe; ba ekdom ostith",
      "Sotcho asho ze nije more gele bhalo hoito, ba nije ke koshto deba",
    ],
    likert: ["Ekdom na", "Kichu din", "Ardher beshi din", "Prai sob din"],
    safetyBadge: "Surokkha proshno",
    back: "Phire zaa",
    next: "Sõmoy ekhoni",
    incompleteTitle: "Sob shesh noi",
    incompleteDesc: "Doya kori 9 ta proshno or jowab dia.",
  },
  common: { errorTitle: "Bhul" },
};
