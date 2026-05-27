import { expect, it } from "vitest";

import {
  type CalendarId,
  createCalendarAdapter,
  describeCalendar,
} from "./_calendar-matrix";

const CALENDAR: CalendarId = "buddhist";

describeCalendar(CALENDAR, () => {
  it("today uses the configured calendar", () => {
    expect(createCalendarAdapter(CALENDAR).today().calendarId).toBe(CALENDAR);
  });

  it("createDate returns a PlainDate in the configured calendar", () => {
    const date = createCalendarAdapter(CALENDAR).createDate(2024, 0, 1);

    expect(date).toBeInstanceOf(Temporal.PlainDate);
    expect(date.calendarId).toBe(CALENDAR);
  });

  it("stores dates with the Buddhist calendar identifier", () => {
    const adapter = createCalendarAdapter(CALENDAR);
    const date = adapter.createDate(2024, 0, 1);

    expect(date.calendarId).toBe(CALENDAR);
    expect(adapter.toIso8601(date)).toContain("[u-ca=buddhist]");
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
});
