/**
 * @license
 * Copyright (c) Krzysztof Brilla
 * SPDX-License-Identifier: MIT
 */

import { inject } from "@angular/core";
import { DateAdapter, MAT_DATE_LOCALE } from "@angular/material/core";

import { ensureTemporalAvailable } from "./polyfill-check";
import { TemporalBaseOptions } from "./types";
import { getDefaultLocale, getLocaleFirstDayOfWeek } from "./utils";

type TemporalDateLike = Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime;

/**
 * Base class for Temporal adapters that share date-only calendar behavior.
 */
export abstract class BaseTemporalAdapter<
  T extends TemporalDateLike,
> extends DateAdapter<T> {
  protected readonly _calendar: string;
  protected readonly _outputCalendar: string | null;
  protected readonly _firstDayOfWeek?: number;
  protected readonly _overflow: "reject" | "constrain";

  protected constructor(options: TemporalBaseOptions) {
    super();
    ensureTemporalAvailable();
    this._calendar = options.calendar ?? "iso8601";
    this._outputCalendar = options.outputCalendar ?? null;
    this._firstDayOfWeek = options.firstDayOfWeek;
    this._overflow = options.overflow ?? "reject";
    super.setLocale(
      inject(MAT_DATE_LOCALE, { optional: true }) ?? getDefaultLocale(),
    );
  }

  getYear(date: T): number {
    return date.year;
  }

  getMonth(date: T): number {
    return date.month - 1;
  }

  getDate(date: T): number {
    return date.day;
  }

  getDayOfWeek(date: T): number {
    const dayOfWeek = date.dayOfWeek;
    return dayOfWeek === 7 ? 0 : dayOfWeek;
  }

  getMonthNames(style: "long" | "short" | "narrow"): string[] {
    const monthsInYear = this._getMonthsInYear();
    const options: Intl.DateTimeFormatOptions = {
      month: style,
      calendar: this._getOutputCalendarId(),
    };

    return Array.from({ length: monthsInYear }, (_, i) => {
      const date = Temporal.PlainDate.from({
        year: 2017,
        month: i + 1,
        day: 1,
        calendar: this._getOutputCalendarId(),
      });
      return this._formatWithLocale(date, options);
    });
  }

  getDateNames(): string[] {
    const options: Intl.DateTimeFormatOptions = {
      day: "numeric",
      calendar: this._getOutputCalendarId(),
    };

    return Array.from({ length: 31 }, (_, i) => {
      const date = Temporal.PlainDate.from({
        year: 2017,
        month: 1,
        day: i + 1,
        calendar: this._getOutputCalendarId(),
      });
      return this._formatWithLocale(date, options);
    });
  }

  getDayOfWeekNames(style: "long" | "short" | "narrow"): string[] {
    const options: Intl.DateTimeFormatOptions = {
      weekday: style,
    };

    return Array.from({ length: 7 }, (_, i) => {
      const date = Temporal.PlainDate.from({
        year: 2017,
        month: 1,
        day: i + 1,
        calendar: "iso8601",
      });
      return date
        .toLocaleString(this.locale, options)
        .replace(/[\u200e\u200f]/g, "");
    });
  }

  getYearName(date: T): string {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      calendar: this._getOutputCalendarId(),
    };
    return this._formatWithLocale(date, options);
  }

  getFirstDayOfWeek(): number {
    if (this._firstDayOfWeek !== undefined) {
      return this._firstDayOfWeek;
    }

    const firstDay = getLocaleFirstDayOfWeek(this.locale);
    return firstDay === 7 ? 0 : firstDay;
  }

  getNumDaysInMonth(date: T): number {
    return date.daysInMonth;
  }

  addCalendarYears(date: T, years: number): T {
    return date.add({ years }, { overflow: this._overflow }) as T;
  }

  addCalendarMonths(date: T, months: number): T {
    return date.add({ months }, { overflow: this._overflow }) as T;
  }

  addCalendarDays(date: T, days: number): T {
    return date.add({ days }, { overflow: this._overflow }) as T;
  }

  format(date: T, displayFormat: Intl.DateTimeFormatOptions): string {
    if (!this.isValid(date)) {
      throw Error("BaseTemporalAdapter: Cannot format invalid date.");
    }

    const options: Intl.DateTimeFormatOptions = {
      ...displayFormat,
      calendar: this._getOutputCalendarId(),
    };
    return this._formatWithLocale(date, options);
  }

  override deserialize(value: unknown): T | null {
    if (value == null || value === "") {
      return null;
    }
    if (this.isDateInstance(value)) {
      return this.clone(value);
    }
    if (typeof value === "number") {
      return this._createFromEpochMs(value);
    }
    return this.invalid();
  }

  protected _getCalendarId(): string {
    return this._calendar;
  }

  protected _getOutputCalendarId(): string {
    return this._outputCalendar || this._calendar;
  }

  protected _getMonthsInYear(): number {
    try {
      const referenceDate = Temporal.PlainDate.from({
        year: 2017,
        month: 1,
        day: 1,
        calendar: this._getOutputCalendarId(),
      });
      return referenceDate.monthsInYear;
    } catch {
      return 12;
    }
  }

  protected _formatWithLocale(
    date: TemporalDateLike,
    options: Intl.DateTimeFormatOptions,
  ): string {
    const outputCalendar = this._getOutputCalendarId();
    const dateForOutput = date.withCalendar(outputCalendar);
    return dateForOutput
      .toLocaleString(this.locale, options)
      .replace(/[\u200e\u200f]/g, "");
  }

  abstract override today(): T;
  abstract override createDate(year: number, month: number, date: number): T;
  abstract override clone(date: T): T;
  abstract override invalid(): T;
  abstract override isValid(date: T): boolean;
  abstract override isDateInstance(value: unknown): value is T;
  abstract override toIso8601(date: T): string;
  abstract override parse(value: unknown, parseFormat?: unknown): T | null;

  /** Parses an ISO 8601 string. Returns null if parsing fails. */
  protected abstract _parseString(value: string): T | null;

  /** Creates a date from epoch milliseconds. */
  protected abstract _createFromEpochMs(ms: number): T;
}
