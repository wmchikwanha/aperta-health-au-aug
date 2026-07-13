import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Heart, Shield, Zap, Eye, Activity, Globe, Compass, Accessibility, UserRound } from "lucide-react";

interface ScreeningToolSelectorProps {
  onSelectTool: (tool: string) => void;
  /** If provided, only these tool IDs will be shown */
  allowedTools?: string[];
}

type Tool = {
  id: string;
  name: string;
  description: string;
  detail: string;
  icon: any;
  color: string;
  group: "Core" | "Refugee & CALD" | "Older Adults";
};

const SCREENING_TOOLS: Tool[] = [
  { id: "GAD7",    name: "GAD-7",     description: "Generalized Anxiety Disorder", detail: "7 questions • 2-3 min",  icon: Heart,     color: "text-blue-500",   group: "Core" },
  { id: "PHQ9",    name: "PHQ-9",     description: "Depression Screening",         detail: "9 questions • 3-4 min",  icon: Brain,     color: "text-purple-500", group: "Core" },
  { id: "PCL5",    name: "PCL-5",     description: "PTSD Checklist",               detail: "20 questions • 5-7 min", icon: Shield,    color: "text-amber-500",  group: "Core" },
  { id: "MMSE",    name: "MMSE",      description: "Cognitive Assessment",         detail: "11 sections • 10 min",   icon: Zap,       color: "text-green-500",  group: "Core" },
  { id: "PSQ",     name: "PSQ",       description: "Psychosis Screening",          detail: "5 questions • 2 min",    icon: Eye,       color: "text-red-500",    group: "Core" },
  { id: "PRIMER5", name: "PRIME-R-5", description: "Prodromal Psychosis Risk",     detail: "5 questions • 2-3 min",  icon: Activity,  color: "text-orange-500", group: "Core" },
  { id: "RHS15",   name: "RHS-15",    description: "Refugee Health Screener",      detail: "14 items + thermometer", icon: Globe,     color: "text-teal-600",   group: "Refugee & CALD" },
  { id: "HTQ4",    name: "HTQ-IV",    description: "Harvard Trauma (Part IV)",     detail: "16 items • 5-7 min",     icon: Compass,   color: "text-rose-600",   group: "Refugee & CALD" },
  { id: "WHODAS2", name: "WHODAS 2.0",description: "Function & Disability (12-item)",detail: "12 items • 5 min",     icon: Accessibility, color: "text-sky-600", group: "Refugee & CALD" },
  { id: "GDS15",   name: "GDS-15",    description: "Geriatric Depression (short)", detail: "15 yes/no • 5 min",      icon: UserRound, color: "text-indigo-500", group: "Older Adults" },
];

const GROUP_ORDER: Tool["group"][] = ["Core", "Refugee & CALD", "Older Adults"];

export const ScreeningToolSelector = ({ onSelectTool, allowedTools }: ScreeningToolSelectorProps) => {
  const tools = allowedTools
    ? SCREENING_TOOLS.filter(t => allowedTools.includes(t.id))
    : SCREENING_TOOLS;

  return (
    <div className="space-y-6">
      {GROUP_ORDER.map(group => {
        const groupTools = tools.filter(t => t.group === group);
        if (groupTools.length === 0) return null;
        return (
          <div key={group} className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {group}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupTools.map(tool => {
                const Icon = tool.icon;
                return (
                  <Card
                    key={tool.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => onSelectTool(tool.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <Icon className={`h-6 w-6 ${tool.color}`} />
                        <div className="flex-1">
                          <CardTitle className="text-lg">{tool.name}</CardTitle>
                          <CardDescription className="mt-1.5">{tool.description}</CardDescription>
                          <p className="text-xs text-muted-foreground mt-2">{tool.detail}</p>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
