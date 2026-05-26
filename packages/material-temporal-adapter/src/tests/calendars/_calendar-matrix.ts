import { createEnvironmentInjector, NgZone } from "@angular/core";
import { DateAdapter, MAT_DATE_LOCALE } from "@angular/material/core";
import { describe } from "vitest";

import { PlainDateAdapter, providePlainDateAdapter } from "../../plain-date";

export const CALENDARS = [
  "gregory",
  "japanese",
  "hebrew",
  "chinese",
  "persian",
  "buddhist",
  "indian",
  "ethiopic",
  "coptic",
] as const;

export type CalendarId = (typeof CALENDARS)[number];

export function supportsCalendar(id: string): boolean {
  try {
    Temporal.PlainDate.from({ year: 2024, month: 1, day: 1, calendar: id });
    return true;
  } catch {
    return false;
  }
}

export function describeCalendar(id: string, fn: () => void): void {
  (supportsCalendar(id) ? describe : describe.skip)(`calendar:${id}`, fn);
}

export function createCalendarAdapter(id: CalendarId): PlainDateAdapter {
  const injector = createEnvironmentInjector(
    [
      {
        provide: NgZone,
        useFactory: () => new NgZone({ enableLongStackTrace: false }),
      },
      { provide: MAT_DATE_LOCALE, useValue: "en-US" },
      ...providePlainDateAdapter(undefined, {
        calendar: id,
        overflow: "reject",
      }),
    ],
    null,
  );
  return injector.runInContext(
    () => injector.get(DateAdapter) as PlainDateAdapter,
  );
}
