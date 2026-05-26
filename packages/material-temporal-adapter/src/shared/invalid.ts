/**
 * @license
 * Copyright (c) Krzysztof Brilla
 * SPDX-License-Identifier: MIT
 */

import type {TemporalCalendarId} from './types';

interface TemporalInvalidSentinel {
  readonly _invalid: true;
  readonly calendarId: TemporalCalendarId;
}

export interface InvalidPlainDate extends TemporalInvalidSentinel {
  readonly year: number;
  readonly month: number;
  readonly monthCode: string;
  readonly day: number;
}

export interface InvalidPlainDateTime extends InvalidPlainDate {
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly millisecond: number;
  readonly microsecond: number;
  readonly nanosecond: number;
}

export interface InvalidZonedDateTime extends InvalidPlainDateTime {
  readonly epochNanoseconds: bigint;
  readonly timeZoneId: string;
}

const INVALID_DATE_FIELDS = {
  year: Number.NaN,
  month: Number.NaN,
  monthCode: 'MNaN',
  day: Number.NaN,
} as const;

const INVALID_TIME_FIELDS = {
  hour: Number.NaN,
  minute: Number.NaN,
  second: Number.NaN,
  millisecond: Number.NaN,
  microsecond: Number.NaN,
  nanosecond: Number.NaN,
} as const;

export function createInvalidPlainDate(calendarId: TemporalCalendarId): InvalidPlainDate {
  return {
    _invalid: true,
    calendarId,
    ...INVALID_DATE_FIELDS,
  };
}

export function createInvalidPlainDateTime(calendarId: TemporalCalendarId): InvalidPlainDateTime {
  return {
    ...createInvalidPlainDate(calendarId),
    ...INVALID_TIME_FIELDS,
  };
}

export function createInvalidZonedDateTime(
  calendarId: TemporalCalendarId,
  timeZoneId: string,
): InvalidZonedDateTime {
  return {
    ...createInvalidPlainDateTime(calendarId),
    epochNanoseconds: 0n,
    timeZoneId,
  };
}

export function isTemporalInvalid(value: unknown): value is TemporalInvalidSentinel {
  return typeof value === 'object' && value !== null && '_invalid' in value && value._invalid === true;
}
