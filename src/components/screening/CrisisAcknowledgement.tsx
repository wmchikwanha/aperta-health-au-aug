import { AlertTriangle, PhoneCall } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CrisisAcknowledgementProps {
  title: string;
  message: string;
  crisisNumber: string;
  acknowledged: boolean;
  onAcknowledgedChange: (acknowledged: boolean) => void;
}

export function CrisisAcknowledgement({ title, message, crisisNumber, acknowledged, onAcknowledgedChange }: CrisisAcknowledgementProps) {
  return (
    <Alert variant="destructive" className="border-2" role="alert" aria-live="assertive">
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-4">
        <p>{message}</p>
        <div className="flex items-start gap-2 font-semibold">
          <PhoneCall className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Immediate danger: call 000. Crisis support: {crisisNumber}.</p>
        </div>
        <p>Do not leave the person unsupported. Open the crisis workflow and notify the supervising clinician.</p>
        <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-background p-3">
          <Checkbox id="crisis-acknowledgement" checked={acknowledged} onCheckedChange={value => onAcknowledgedChange(value === true)} />
          <Label htmlFor="crisis-acknowledgement" className="cursor-pointer leading-5">
            I acknowledge this alert and will follow the immediate safety pathway. This acknowledgement does not resolve the risk.
          </Label>
        </div>
      </AlertDescription>
    </Alert>
  );
}