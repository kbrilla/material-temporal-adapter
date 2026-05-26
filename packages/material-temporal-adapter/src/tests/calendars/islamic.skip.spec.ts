import { describe, it } from "vitest";

// The current Temporal polyfill reports inconsistent protocol results for islamic calendars.
describe.skip("islamic calendar", () => {
  it("is skipped until polyfill support is consistent", () => {});
});
