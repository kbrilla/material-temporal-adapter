/**
 * @license
 * Copyright (c) Krzysztof Brilla
 * SPDX-License-Identifier: MIT
 */

export type TemporalCalendarId = string;
export type TemporalDisambiguation = 'compatible' | 'earlier' | 'later' | 'reject';
export type TemporalOffsetOption = 'use' | 'ignore' | 'reject' | 'prefer';
export type TemporalRoundingMode = 'ceil' | 'floor' | 'trunc' | 'halfExpand';
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

export interface TemporalRoundingOptions {
  smallestUnit: TemporalRoundingUnit;
  roundingIncrement?: number;
  roundingMode?: TemporalRoundingMode;
}

export interface TemporalBaseOptions {
  calendar?: TemporalCalendarId;
  outputCalendar?: TemporalCalendarId;
  firstDayOfWeek?: number;
  overflow?: 'reject' | 'constrain';
}
