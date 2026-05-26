import { describe, it } from "vitest";

// Hijri calendar ids (generic "islamic" and variants) still differ across Temporal
// engines/polyfills; see docs/calendar-support.md and tc39/proposal-intl-era-monthcode#29.
describe.skip("islamic calendar", () => {
  it("is skipped until Hijri ids are stable across CI engines", () => {});
});
