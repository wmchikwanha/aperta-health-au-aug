import type { SelfAssessStrings } from "./types";
import { prs } from "./prs";

// Hazaragi — closely related to Dari; shares most clinical phrasing.
// review: Hazaragi clinical phrasing awaiting community reviewer sign-off.
export const haz: Partial<SelfAssessStrings> = { ...prs };
