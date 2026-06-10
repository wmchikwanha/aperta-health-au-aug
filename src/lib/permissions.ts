/**
 * Role-based permission helpers for graduated UI access.
 *
 * Hierarchy:
 *   admin (overall oversight)
 *     ├── psychiatrist (full clinical)
 *     ├── clinical_nurse (intermediate clinical)
 *     └── chw (restricted)
 */

export type AppRole = "admin" | "psychiatrist" | "clinical_nurse" | "chw" | "viewer" | string | null;

const CLINICAL_ROLES: string[] = ["psychiatrist", "admin", "clinical_nurse"];

const isClinical = (role: AppRole): boolean =>
  CLINICAL_ROLES.includes(role as string);

/** Can access diagnostic formulation, AI suggestions, treatment plans */
export const canAccessDiagnostics = (role: AppRole): boolean =>
  role === "psychiatrist" || role === "admin";

/** Can approve / finalise diagnostic formulations */
export const canApproveDiagnostics = (role: AppRole): boolean =>
  role === "psychiatrist" || role === "admin";

/** Can view (but not approve) diagnostics — nurses can view */
export const canViewDiagnostics = (role: AppRole): boolean =>
  role === "psychiatrist" || role === "admin" || role === "clinical_nurse";

/** Can trigger Process Narrative (MSE generation) */
export const canProcessNarrative = (role: AppRole): boolean => isClinical(role);

/** Can access full screening battery (GAD-7, PCL-5, MMSE, PSQ, PRIME-R-5) */
export const canAccessFullScreening = (role: AppRole): boolean => isClinical(role);

/** Can access analytics dashboard */
export const canAccessAnalytics = (role: AppRole): boolean =>
  role === "psychiatrist" || role === "admin";

/** Can view analytics (read-only) — nurses can view */
export const canViewAnalytics = (role: AppRole): boolean =>
  role === "psychiatrist" || role === "admin" || role === "clinical_nurse";

/** Can access crisis first aid protocols */
export const canAccessCrisisProtocols = (role: AppRole): boolean => isClinical(role);

/** Can use Ask AI assistant */
export const canAccessAskAI = (role: AppRole): boolean => isClinical(role);

/** Can refer patients upward to a clinician — all roles */
export const canReferUpward = (_role: AppRole): boolean => true;

/** Can receive CHW upward referrals */
export const canReceiveCHWReferrals = (role: AppRole): boolean => isClinical(role);

/** Can delete/amend any user's records — admin only */
export const canDeleteRecords = (role: AppRole): boolean => role === "admin";

/** Can monitor all users' work — admin only */
export const canMonitorAllUsers = (role: AppRole): boolean => role === "admin";

/** Is a CHW (Community Health Worker) */
export const isCHW = (role: AppRole): boolean => role === "chw";

/** Is a Clinical Nurse */
export const isClinicalNurse = (role: AppRole): boolean => role === "clinical_nurse";

/** Is an Administrator */
export const isAdmin = (role: AppRole): boolean => role === "admin";

/** Human-readable role label */
export const getRoleLabel = (role: AppRole): string => {
  switch (role) {
    case "admin": return "Administrator";
    case "psychiatrist": return "Psychiatrist";
    case "clinical_nurse": return "Clinical Nurse";
    case "chw": return "Community Health Worker";
    case "viewer": return "Viewer";
    default: return role || "Unknown";
  }
};
