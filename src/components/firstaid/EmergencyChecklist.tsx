import { useState } from 'react';
import { CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EmergencyChecklist as ChecklistType, ChecklistItem } from '@/lib/firstaid/crisisProtocols';

interface EmergencyChecklistProps {
  checklist: ChecklistType;
  completedItems: string[];
  onItemToggle: (itemId: string) => void;
}

export function EmergencyChecklist({
  checklist,
  completedItems,
  onItemToggle,
}: EmergencyChecklistProps) {
  const sortedItems = [...checklist.items].sort((a, b) => a.order - b.order);
  const completedCount = completedItems.length;
  const totalCount = checklist.items.length;
  const criticalItems = checklist.items.filter(i => i.critical);
  const criticalCompleted = criticalItems.filter(i => completedItems.includes(i.id)).length;
  const allCriticalDone = criticalCompleted === criticalItems.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{checklist.title}</CardTitle>
            <CardDescription>
              {completedCount} of {totalCount} items completed
            </CardDescription>
          </div>
          {!allCriticalDone && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Critical items pending
            </Badge>
          )}
          {allCriticalDone && completedCount === totalCount && (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              Complete
            </Badge>
          )}
        </div>
        <Progress value={progressPercent} className="h-2 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedItems.map((item) => {
            const isCompleted = completedItems.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => onItemToggle(item.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                  isCompleted
                    ? 'bg-green-50 border-green-200'
                    : item.critical
                    ? 'bg-red-50 border-red-200 hover:bg-red-100'
                    : 'bg-card border-border hover:bg-accent'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                ) : (
                  <Circle className={`h-5 w-5 shrink-0 ${item.critical ? 'text-red-400' : 'text-muted-foreground'}`} />
                )}
                <span className={`flex-1 text-sm ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                  {item.label}
                </span>
                {item.critical && !isCompleted && (
                  <Badge variant="destructive" className="text-xs">
                    Critical
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
