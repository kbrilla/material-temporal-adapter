import { createEnvironmentInjector, NgZone } from "@angular/core";
import { MAT_DATE_LOCALE } from "@angular/material/core";
import { beforeEach, describe, expect, it } from "vitest";

import { BaseTemporalAdapter } from "../../shared/base-temporal-adapter";
import {
  createInvalidPlainDate,
  isTemporalInvalid,
} from "../../shared/invalid";
import { TemporalBaseOptions } from "../../shared/types";

class TestPlainDateAdapter extends BaseTemporalAdapter<Temporal.PlainDate> {
  constructor(options: Partial<TemporalBaseOptions> = {}) {
    super({ calendar: "iso8601", overflow: "reject", ...options });
  }

  today() {
    return Temporal.Now.plainDateISO();
  }

  createDate(year: number, month: number, date: number) {
    return Temporal.PlainDate.from({ year, month: month + 1, day: date });
  }

  clone(date: Temporal.PlainDate) {
    return Temporal.PlainDate.from(date);
  }

  invalid() {
    return createInvalidPlainDate("iso8601");
  }

  isValid(date: Temporal.PlainDate) {
    return !isTemporalInvalid(date);
  }

  isDateInstance(value: unknown): value is Temporal.PlainDate {
    return value instanceof Temporal.PlainDate || isTemporalInvalid(value);
  }

  toIso8601(date: Temporal.PlainDate) {
    return date.toString();
  }

  deserialize(value: unknown) {
    return typeof value === "string" ? this._parseString(value) : null;
  }

  parse(value: unknown) {
    return typeof value === "string" ? this._parseString(value) : null;
  }

  protected _parseString(value: string) {
    try {
      return Temporal.PlainDate.from(value);
    } catch {
      return null;
    }
  }

  protected _createFromEpochMs(ms: number) {
    return Temporal.Instant.fromEpochMilliseconds(ms)
      .toZonedDateTimeISO("UTC")
      .toPlainDate();
  }
}

describe("BaseTemporalAdapter", () => {
  let adapter: TestPlainDateAdapter;

  beforeEach(() => {
    const injector = createEnvironmentInjector(
      [
        {
          provide: NgZone,
          useFactory: () => new NgZone({ enableLongStackTrace: false }),
        },
        { provide: MAT_DATE_LOCALE, useValue: "en-US" },
      ],
      null,
    );
    adapter = injector.runInContext(() => new TestPlainDateAdapter());
  });

  it("getMonth returns 0-indexed month", () => {
    expect(adapter.getMonth(Temporal.PlainDate.from("2024-03-15"))).toBe(2);
  });

  it("getDayOfWeekNames starts on Sunday for en-US", () => {
    const names = adapter.getDayOfWeekNames("short");
    expect(names).toHaveLength(7);
    expect(names[0].toLowerCase()).toMatch(/sun/);
  });

  it("getMonthNames returns 12 names using 2017 reference", () => {
    expect(adapter.getMonthNames("long")).toHaveLength(12);
  });

  it("getFirstDayOfWeek honors options.firstDayOfWeek", () => {
    const injector = createEnvironmentInjector(
      [
        {
          provide: NgZone,
          useFactory: () => new NgZone({ enableLongStackTrace: false }),
        },
        { provide: MAT_DATE_LOCALE, useValue: "en-US" },
      ],
      null,
    );
    const mondayFirstAdapter = injector.runInContext(
      () => new TestPlainDateAdapter({ firstDayOfWeek: 1 }),
    );

    expect(mondayFirstAdapter.getFirstDayOfWeek()).toBe(1);
  });

  it("getNumDaysInMonth returns 29 for February 2024", () => {
    expect(
      adapter.getNumDaysInMonth(Temporal.PlainDate.from("2024-02-01")),
    ).toBe(29);
  });

  it("format throws for invalid dates", () => {
    expect(() =>
      adapter.format(adapter.invalid(), { year: "numeric" }),
    ).toThrowError(/Cannot format invalid date/);
  });
});
