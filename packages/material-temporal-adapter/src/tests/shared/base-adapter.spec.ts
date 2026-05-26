import { Injectable } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { DateAdapter } from "@angular/material/core";
import { beforeEach, describe, expect, it } from "vitest";

import { BaseTemporalAdapter } from "../../shared/base-temporal-adapter";
import {
  createInvalidPlainDate,
  isTemporalInvalid,
} from "../../shared/invalid";

@Injectable()
class TestPlainDateAdapter extends BaseTemporalAdapter<Temporal.PlainDate> {
  constructor() {
    super({ calendar: "iso8601", overflow: "reject" });
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
    TestBed.configureTestingModule({ providers: [TestPlainDateAdapter] });
    adapter = TestBed.inject(TestPlainDateAdapter);
    adapter.setLocale("en-US");
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
});
