import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

export interface ChecklistItemDef {
  id: string;
  label: string;
  description?: string;
}

export function OnboardingChecklist({
  facilityId,
  items,
  onProgress,
}: {
  facilityId: string;
  items: ChecklistItemDef[];
  onProgress?: (pct: number, checked: Record<string, boolean>) => void;
}) {
  const storageKey = `aperta_onboarding_${facilityId}`;
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setChecked(JSON.parse(raw));
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(checked));
    const done = items.filter((i) => checked[i.id]).length;
    onProgress?.(Math.round((done / items.length) * 100), checked);
  }, [checked, items, onProgress, storageKey]);

  const toggle = (id: string) => setChecked((c) => ({ ...c, [id]: !c[id] }));

  const completed = items.filter((i) => checked[i.id]).length;
  const pct = Math.round((completed / items.length) * 100);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">{completed} of {items.length} complete</span>
          <span className="font-medium">{pct}%</span>
        </div>
        <Progress value={pct} />
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/40"
          >
            <Checkbox checked={!!checked[item.id]} onCheckedChange={() => toggle(item.id)} />
            <div className="text-sm">
              <div className="font-medium">{item.label}</div>
              {item.description && <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
