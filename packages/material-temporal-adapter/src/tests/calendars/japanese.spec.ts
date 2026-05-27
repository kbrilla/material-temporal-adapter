import { expect, it } from "vitest";

import {
  type CalendarId,
  createCalendarAdapter,
  describeCalendar,
} from "./_calendar-matrix";

const CALENDAR: CalendarId = "japanese";

describeCalendar(CALENDAR, () => {
  it("today uses the configured calendar", () => {
    expect(createCalendarAdapter(CALENDAR).today().calendarId).toBe(CALENDAR);
  });

  it("createDate returns a PlainDate in the configured calendar", () => {
    const date = createCalendarAdapter(CALENDAR).createDate(2024, 0, 1);

    expect(date).toBeInstanceOf(Temporal.PlainDate);
    expect(date.calendarId).toBe(CALENDAR);
  });

  it("getYear reads calendar years", () => {
    const adapter = createCalendarAdapter(CALENDAR);

    expect(adapter.getYear(adapter.createDate(2024, 0, 1))).toBe(2024);
  });

  it("getMonthNames returns one name per calendar month", () => {
    const names = createCalendarAdapter(CALENDAR).getMonthNames("short");
    const reference = Temporal.PlainDate.from({
      year: 2017,
      month: 1,
      day: 1,
      calendar: CALENDAR,
    });

    expect(names).toHaveLength(reference.monthsInYear);
    expect(names.every((name) => name.length > 0)).toBe(true);
  });

  it("getNumDaysInMonth reads calendar month lengths", () => {
    const adapter = createCalendarAdapter(CALENDAR);
    const date = adapter.createDate(2024, 0, 1);

    expect(adapter.getNumDaysInMonth(date)).toBe(date.daysInMonth);
  });

  it("getYearName includes the Japanese era for Reiwa dates", () => {
    const adapter = createCalendarAdapter(CALENDAR);
    const reiwaDate = adapter.createDate(2019, 4, 1);
    const yearName = adapter.getYearName(reiwaDate);

    expect(yearName.length).toBeGreaterThan(0);
    expect(yearName).not.toBe(String(adapter.getYear(reiwaDate)));
  });

  it("serializes and deserializes dates across an era boundary", () => {
    const adapter = createCalendarAdapter(CALENDAR);
    const heiseiLastDay = adapter.createDate(2019, 3, 30);
    const reiwaFirstDay = adapter.createDate(2019, 4, 1);

    for (const date of [heiseiLastDay, reiwaFirstDay]) {
      const roundTripped = adapter.deserialize(adapter.toIso8601(date));
      expect(roundTripped).not.toBeNull();
      expect(adapter.sameDate(date, roundTripped!)).toBe(true);
    }
  });
});
