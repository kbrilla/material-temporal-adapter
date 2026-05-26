import { createEnvironmentInjector } from "@angular/core";
import { DateAdapter } from "@angular/material/core";
import { describe, expect, it } from "vitest";

import {
  PlainDateTimeAdapter,
  providePlainDateTimeAdapter,
} from "../../plain-datetime";
import { testInjectorProviders } from "../shared/test-providers";

describe("timepicker integration", () => {
  it("wires PlainDateTimeAdapter with setTime and time fields", () => {
    const injector = createEnvironmentInjector(
      testInjectorProviders(...providePlainDateTimeAdapter()),
      null,
    );
    const adapter = injector.runInContext(
      () => injector.get(DateAdapter) as PlainDateTimeAdapter,
    );
    const date = adapter.createDate(2024, 0, 15);
    const withTime = adapter.setTime(date, 14, 30, 0);

    expect(adapter).toBeInstanceOf(PlainDateTimeAdapter);
    expect(adapter.getHours(withTime)).toBe(14);
    expect(adapter.getMinutes(withTime)).toBe(30);
    expect(adapter.getSeconds(withTime)).toBe(0);
  });
});
