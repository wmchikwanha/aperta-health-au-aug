import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export const PILOT_NOTICE = "PILOT DEMO — SYNTHETIC DATA ONLY — NOT FOR CLINICAL USE";

/**
 * Non-dismissible pilot notice shown on every screen.
 * Adds top padding to the document so it never covers page content.
 */
export const PilotBanner = () => {
  useEffect(() => {
    const previous = document.body.style.paddingTop;
    document.body.style.paddingTop = "28px";
    return () => {
      document.body.style.paddingTop = previous;
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[100] flex h-7 items-center justify-center gap-2 bg-destructive px-3 text-destructive-foreground"
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate text-[11px] font-semibold tracking-wide sm:text-xs">
        {PILOT_NOTICE}
      </span>
    </div>
  );
};

export default PilotBanner;
