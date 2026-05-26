/**
 * @license
 * Copyright (c) Krzysztof Brilla
 * SPDX-License-Identifier: MIT
 */

import {Inject, Injectable, Optional} from '@angular/core';
import {MAT_DATE_LOCALE} from '@angular/material/core';

import {BaseTemporalAdapter} from '../shared/base-temporal-adapter';
import {createInvalidZonedDateTime, isTemporalInvalid} from '../shared/invalid';
import type {TemporalDisambiguation, TemporalOffsetOption, TemporalRoundingOptions} from '../shared/types';
import {MAT_TEMPORAL_ZONED_OPTIONS, type ZonedDateTimeOptions} from './zoned-datetime-options';

interface ZonedFromOptions {
  overflow?: 'reject' | 'constrain';
  disambiguation?: TemporalDisambiguation;
  offset?: TemporalOffsetOption;
}

/**
 * DateAdapter implementation for {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime Temporal.ZonedDateTime}.
 * Requires explicit `timezone` in provider options ({@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime/timeZoneId timeZoneId}).
 */
@Injectable()
export class ZonedDateTimeAdapter extends BaseTemporalAdapter<Temporal.ZonedDateTime> {
  private readonly _timezone: string;
  private readonly _disambiguation?: TemporalDisambiguation;
  private readonly _offset?: TemporalOffsetOption;
  private readonly _rounding?: TemporalRoundingOptions;

  constructor(
    @Optional() @Inject(MAT_TEMPORAL_ZONED_OPTIONS) options: ZonedDateTimeOptions | null,
    @Optional() @Inject(MAT_DATE_LOCALE) locale: string | null,
  ) {
    super(options ?? {}, locale);

    if (!options?.timezone) {
      throw Error('ZonedDateTimeAdapter requires MAT_TEMPORAL_ZONED_OPTIONS.timezone.');
    }

    this._timezone = options.timezone;
    this._disambiguation = options.disambiguation;
    this._offset = options.offset;
    this._rounding = options.rounding;
  }

  clone(date: Temporal.ZonedDateTime): Temporal.ZonedDateTime {
    return Temporal.ZonedDateTime.from(this._assertZoned(date).toString());
  }

