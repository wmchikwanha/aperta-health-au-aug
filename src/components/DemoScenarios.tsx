import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DemoScenariosProps {
  onLoadDemo: (narrative: string) => void;
}

/**
 * Australian CALD / refugee demonstration cases.
 *
 * Each scenario is composite and de-identified — designed to exercise the
 * Aperta Health MSE generation, cultural idiom decoding, ATS triage, and
 * MBS-aligned treatment-plan logic across priority refugee populations.
 *
 * All cases include resettlement context (visa pathway, family separation,
 * pre-migration trauma) and an Australian crisis pathway where relevant.
 */
const demoScenarios = [
  {
    title: "Arabic (Syrian): Mother — ḍayqa ṣadr",
    description: "Somatic depression with PTSD overlay; partner permanent humanitarian (subclass 202).",
    narrative: `38-year-old Syrian-born woman, in Australia 18 months on a 202 (Global Special Humanitarian) visa. Interview conducted in Arabic via TIS National.

"عندي ضيقة صدر طول الوقت. أعصابي تعبانة. ما بقدر أنام، لما أنام بحلم بالقصف. ولادي ما زالوا بسوريا، ما شفتهم من سنتين. قلبي محروق."
(Translation: "I have tightness in my chest all the time. My nerves are tired. I can't sleep, and when I do I dream of the bombing. My children are still in Syria, I haven't seen them for two years. My heart is burning.")

Reports daily chest tightness, intrusive memories of shelling, hypervigilance to sudden noise, early-morning waking. Cardiac workup at the local ED was unremarkable. Currently engaged with a settlement caseworker. No prior mental-health contact.`,
  },
  {
    title: "Dari (Hazara Afghan): Young man — delam gerefte / jigaram khun",
    description: "Profound grief, family separation, possible passive SI. Bridging Visa E.",
    narrative: `24-year-old Hazara man from Afghanistan, arrived by boat in 2023, currently on a Bridging Visa E. Interview in Dari via TIS National (interpreter-assisted; ASR draft only).

"دلم گرفته. شب‌ها نمی‌توانم بخوابم. خواهرم در کابل توسط طالبان کشته شد. جگرم خون است. گاهی فکر می‌کنم چرا زنده هستم. خانواده‌ام بدون من بهتر هستند."
(Translation: "My heart is heavy. I cannot sleep at night. My sister was killed in Kabul by the Taliban. My liver is bleeding. Sometimes I think why am I alive. My family would be better off without me.")

Passive suicidal ideation expressed via burden narrative. No active plan. Lives alone in shared accommodation. No Medicare under BVE — currently linked to ASRC clinic. Caseworker concerned about visa-precarity stress.`,
  },
  {
    title: "Urdu (Rohingya): Older woman — dil tang hai",
    description: "Late-life depression with isolation. Permanent protection (866).",
    narrative: `62-year-old Rohingya woman, granted subclass 866 after years on a TPV. Speaks Urdu and Rohingya; daughter-in-law interpreting.

"دل تنگ ہے۔ سارا دن گھر میں اکیلی بیٹھتی ہوں۔ پوتے پوتیاں سکول جاتے ہیں۔ بیٹا کام پر۔ کسی سے بات نہیں کر سکتی۔ نیند نہیں آتی۔ کھانا اچھا نہیں لگتا۔"
(Translation: "My heart is constricted. I sit alone in the house all day. The grandchildren go to school, my son to work. I cannot talk to anyone. I cannot sleep. Food has no taste.")

Reports 3 months of low mood, anhedonia, weight loss 4 kg, early-morning waking. No SI. GDS-15 indicated. Previously witnessed violence in Myanmar. Currently isolated socially; limited English literacy.`,
  },
  {
    title: "Dinka (South Sudanese): Young father — puou diit",
    description: "Trauma-laden anger, family-violence concern. Citizen (resettled as child).",
    narrative: `29-year-old South Sudanese-Australian man, citizen, resettled as a child via a 204 (Woman at Risk) family. Speaks English and Dinka. Bicultural worker present.

"My heart is big all the time. Puou diit. I shout at my wife, at the kids — I don't want to but it comes. I see the soldiers again at night. I drink to sleep. The job is gone. My wife says she will leave."

Reports nightmares (war), explosive anger, alcohol use to sleep (6+ standard drinks/night), recent job loss. Partner concerned about escalating verbal aggression; no physical violence reported but risk increasing. Wife and 2 young children at home.`,
  },
  {
    title: "Vietnamese: Older woman — suy nghĩ nhiều",
    description: "GAD/MDD with somatic presentation in long-settled refugee.",
    narrative: `71-year-old Vietnamese-Australian woman, in Australia since 1981. Speaks Vietnamese; daughter interpreting.

"Tôi suy nghĩ nhiều lắm. Đêm không ngủ được. Đầu đau, ngực nặng. Tôi lo cho con cháu hoài. Bác sĩ nói tim tôi không sao nhưng tôi vẫn thấy mệt."
(Translation: "I think too much. I can't sleep at night. My head hurts, my chest feels heavy. I worry about my children and grandchildren constantly. The doctor says my heart is fine but I still feel exhausted.")

Long-standing rumination, somatic complaints, multiple cardiology workups unremarkable. Bereaved (husband died 8 months ago). MBS MHTP eligible; daughter requesting culturally matched clinician.`,
  },
  {
    title: "Aboriginal woman — SEWB framing",
    description: "Kinship grief and dislocation; ATSI cultural safety pathway.",
    narrative: `34-year-old Aboriginal woman (identifies as Aboriginal, no Torres Strait Islander heritage), living off-Country in regional NSW.

"I just feel disconnected, doc. Lost my Nan six months ago, then my cousin last month — sorry business one after another. I can't get back home to Country for ceremony, the kids' school, work. I'm angry all the time, then numb. The kids see me crying. I dreamed about Nan three nights running — she was calling me. I'm not crazy — that's our way — but I'm exhausted."

Reports compounded loss, inability to attend funerals on Country, anger alternating with numbness, vivid dreams of deceased kin (culturally meaningful, not psychotic). No SI/HI. Children in care of partner. Frame within SEWB; consider AHW/AMHW involvement and 13YARN as crisis pathway if escalation.`,
  },
  {
    title: "Tigrinya (Eritrean): Young woman — early psychosis screen",
    description: "Attenuated psychotic symptoms; recent SHEV approval.",
    narrative: `21-year-old Eritrean woman, recently transitioned from TPV to SHEV (790). Speaks Tigrinya via TIS National (interpreter-assisted).

(Translated) "Sometimes I hear my name when no one is there. Shadows in the corner of my eye. People on the bus look at me strangely — I think they know my family. My thoughts get loud, like they are not all mine. I am scared to tell anyone — they will say I am crazy. I cannot study."

Attenuated positive symptoms over 4 months, increasing distress, functional decline (deferred TAFE enrolment). Insight partially preserved. No family history known (parents deceased in Eritrea). PRIME-R-5 / PSQ indicated; refer to local headspace / EPYS service.`,
  },
];

export const DemoScenarios = ({ onLoadDemo }: DemoScenariosProps) => {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Demo Scenarios — Australian CALD / Refugee</CardTitle>
        <CardDescription>
          Composite, de-identified cases exercising cultural idiom decoding, ATS triage,
          and MBS-aligned treatment-plan logic.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {demoScenarios.map((scenario, index) => (
          <Button
            key={index}
            variant="outline"
            className="w-full justify-start text-left h-auto py-3 hover:bg-accent"
            onClick={() => onLoadDemo(scenario.narrative)}
          >
            <div className="space-y-1">
              <div className="font-semibold text-foreground">{scenario.title}</div>
              <div className="text-xs text-muted-foreground">{scenario.description}</div>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};
