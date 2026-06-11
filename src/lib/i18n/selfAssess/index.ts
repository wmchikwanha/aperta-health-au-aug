import type { SelfAssessStrings } from "./types";
import { en } from "./en";
import { ar } from "./ar";
import { fa } from "./fa";
import { prs } from "./prs";
import { ps } from "./ps";
import { haz } from "./haz";
import { ur } from "./ur";
import { ti } from "./ti";
import { am } from "./am";
import { sw } from "./sw";
import { rn } from "./rn";
import { rw } from "./rw";
import { my } from "./my";
import { din } from "./din";
import { nus } from "./nus";
import { vi } from "./vi";
import { ta } from "./ta";
import { rhg } from "./rhg";

const BUNDLES: Record<string, Partial<SelfAssessStrings>> = {
  en, ar, fa, prs, ps, haz, ur, ti, am, sw, rn, rw, my, din, nus, vi, ta, rhg,
};

const RTL_CODES = new Set(["ar", "fa", "prs", "ps", "haz", "ur", "rhg"]);

/** Deep-merge an override bundle onto the English base so missing keys fall back. */
function merge<T>(base: T, override: any): T {
  if (override == null) return base;
  if (Array.isArray(base)) return (override ?? base) as any;
  if (typeof base !== "object") return (override ?? base) as any;
  const out: any = {};
  for (const k of Object.keys(base as any)) {
    out[k] = merge((base as any)[k], override?.[k]);
  }
  return out;
}

export function getStrings(code: string): SelfAssessStrings {
  const override = BUNDLES[code];
  if (!override || code === "en") return en;
  return merge(en, override);
}

export function isRTL(code: string): boolean {
  return RTL_CODES.has(code);
}

export function formatStepOf(template: string, step: number, total: number): string {
  return template.replace("{step}", String(step)).replace("{total}", String(total));
}
