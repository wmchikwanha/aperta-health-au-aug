import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SafetyAlertProps {
  message: string;
}

export const SafetyAlert = ({ message }: SafetyAlertProps) => {
  return (
    <Alert variant="destructive" className="border-alert-red bg-alert-red-bg mb-6">
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle className="text-lg font-bold">🚨 RED ALERT - HIGH RISK DETECTED 🚨</AlertTitle>
      <AlertDescription className="text-base mt-2">
        {message}
        <div className="mt-3 font-semibold">
          IMMEDIATE ACTION REQUIRED: Clinical review and intervention needed.
        </div>
      </AlertDescription>
    </Alert>
  );
};