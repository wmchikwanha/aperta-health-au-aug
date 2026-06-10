import { AlertCircle, Heart } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Aboriginal & Torres Strait Islander cultural-safety banner.
 *
 * Shown anywhere a patient is flagged as identifying as Aboriginal and/or
 * Torres Strait Islander. Replaces the default MSE framing with a Social and
 * Emotional Wellbeing (SEWB) prompt for the clinician, and surfaces 13YARN
 * as the first-line crisis pathway.
 *
 * The SEWB framework (Gee et al., Working Together 2014, 2nd ed.) frames
 * wellbeing across seven inter-related domains: connection to body, mind &
 * emotions, family & kinship, community, culture, country, and spirituality
 * & ancestors.
 */
export interface ATSISafetyFlagProps {
  /** True when the patient has identified as Aboriginal and/or Torres Strait Islander */
  identifies: boolean;
  /** Optional preferred terminology, e.g. "Aboriginal", "Torres Strait Islander", "Both" */
  identityLabel?: string;
  className?: string;
}

const SEWB_DOMAINS = [
  "Body",
  "Mind & emotions",
  "Family & kinship",
  "Community",
  "Culture",
  "Country",
  "Spirituality & ancestors",
];

export function ATSISafetyFlag({ identifies, identityLabel, className }: ATSISafetyFlagProps) {
  if (!identifies) return null;
  const who = identityLabel || "Aboriginal and/or Torres Strait Islander";
  return (
    <Alert className={className}>
      <Heart className="h-4 w-4 text-primary" aria-hidden />
      <AlertTitle className="flex items-center gap-2">
        Cultural safety — {who} patient
      </AlertTitle>
      <AlertDescription className="space-y-2 text-sm">
        <p>
          Frame this assessment within the <strong>Social and Emotional Wellbeing (SEWB)</strong>{" "}
          model rather than a deficit-focused MSE. Consider each domain alongside the patient and,
          where appropriate, family / kinship.
        </p>
        <ul className="list-disc pl-5 grid grid-cols-2 gap-x-4 gap-y-0.5">
          {SEWB_DOMAINS.map(d => (
            <li key={d}>{d}</li>
          ))}
        </ul>
        <p>
          Offer involvement of an <strong>Aboriginal Health Worker / Aboriginal Mental Health Worker</strong>{" "}
          and/or local Aboriginal Community Controlled Health Organisation (ACCHO). Avoid pathologising
          spiritual, kinship-grief, or community-loss narratives.
        </p>
        <p className="flex items-start gap-2 rounded-md bg-destructive/5 text-destructive p-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
          <span>
            <strong>Crisis pathway:</strong> 13YARN <a className="underline" href="tel:139276">13 92 76</a>{" "}
            (24/7, Aboriginal &amp; Torres Strait Islander crisis support). Life-threatening:{" "}
            <a className="underline" href="tel:000">000</a>.
          </span>
        </p>
      </AlertDescription>
    </Alert>
  );
}

export default ATSISafetyFlag;
