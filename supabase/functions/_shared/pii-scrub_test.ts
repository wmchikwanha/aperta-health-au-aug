import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { scrubPii } from "./pii-scrub.ts";
import { guardInput } from "./input-guard.ts";
Deno.test("AU mobile and +61 scrubbed", () => {
  const r = scrubPii("Call 0412 345 678 or +61 412 345 678");
  assertEquals(r.text, "Call [PHONE] or [PHONE]");
});
Deno.test("Medicare number scrubbed", () => { assertEquals(scrubPii("Medicare 2123 45670 1").text.includes("[MEDICARE]"), true); });
Deno.test("Afghan Tazkira and Sri Lankan NIC scrubbed", () => {
  const r = scrubPii("Tazkira 1400-0101-23456, NIC 851234567V");
  assert(!r.text.includes("1400") && !r.text.includes("851234567"));
  assert(r.types.includes("ID_NUMBER"));
});
Deno.test("Burmese NRC scrubbed", () => { assert(scrubPii("12/OUKAMA(N)123456").text.includes("[ID_NUMBER]")); });
Deno.test("email, address, suburb, DOB scrubbed", () => {
  const r = scrubPii("Lives at 12 Smith Street, Fairfield NSW 2165, email a.b@x.com, DOB: 01/02/1990");
  for (const t of ["[ADDRESS]", "[EMAIL]", "[DATE]"]) assert(r.text.includes(t), t);
});
Deno.test("clinical content kept", () => {
  const r = scrubPii("Patient born in Kabul reports low mood for 3 weeks, PHQ-9 score 14.");
  assertEquals(r.count, 0);
});
Deno.test("guardInput scrubs before AI", () => { assertEquals(guardInput("my name is Ahmad Karimi").pii.types, ["PERSON"]); });