  createDate(year: number, month: number, date: number): Temporal.ZonedDateTime {
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
      const plainDate = Temporal.PlainDate.from(
        {
          year,
          month: month + 1,
          day: date,
          calendar: this._getCalendarId(),
        },
        {overflow: this._overflow},
      );
      return this._toZonedFromPlainDateTime(
        plainDate.toPlainDateTime({hour: 0, minute: 0, second: 0}),
      );
    } catch {
      if ((typeof ngDevMode === 'undefined' || ngDevMode) && this._overflow === 'reject') {
        throw Error(`Invalid date "${date}" for month with index "${month}".`);
      }
      return this.invalid();
    }
  }

  today(): Temporal.ZonedDateTime {
    return Temporal.Now.zonedDateTimeISO(this._timezone).withCalendar(this._getCalendarId());
  }

  parse(value: unknown, _parseFormat?: unknown): Temporal.ZonedDateTime | null {
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

  override format(date: Temporal.ZonedDateTime, displayFormat: Intl.DateTimeFormatOptions): string {
    if (!this.isValid(date)) {
      throw Error('ZonedDateTimeAdapter: Cannot format invalid date.');
    }

    const options: Intl.DateTimeFormatOptions = {
      ...displayFormat,
      calendar: this._getOutputCalendarId(),
    };
    return this._formatWithLocale(this._maybeRoundZoned(this._assertZoned(date)), options);
  }

  toIso8601(date: Temporal.ZonedDateTime): string {
    return this._maybeRoundZoned(this._assertZoned(date)).toString();
  }

  override deserialize(value: unknown): Temporal.ZonedDateTime | null {
    if (typeof value === 'string') {
      if (!value) {
        return null;
      }
      const parsed = this._parseString(value);
      return parsed && this.isValid(parsed) ? parsed : this.invalid();
    }
    return super.deserialize(value);
  }

  isDateInstance(value: unknown): value is Temporal.ZonedDateTime {
    return value instanceof Temporal.ZonedDateTime || isTemporalInvalid(value);
  }

  isValid(date: Temporal.ZonedDateTime): boolean {
    return !isTemporalInvalid(date) && date instanceof Temporal.ZonedDateTime;
  }

  invalid(): Temporal.ZonedDateTime {
    return createInvalidZonedDateTime(
      this._getCalendarId(),
      this._timezone,
    ) as unknown as Temporal.ZonedDateTime;
  }

  override getHours(date: Temporal.ZonedDateTime): number {
    return date.hour;
  }

  override getMinutes(date: Temporal.ZonedDateTime): number {
    return date.minute;
  }

  override getSeconds(date: Temporal.ZonedDateTime): number {
    return date.second;
  }

  override setTime(
    target: Temporal.ZonedDateTime,
    hours: number,
    minutes: number,
    seconds: number,
  ): Temporal.ZonedDateTime {
    if (!Number.isFinite(hours) || hours < 0 || hours > 23) {
      if (typeof ngDevMode === 'undefined' || ngDevMode) {
        throw Error(`Invalid hours "${hours}". Hours value must be a finite number between 0 and 23.`);
      }
      return this.invalid();
    }
    if (!Number.isFinite(minutes) || minutes < 0 || minutes > 59) {
      if (typeof ngDevMode === 'undefined' || ngDevMode) {
        throw Error(
          `Invalid minutes "${minutes}". Minutes value must be a finite number between 0 and 59.`,
        );
      }
      return this.invalid();
    }
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 59) {
      if (typeof ngDevMode === 'undefined' || ngDevMode) {
        throw Error(
          `Invalid seconds "${seconds}". Seconds value must be a finite number between 0 and 59.`,
        );
      }
      return this.invalid();
    }

    const date = this._assertZoned(target);
    return Temporal.ZonedDateTime.from(
      {
        year: date.year,
        month: date.month,
        day: date.day,
        hour: hours,
        minute: minutes,
        second: seconds,
        millisecond: 0,
        timeZone: date.timeZoneId,
        calendar: this._getCalendarId(),
      },
      this._getZonedFromOptions(),
    );
  }

  override parseTime(value: unknown, parseFormat?: unknown): Temporal.ZonedDateTime | null {
    if (value == null || value === '') {
      return null;
    }

    if (typeof value === 'string') {
      if (value.trim() === '' || value.length > 32) {
        return this.invalid();
      }

      const timeMatch = value
        .toUpperCase()
        .match(/^(\d?\d)[:.](\d?\d)(?:[:.](\d?\d))?\s*(AM|PM)?$/i);

      if (timeMatch) {
        let hours = Number.parseInt(timeMatch[1], 10);
        const minutes = Number.parseInt(timeMatch[2], 10);
        const seconds = timeMatch[3] ? Number.parseInt(timeMatch[3], 10) : 0;
        const amPm = timeMatch[4] as 'AM' | 'PM' | undefined;

        if (hours === 12) {
          hours = amPm === 'AM' ? 0 : hours;
        } else if (amPm === 'PM') {
          hours += 12;
        }

        if (
          hours >= 0 &&
          hours <= 23 &&
          minutes >= 0 &&
          minutes <= 59 &&
          seconds >= 0 &&
          seconds <= 59
        ) {
          return this.setTime(this.today(), hours, minutes, seconds);
        }
      }

      try {
        const time = Temporal.PlainTime.from(value);
        return this.setTime(this.today(), time.hour, time.minute, time.second);
      } catch {
        return this.invalid();
      }
    }

    return this.parse(value, parseFormat);
  }

  override addSeconds(date: Temporal.ZonedDateTime, amount: number): Temporal.ZonedDateTime {
    return date.add({seconds: amount});
  }

  protected _parseString(value: string): Temporal.ZonedDateTime | null {
    if (!value) {
      return null;
    }
    try {
      try {
        return Temporal.ZonedDateTime.from(value, this._getZonedFromOptions()).withCalendar(
          this._getCalendarId(),
        );
      } catch {
        if (value.includes('[')) {
          return null;
        }
        const plainDate = Temporal.PlainDate.from(value);
        return this._toZonedFromPlainDateTime(
          plainDate.toPlainDateTime({hour: 0, minute: 0, second: 0}),
        ).withCalendar(this._getCalendarId());
      }
    } catch {
      return null;
    }
  }

  protected _createFromEpochMs(ms: number): Temporal.ZonedDateTime {
    if (!Number.isFinite(ms) || ms > 8.64e15 || ms < -8.64e15) {
      return this.invalid();
    }

    try {
      const instant = Temporal.Instant.fromEpochMilliseconds(ms);
      return instant.toZonedDateTimeISO(this._timezone).withCalendar(this._getCalendarId());
    } catch {
      return this.invalid();
    }
  }

  private _getZonedFromOptions(): ZonedFromOptions {
    return {
      overflow: this._overflow,
      disambiguation: this._disambiguation,
      offset: this._offset,
    };
  }

  private _getDisambiguationOption(): {disambiguation?: TemporalDisambiguation} | undefined {
    return this._disambiguation ? {disambiguation: this._disambiguation} : undefined;
  }

  private _maybeRoundZoned(date: Temporal.ZonedDateTime): Temporal.ZonedDateTime {
    return this._rounding ? date.round(this._rounding) : date;
  }

  private _toZonedFromPlainDateTime(date: Temporal.PlainDateTime): Temporal.ZonedDateTime {
    return date.toZonedDateTime(this._timezone, this._getDisambiguationOption());
  }

  /**
   * Asserts that the value is a real `Temporal.ZonedDateTime` rather than the invalid sentinel.
   */
  private _assertZoned(date: Temporal.ZonedDateTime): Temporal.ZonedDateTime {
    if (!this.isValid(date)) {
      throw Error('ZonedDateTimeAdapter: Expected a valid Temporal.ZonedDateTime.');
    }
    return date;
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
