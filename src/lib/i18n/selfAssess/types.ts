// Self-Assessment i18n string contract. English is canonical; other locales mirror these keys.
// Missing keys fall back to English at runtime (see ./index.ts).

export interface SelfAssessStrings {
  header: { subtitle: string; confidential: string };
  progress: { stepOf: string }; // "Step {step} of {total}"
  crisis: {
    heading: string;
    numbers: { lifeline: string; yarn: string; suicide: string; respect: string; emergency: string };
  };
  welcome: {
    title: string;
    subtitle: string;
    expectHeading: string;
    expect: [string, string, string, string];
    notEmergencyTitle: string;
    notEmergencyBody: string;
    languageLabel: string;
    startButton: string;
  };
  consent: {
    title: string;
    subtitle: string;
    items: {
      screening: string;
      data: string;
      emergency: string;
      voluntary: string;
      age: string;
      research: string;
    };
    back: string;
    agree: string;
    requiredTitle: string;
    requiredDesc: string;
  };
  demographics: {
    title: string;
    subtitle: string;
    ageLabel: string;
    agePlaceholder: string;
    genderLabel: string;
    genderPlaceholder: string;
    genderOptions: { male: string; female: string; nonbinary: string; prefer: string };
    regionLabel: string;
    regionPlaceholder: string;
    back: string;
    next: string;
    requiredTitle: string;
    requiredDesc: string;
  };
  phq9: {
    title: string;
    subtitle: string;
    questions: [string, string, string, string, string, string, string, string, string];
    likert: [string, string, string, string];
    safetyBadge: string;
    back: string;
    next: string;
    incompleteTitle: string;
    incompleteDesc: string;
  };
  narrative: {
    title: string;
    subtitle: string;
    placeholder: string;
    speak: string;
    stop: string;
    upload: string;
    accepted: string;
    back: string;
    submit: string;
    skip: string;
  };
  completing: { title: string; subtitle: string };
  result: {
    crisisTitle: string;
    crisisBody: string;
    completeTitle: string;
    completeBody: string;
    nearbyTitle: string;
    nearbySubtitle: string;
    emergencyBadge: string;
    websiteLabel: string;
    noFacilities: string;
    meantime: string;
    refIdTitle: string;
    refIdSubtitle: string;
    refIdLabel: string;
    pinLabel: string;
    saveWarn: string;
    saveWarnBody: string;
    copy: string;
    copied: string;
    checkStatus: string;
    nextTitle: string;
    next1: string;
    next2: string;
    next3: string;
    facilityCta: string;
    facilityCtaBody: string;
    facilityCtaBtn: string;
    home: string;
  };
  common: { errorTitle: string };
}
