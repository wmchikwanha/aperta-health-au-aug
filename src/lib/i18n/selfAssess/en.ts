import type { SelfAssessStrings } from "./types";

export const en: SelfAssessStrings = {
  header: { subtitle: "Mental Health Self-Assessment", confidential: "Confidential" },
  progress: { stepOf: "Step {step} of {total}" },
  crisis: {
    heading: "If you are in immediate danger, please contact emergency services now",
    numbers: {
      lifeline: "Lifeline (24/7)",
      yarn: "13YARN (Aboriginal & Torres Strait Islander, 24/7)",
      suicide: "Suicide Call Back Service",
      respect: "1800RESPECT (DFV / sexual assault)",
      emergency: "Emergency Services",
    },
  },
  welcome: {
    title: "Mental Health Self-Assessment",
    subtitle:
      "This free, confidential tool helps you understand your mental wellbeing and connects you with mental health professionals in your area.",
    expectHeading: "What to expect:",
    expect: [
      "A short screening questionnaire (about 5 minutes)",
      "Option to share your story by voice, text, or document upload",
      "Confidential matching to mental health services near you",
      "No personal identifying information is stored",
    ],
    notEmergencyTitle: "This is NOT an emergency service",
    notEmergencyBody:
      "If you are in immediate danger or having thoughts of harming yourself, please call emergency services (000) or go to your nearest emergency room.",
    languageLabel: "Preferred language",
    startButton: "Begin Self-Assessment",
  },
  consent: {
    title: "Consent & Safety Information",
    subtitle: "Please read and agree to the following before continuing.",
    items: {
      screening:
        "I understand this is a mental health screening tool only, NOT a diagnosis or medical advice. Results will help connect me with appropriate mental health services.",
      data:
        "I consent to my anonymised responses being shared with matched mental health facilities to facilitate a referral.",
      emergency:
        "I understand that in a medical emergency, I should call emergency services (000) or go to my nearest emergency room immediately. This tool is NOT an emergency service.",
      voluntary:
        "I confirm I am completing this assessment voluntarily and that my responses are truthful to the best of my knowledge.",
      age:
        "I confirm I am 18 years of age or older, or I am completing this with a parent/guardian's knowledge.",
      research:
        "I optionally consent to my fully anonymised data being used for mental health research to improve services in my region.",
    },
    back: "Back",
    agree: "I Agree & Continue",
    requiredTitle: "Required consents",
    requiredDesc: "Please agree to all required items before continuing.",
  },
  demographics: {
    title: "About You",
    subtitle: "Help us match you with the right services. No identifying information is stored.",
    ageLabel: "Age range",
    agePlaceholder: "Select age range",
    genderLabel: "Gender",
    genderPlaceholder: "Select gender",
    genderOptions: {
      male: "Male",
      female: "Female",
      nonbinary: "Non-binary",
      prefer: "Prefer not to say",
    },
    regionLabel: "State / Territory",
    regionPlaceholder: "Select your region",
    back: "Back",
    next: "Continue to Screening",
    requiredTitle: "Required fields",
    requiredDesc: "Please complete all required fields.",
  },
  phq9: {
    title: "How Have You Been Feeling?",
    subtitle:
      "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
    questions: [
      "Little interest or pleasure in doing things",
      "Feeling down, depressed, or hopeless",
      "Trouble falling or staying asleep, or sleeping too much",
      "Feeling tired or having little energy",
      "Poor appetite or overeating",
      "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
      "Trouble concentrating on things, such as reading or watching television",
      "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless",
      "Thoughts that you would be better off dead, or of hurting yourself in some way",
    ],
    likert: ["Not at all", "Several days", "More than half the days", "Nearly every day"],
    safetyBadge: "Safety question",
    back: "Back",
    next: "Continue",
    incompleteTitle: "Incomplete",
    incompleteDesc: "Please answer all 9 questions.",
  },
  narrative: {
    title: "Tell Us More (Optional)",
    subtitle:
      "Share anything else about how you've been feeling. You can type, speak, or upload documents from previous appointments.",
    placeholder: "Describe what's been on your mind, any symptoms, or concerns you'd like help with...",
    speak: "Speak",
    stop: "Stop Recording",
    upload: "Upload Document",
    accepted: "Accepted: PDF, images (JPG, PNG), or text files from previous appointments.",
    back: "Back",
    submit: "Submit & Get Results",
    skip: "Skip & Get Results",
  },
  completing: {
    title: "Processing your assessment...",
    subtitle: "We're matching you with mental health services in your area.",
  },
  result: {
    crisisTitle: "Immediate Support Available",
    crisisBody:
      "Based on your responses, we strongly recommend you speak with someone right away. Please contact one of the services below or go to your nearest emergency room.",
    completeTitle: "Assessment Complete",
    completeBody:
      "Thank you for completing this self-assessment. Based on your responses, we've identified mental health services that may be able to help you.",
    nearbyTitle: "Recommended Services Near You",
    nearbySubtitle:
      "These facilities have been notified of your referral. You can also contact them directly.",
    emergencyBadge: "Emergency capable",
    websiteLabel: "Website",
    noFacilities:
      "No facilities are currently registered in your region. Your assessment has been recorded and you will be contacted when services become available.",
    meantime: "In the meantime, you can reach out to:",
    refIdTitle: "Your Referral ID — write this down now",
    refIdSubtitle:
      "This is the only way to follow up anonymously. We cannot recover your PIN if you lose it.",
    refIdLabel: "Referral ID",
    pinLabel: "Verification PIN",
    saveWarn: "⚠ Save these before closing this page",
    saveWarnBody: "Screenshot, write down, or copy them. They will not be shown again.",
    copy: "Copy",
    copied: "Copied",
    checkStatus: "Check status or message your facility",
    nextTitle: "What Happens Next?",
    next1: "Your matched facility has been notified of your anonymous referral.",
    next2:
      "Visit, call, or email the facility and quote your Referral ID + PIN — they will pull up your assessment immediately.",
    next3:
      "If it's not urgent, please follow up within 14 days. You can also return here any time to check status, message the facility, or share contact details if you'd like them to reach out directly.",
    facilityCta: "Are you a mental health facility?",
    facilityCtaBody:
      "Register your facility on Aperta Health to receive self-referrals and connect with patients in your region.",
    facilityCtaBtn: "Register Your Facility",
    home: "Return to Home",
  },
  common: { errorTitle: "Error" },
};
