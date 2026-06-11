import type { SelfAssessStrings } from "./types";

// Amharic. PHQ-9 follows the validated Amharic translation.
export const am: Partial<SelfAssessStrings> = {
  header: { subtitle: "የአእምሮ ጤና ራስን መገምገም", confidential: "ሚስጥራዊ" },
  progress: { stepOf: "ደረጃ {step} ከ {total}" },
  crisis: {
    heading: "በአስቸኳይ አደጋ ላይ ከሆኑ፣ እባክዎ አሁን ለአደጋ ጊዜ አገልግሎት ይደውሉ",
    numbers: {
      lifeline: "Lifeline (24/7)",
      yarn: "13YARN",
      suicide: "የራስ ግድያ መስመር",
      respect: "1800RESPECT",
      emergency: "የአደጋ ጊዜ አገልግሎት",
    },
  },
  welcome: {
    title: "የአእምሮ ጤና ራስን መገምገም",
    subtitle:
      "ይህ ነፃ፣ ሚስጥራዊ መሣሪያ የአእምሮ ጤናዎን እንዲረዱ ይረዳዎታል እና በአካባቢዎ ካሉ የአእምሮ ጤና ባለሙያዎች ጋር ያገናኝዎታል።",
    expectHeading: "ምን መጠበቅ ይችላሉ:",
    expect: [
      "አጭር የማጣራት መጠይቅ (ወደ 5 ደቂቃ)",
      "በድምፅ፣ በፅሁፍ ወይም በሰነድ ታሪክዎን የመጋራት አማራጭ",
      "በአካባቢዎ ካሉ የአእምሮ ጤና አገልግሎቶች ጋር ሚስጥራዊ ግጥሚያ",
      "የግል መለያ መረጃ አይቀመጥም",
    ],
    notEmergencyTitle: "ይህ የአደጋ ጊዜ አገልግሎት አይደለም",
    notEmergencyBody: "በአስቸኳይ አደጋ ላይ ከሆኑ፣ ለ(000) ይደውሉ ወይም ወደ ቅርብ ሆስፒታል ይሂዱ።",
    languageLabel: "የሚመርጡት ቋንቋ",
    startButton: "ራስን መገምገም ጀምር",
  },
  phq9: {
    title: "እንዴት እየተሰማዎት ነበር?",
    subtitle: "ባለፉት 2 ሳምንታት፣ ከሚከተሉት ችግሮች ውስጥ ስንት ጊዜ ተቸግረዋል?",
    questions: [
      "ነገሮችን በማድረግ ላይ ዝቅተኛ ፍላጎት ወይም ደስታ",
      "የተጨነቀ፣ የተዳከመ ወይም ተስፋ የቆረጠ ስሜት",
      "የመተኛት ችግር ወይም በጣም መተኛት",
      "የመድከም ስሜት ወይም ዝቅተኛ ጉልበት",
      "የምግብ ፍላጎት ማነስ ወይም ከመጠን በላይ መብላት",
      "ስለራስዎ መጥፎ ስሜት — ወይም ራስዎን ወይም ቤተሰብዎን ያሳዘኑ መስሎ መሰማት",
      "ነገሮችን በመከታተል ችግር፣ እንደ ማንበብ ወይም ቴሌቪዥን ማየት",
      "ሌሎች ሊያስተውሉ በሚችሉበት መልክ በዝግታ መንቀሳቀስ ወይም መናገር፤ ወይም በተቃራኒው እጅግ ያለመረጋጋት",
      "ሞት ቢቀርልዎት ይሻላል የሚል ሐሳብ፣ ወይም ራስዎን የመጉዳት ሐሳቦች",
    ],
    likert: ["በፍፁም አይደለም", "ጥቂት ቀናት", "ከግማሽ በላይ ቀናት", "ሁልጊዜ ማለት ይቻላል"],
    safetyBadge: "የደህንነት ጥያቄ",
    back: "ተመለስ",
    next: "ቀጥል",
    incompleteTitle: "አልተጠናቀቀም",
    incompleteDesc: "እባክዎ ሁሉንም 9 ጥያቄዎች ይመልሱ።",
  },
  common: { errorTitle: "ስህተት" },
};
