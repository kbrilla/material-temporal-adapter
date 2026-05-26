/**
 * @license
 * Copyright (c) Krzysztof Brilla
 * SPDX-License-Identifier: MIT
 */

/** IANA calendar identifier forwarded to Temporal. @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat#calendar Intl.DateTimeFormat calendar} */
export type TemporalCalendarId = string;

/**
 * DST gap/overlap disambiguation for `Temporal.ZonedDateTime.from()`.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime/from#disambiguation MDN: ZonedDateTime.from disambiguation}
 */
export type TemporalDisambiguation = 'compatible' | 'earlier' | 'later' | 'reject';

/**
 * Offset handling when parsing zoned date-times.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime/from#offset MDN: ZonedDateTime.from offset}
 */
export type TemporalOffsetOption = 'use' | 'ignore' | 'reject' | 'prefer';

/**
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/Duration/round#roundingmode MDN: roundingMode}
 */
export type TemporalRoundingMode = 'ceil' | 'floor' | 'trunc' | 'halfExpand';

/** Unit passed to `Temporal.ZonedDateTime.round()`. @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime/round MDN: ZonedDateTime.round} */
export type TemporalRoundingUnit =
  | 'day'
  | 'hour'
  | 'minute'
  | 'second'
  | 'millisecond'
  | 'microsecond'
  | 'nanosecond'
  | 'days'
  | 'hours'
  | 'minutes'
  | 'seconds'
  | 'milliseconds'
  | 'microseconds'
  | 'nanoseconds';

/** Options for zoned rounding before format/ISO output. @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime/round MDN: ZonedDateTime.round} */
export interface TemporalRoundingOptions {
  smallestUnit: TemporalRoundingUnit;
  roundingIncrement?: number;
  roundingMode?: TemporalRoundingMode;
}

/**
 * Shared adapter options mapped to Temporal calendar and arithmetic behavior.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate/from MDN: PlainDate.from}
 */
export interface TemporalBaseOptions {
  /**
   * Storage calendar id (`today()`, `createDate()`, parsing).
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate/withCalendar MDN: withCalendar}
   */
  calendar?: TemporalCalendarId;
  /**
   * Display calendar; formatting calls `date.withCalendar(outputCalendar)` first.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate/withCalendar MDN: withCalendar}
   */
  outputCalendar?: TemporalCalendarId;
  /** First day of week for the datepicker (0 = Sunday). Material convention. */
  firstDayOfWeek?: number;
  /**
   * Out-of-range calendar arithmetic: reject or constrain.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate/from#overflow MDN: overflow}
   */
  overflow?: 'reject' | 'constrain';
}
