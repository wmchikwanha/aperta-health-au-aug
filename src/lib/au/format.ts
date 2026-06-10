/**
 * Australian date and identifier formatting helpers.
 */

/** Format a Date or ISO string as DD/MM/YYYY (AU convention). */
export function formatAUDate(input: Date | string | null | undefined): string {
  if (!input) return "";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Format as DD/MM/YYYY HH:MM (24h, AU convention). */
export function formatAUDateTime(input: Date | string | null | undefined): string {
  if (!input) return "";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const date = formatAUDate(d);
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${date} ${hh}:${mi}`;
}

/**
 * Validate an Individual Healthcare Identifier (IHI) — 16-digit Luhn check.
 * Used by Australia's My Health Record. We never resolve IHIs against the
 * HI Service from the client; this only validates the format/checksum.
 */
export function isValidIHI(value: string | null | undefined): boolean {
  if (!value) return false;
  const digits = value.replace(/\s+/g, "");
  if (!/^\d{16}$/.test(digits)) return false;
  // Luhn check
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits.charAt(i), 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/** Pretty-print an IHI as "XXXX XXXX XXXX XXXX". */
export function formatIHI(value: string | null | undefined): string {
  if (!value) return "";
  const d = value.replace(/\s+/g, "");
  if (d.length !== 16) return value;
  return `${d.slice(0,4)} ${d.slice(4,8)} ${d.slice(8,12)} ${d.slice(12,16)}`;
}
