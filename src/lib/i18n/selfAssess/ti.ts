import type { SelfAssessStrings } from "./types";

// Tigrinya. review: clinical reviewer sign-off pending for PHQ-9 wording.
export const ti: Partial<SelfAssessStrings> = {
  header: { subtitle: "ናይ ኣእምሮ ጥዕና ናይ ገዛእ ርእስኻ ግምገማ", confidential: "ምስጢራዊ" },
  progress: { stepOf: "ስጉምቲ {step} ካብ {total}" },
  crisis: {
    heading: "ኣብ ህጹጽ ሓደጋ እንተሊኻ፣ በጃኹም ሕጂ ናብ ህጹጽ ኣገልግሎታት ደውሉ",
    numbers: {
      lifeline: "Lifeline (24/7)",
      yarn: "13YARN",
      suicide: "ናይ ነብሰ-ቅትለት መልሲ ኣገልግሎት",
      respect: "1800RESPECT",
      emergency: "ህጹጽ ኣገልግሎታት",
    },
  },
  welcome: {
    title: "ናይ ኣእምሮ ጥዕና ናይ ገዛእ ርእስኻ ግምገማ",
    subtitle:
      "እዚ ብናጻን ብምስጢራውን ዝሰርሕ መሳርሒ ናይ ኣእምሮ ጥዕናኻ ንክትርዳእን ኣብ ከባቢኻ ምስ ዘሎዉ ናይ ኣእምሮ ጥዕና ሰብ ሞያ ንክተራኽበካን ይሕግዘካ።",
    expectHeading: "እንታይ ክትጽበ ትኽእል፡",
    expect: [
      "ሓጺር መርመራ መሕተት (ኣስታት 5 ደቓይቕ)",
      "ብድምጺ፣ ብጽሑፍ ወይ ሰነድ ብምልኣኽ ታሪኽካ ምክፋል",
      "ኣብ ከባቢኻ ዘለዋ ኣገልግሎታት ብምስጢራዊ መንገዲ ምትእስሳር",
      "ምንም ዓይነት ናይ ግላዊ ሓበሬታ ኣይዕቀብን",
    ],
    notEmergencyTitle: "እዚ ህጹጽ ኣገልግሎት ኣይኮነን",
    notEmergencyBody:
      "ኣብ ህጹጽ ሓደጋ እንተሊኻ ወይ ንርእስኻ ናይ ምጉዳእ ሓሳባት እንተሎካ፣ ናብ ህጹጽ ኣገልግሎታት (000) ደውል ወይ ናብ ቀረባ ሆስፒታል ኪድ።",
    languageLabel: "ዝመረጽካዮ ቋንቋ",
    startButton: "ገምጋም ጀምር",
  },
  phq9: {
    title: "ከመይ ይስምዓካ ኔሩ?",
    subtitle: "ኣብ ዝሓለፋ 2 ሰሙናት፣ ካብዞም ዝስዕቡ ጸገማት ክንደይ ግዜ ተሰማዒካ?",
    questions: [
      "ኣብ ነገራት ናይ ምግባር ድሌት ወይ ሓጎስ ምጉዳል",
      "ጓሂ፣ ጭንቀት ወይ ተስፋ ምስኣን ምስምዕ",
      "ናይ ድቃስ ጸገም ወይ ብዙሕ ምድቃስ",
      "ድኻም ወይ ትሑት ጉልበት ምስምዕ",
      "ድሌት መግቢ ምጉዳል ወይ ብዙሕ ምብላዕ",
      "ብዛዕባ ርእስኻ ሕማቕ ምስምዕ — ወይ ከም ሓላፍ ኮይኑ ምስምዓካ",
      "ኣብ ነገራት ምትኳር ምስኣን፣ ከም ምንባብ ወይ ቴለቪዥን ምርኣይ",
      "ካልኦት ዘስተብህልሉ ብዝያዳ ብዘሰክሐ ምንቅስቓስ ወይ ምዝራብ፤ ወይ ብኣንጻሩ ብጣዕሚ ዘይምርግጋእ",
      "ሞት ይሕሸካ ዝብል ሓሳብ፣ ወይ ንርእስኻ ናይ ምጉዳእ ሓሳባት",
    ],
    likert: ["ፈጺምካ ኣይኮነን", "ሒደት መዓልታት", "ካብ ፍርቂ መዓልታት ንላዕሊ", "ኩሉ ግዜ ማለት ይከኣል"],
    safetyBadge: "ናይ ድሕንነት ሕቶ",
    back: "ተመለስ",
    next: "ቀጽል",
    incompleteTitle: "ዘይተኻእለ",
    incompleteDesc: "በጃኹም ኩሎም 9ቱ ሕቶታት መልሲ ሃቡ።",
  },
  common: { errorTitle: "ጌጋ" },
};
