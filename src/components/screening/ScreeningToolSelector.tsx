import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Heart, Shield, Zap, Eye, Activity } from "lucide-react";

interface ScreeningToolSelectorProps {
  onSelectTool: (tool: string) => void;
  /** If provided, only these tool IDs will be shown */
  allowedTools?: string[];
}

const SCREENING_TOOLS = [
  {
    id: "GAD7",
    name: "GAD-7",
    description: "Generalized Anxiety Disorder",
    detail: "7 questions • 2-3 minutes",
    icon: Heart,
    color: "text-blue-500"
  },
  {
    id: "PHQ9",
    name: "PHQ-9",
    description: "Depression Screening",
    detail: "9 questions • 3-4 minutes",
    icon: Brain,
    color: "text-purple-500"
  },
  {
    id: "PCL5",
    name: "PCL-5",
    description: "PTSD Checklist",
    detail: "20 questions • 5-7 minutes",
    icon: Shield,
    color: "text-amber-500"
  },
  {
    id: "MMSE",
    name: "MMSE",
    description: "Cognitive Assessment",
    detail: "11 sections • 10 minutes",
    icon: Zap,
    color: "text-green-500"
  },
  {
    id: "PSQ",
    name: "PSQ",
    description: "Psychosis Screening",
    detail: "5 questions • 2 minutes",
    icon: Eye,
    color: "text-red-500"
  },
  {
    id: "PRIMER5",
    name: "PRIME-R-5",
    description: "Prodromal Psychosis Risk",
    detail: "5 questions • 2-3 minutes",
    icon: Activity,
    color: "text-orange-500"
  }
];

export const ScreeningToolSelector = ({ onSelectTool, allowedTools }: ScreeningToolSelectorProps) => {
  const tools = allowedTools
    ? SCREENING_TOOLS.filter(t => allowedTools.includes(t.id))
    : SCREENING_TOOLS;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tools.map((tool) => {
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
                  <CardDescription className="mt-1.5">
                    {tool.description}
                  </CardDescription>
                  <p className="text-xs text-muted-foreground mt-2">{tool.detail}</p>
                </div>
              </div>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
};
