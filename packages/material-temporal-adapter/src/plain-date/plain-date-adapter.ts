/**
 * @license
 * Copyright (c) Krzysztof Brilla
 * SPDX-License-Identifier: MIT
 */

import {Injectable} from '@angular/core';

import {BaseTemporalAdapter} from '../shared/base-temporal-adapter';
import {createInvalidPlainDate, isTemporalInvalid} from '../shared/invalid';
import {type PlainDateOptions} from './plain-date-options';

/**
 * DateAdapter implementation for {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate Temporal.PlainDate}.
 */
@Injectable()
export class PlainDateAdapter extends BaseTemporalAdapter<Temporal.PlainDate> {
  constructor(options: PlainDateOptions, locale: string | null) {
    super(options, locale);
  }

  clone(date: Temporal.PlainDate): Temporal.PlainDate {
    return Temporal.PlainDate.from(date.toString());
  }

  createDate(year: number, month: number, date: number): Temporal.PlainDate {
    if ((typeof ngDevMode === 'undefined' || ngDevMode) && this._overflow === 'reject') {
      const monthsInYear = this._getMonthsInYearForDate(year);
      if (month < 0 || month > monthsInYear - 1) {
        throw Error(
          `Invalid month index "${month}". Month index has to be between 0 and ${monthsInYear - 1}.`,
        );
      }
      if (date < 1) {
        throw Error(`Invalid date "${date}". Date has to be greater than 0.`);
      }
    }

    try {
      return Temporal.PlainDate.from(
        {
          year,
          month: month + 1,
          day: date,
          calendar: this._getCalendarId(),
        },
        {overflow: this._overflow},
      );
    } catch {
      if ((typeof ngDevMode === 'undefined' || ngDevMode) && this._overflow === 'reject') {
        throw Error(`Invalid date "${date}" for month with index "${month}".`);
      }
      return this.invalid();
    }
  }

  today(): Temporal.PlainDate {
    return Temporal.Now.plainDateISO().withCalendar(this._getCalendarId());
  }

  parse(value: unknown, _parseFormat?: unknown): Temporal.PlainDate | null {
    if (typeof value === 'number') {
      return this._createFromEpochMs(value);
    }
    if (typeof value === 'string') {
      return value ? (this._parseString(value) ?? this.invalid()) : null;
    }
    if (this.isDateInstance(value)) {
      return this.clone(value);
    }
    return value ? this.invalid() : null;
  }

  toIso8601(date: Temporal.PlainDate): string {
    return date.toString();
  }

  override deserialize(value: unknown): Temporal.PlainDate | null {
    if (typeof value === 'string') {
      if (!value) {
        return null;
      }
      const parsed = this._parseString(value);
      return parsed && this.isValid(parsed) ? parsed : this.invalid();
    }
    return super.deserialize(value);
  }

  isDateInstance(value: unknown): value is Temporal.PlainDate {
    return value instanceof Temporal.PlainDate || isTemporalInvalid(value);
  }

  isValid(date: Temporal.PlainDate): boolean {
    return !isTemporalInvalid(date) && date instanceof Temporal.PlainDate;
  }

  invalid(): Temporal.PlainDate {
    return createInvalidPlainDate(this._getCalendarId()) as unknown as Temporal.PlainDate;
  }

  override getHours(_date: Temporal.PlainDate): number {
    return 0;
  }

  override getMinutes(_date: Temporal.PlainDate): number {
    return 0;
  }

  override getSeconds(_date: Temporal.PlainDate): number {
    return 0;
  }

  override setTime(
    _target: Temporal.PlainDate,
    _hours: number,
    _minutes: number,
    _seconds: number,
  ): never {
    throw Error(
      'PlainDateAdapter cannot set time on Temporal.PlainDate. Use PlainDateTimeAdapter or ZonedDateTimeAdapter for date-time values.',
    );
  }

  override parseTime(_value: unknown, _parseFormat?: unknown): Temporal.PlainDate | null {
    return this.invalid();
  }

  override addSeconds(date: Temporal.PlainDate, _amount: number): Temporal.PlainDate {
    return date;
  }

  protected _parseString(value: string): Temporal.PlainDate | null {
    if (!value) {
      return null;
    }
    try {
      return Temporal.PlainDate.from(value).withCalendar(this._getCalendarId());
    } catch {
      return null;
    }
  }

  protected _createFromEpochMs(ms: number): Temporal.PlainDate {
    if (!Number.isFinite(ms) || ms > 8.64e15 || ms < -8.64e15) {
      return this.invalid();
    }
    try {
      const instant = Temporal.Instant.fromEpochMilliseconds(ms);
      const zonedDateTime = instant.toZonedDateTimeISO(Temporal.Now.timeZoneId());
      return Temporal.PlainDate.from({
        year: zonedDateTime.year,
        month: zonedDateTime.month,
        day: zonedDateTime.day,
        calendar: this._getCalendarId(),
      });
    } catch {
      return this.invalid();
    }
  }

  /** Gets the number of months in a specific year for the configured calendar. */
  private _getMonthsInYearForDate(year: number): number {
    try {
      const referenceDate = Temporal.PlainDate.from({
        year,
        month: 1,
        day: 1,
        calendar: this._getCalendarId(),
      });
      return referenceDate.monthsInYear;
    } catch {
      return 12;
    }
  }
}
