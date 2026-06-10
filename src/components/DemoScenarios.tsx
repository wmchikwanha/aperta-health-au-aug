import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DemoScenariosProps {
  onLoadDemo: (narrative: string) => void;
}

const demoScenarios = [
  {
    title: "Shona: Rural Woman - Mhepo",
    description: "Traditional beliefs and spiritual attribution",
    narrative: `Elderly woman from rural Masvingo. Speaking in Shona:

"Ndinofunga kuti ndine mhepo. Shiri dzinondibvunza husiku. Dzinotaura nezvangu, dzinondishora. Vavakidzani vangu vanoshandisa juju pamusoro pangu. Vanondivenga nokuti ndakafa nemurume wangu gore rapfuura. Handigone kurara. Moyo unorwadza. Ndakafa kufunga."

She gestures towards her head frequently, looks around nervously, and speaks in a low, fearful tone. Reports not sleeping for days. Neighbours allegedly spreading rumours about her.`,
  },
  {
    title: "Zulu: Young Man - Ukuthwasa",
    description: "Ancestral calling with dissociative features",
    narrative: `28-year-old man from KwaZulu-Natal. Speaking in Zulu:

"Ngicabanga ukuthi ngiyathwasa. Amadlozi ayakhuluma nami ebusuku. Ngibona izinto ezingekho. Inhliziyo yami iyabuhlungu. Umndeni wami uthi kumele ngihambe ngiye esangomeni kodwa bengiyesaba. Ngizizwa ngingenammoya, angikwazi ukusebenza. Amabhayi ami ayangibiza."

Patient appears distressed, reports hearing voices instructing him to become a traditional healer. Describes vivid dreams and seeing deceased relatives. Conflicted between modern medicine and cultural expectations.`,
  },
  {
    title: "Xhosa: Middle-aged Woman - Amafufunyana",
    description: "Spirit possession and dissociation",
    narrative: `42-year-old woman from Eastern Cape. Speaking in Xhosa:

"Ndinomqondo ophazamisekileyo. Ndiziva ndinezinto ezingamandla kum. Kuthiwa ndinamafufunyana. Intliziyo yam ibuhlungu kakhulu. Ndikhathazeka ngokugula kwam. Ngamanye amaxesha andiqondi into endiyenzayo. Usapho lwam luthi isigulo sokoyika."

Patient reports episodes where she feels controlled by external forces. Describes periods of amnesia and altered consciousness. Family seeking both medical and traditional treatment simultaneously. Appears anxious and fearful.`,
  },
  {
    title: "Sotho: Elderly Man - Bolwetse ba Kelello",
    description: "Mental illness with spiritual pollution concerns",
    narrative: `65-year-old man from Free State. Speaking in Sesotho:

"Ke na le bolwetse ba kelello. Pelo yaka e bohloko haholo. Ke nahana haholo ka bana baka ba hlokofetseng. Seriti sa ka se silafetse. Ditlhakore di a nkgathatsa. Ke tshoha ho robala. Baheso ba re ke tshwanela ho hlatswa."

Patient describes severe grief following death of children. Believes his spirit is polluted and requires traditional cleansing. Reports insomnia and overwhelming sadness. Family pressure for both medical and traditional interventions. Withdrawn, poor self-care.`,
  },
  {
    title: "Urban Youth: Substance Use",
    description: "Modern context with suicidal ideation",
    narrative: `22-year-old male from Johannesburg. Speaks English with local slang:

"I'm just feeling numb, you know? Like nothing matters anymore. Been using broncleer (cough syrup with codeine) for months now. Started at parties, now it's daily. Can't feel happy without it. My mates say I've changed, but I don't care. Sometimes I think maybe... maybe it would be better if I wasn't here. Not that I'd do anything, but yeah, the thought crosses my mind."

Appears dishevelled, poor eye contact, flat affect. Admits to missing work frequently. Reports feeling empty and purposeless. RED ALERT: Passive suicidal ideation present.`,
  },
  {
    title: "Young Adult: Prodromal Psychosis",
    description: "Attenuated symptoms - PRIME-R-5 relevant",
    narrative: `19-year-old university student. Speaking in English:

"Something's not right with me lately. Sometimes I see things out of the corner of my eye - shadows moving, figures standing there - but when I look properly, there's nothing. Last week I could have sworn I heard someone calling my name when I was alone in my room. It's happened a few times now. My thoughts feel... strange. Like they're not quite my own sometimes, or like they're too loud in my head. I keep thinking people in my lectures are looking at me, talking about me. I know it sounds paranoid but it feels so real. And my body feels weird too - like my hands don't belong to me sometimes. I haven't told anyone because I don't want them to think I'm going crazy. My studies are suffering. I used to be top of my class."

Patient appears anxious, slightly guarded. Good grooming maintained. Speech coherent but with some tangential elements. Describes these experiences as distressing and ego-dystonic. No clear formed delusions or sustained hallucinations. Insight partially preserved - recognizes experiences are unusual. Family history of schizophrenia (uncle).`,
  },
  {
    title: "Ndebele: Professional - Kufungisisa",
    description: "Anxiety and somatic symptoms with cultural framing",
    narrative: `45-year-old teacher from Bulawayo. Bilingual narrative:

"Ndiri kufungisisa zvakawanda. Thinking too much about everything - work, family, money. Can't concentrate on teaching. Ingqondo yami ayimi kahle (my mind is not right). I lie awake every night worrying. Moyo unorwadza. Sometimes my heart beats so fast I think I'm dying. The chest pains are real. Been to hospital three times - they say it's nothing physical, but I know something is wrong with me."

Well-groomed appearance but fidgety, wringing hands. Speech rapid with scattered thoughts. Describes panic attacks as "heart attacks." Cultural belief in physical cause despite medical reassurance.`,
  },
];

export const DemoScenarios = ({ onLoadDemo }: DemoScenariosProps) => {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-clinical-green">Demo Scenarios</CardTitle>
        <CardDescription>
          Click to load example cases showcasing cultural understanding
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {demoScenarios.map((scenario, index) => (
          <Button
            key={index}
            variant="outline"
            className="w-full justify-start text-left h-auto py-3 hover:bg-clinical-green-light hover:border-clinical-green"
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