/**
 * @license
 * Copyright (c) Krzysztof Brilla
 * SPDX-License-Identifier: MIT
 */

/**
 * Invalid date sentinels for Angular Material `DateAdapter`.
 *
 * **Why these exist:** Material requires `invalid(): D` — a value that is not valid but still
 * `isDateInstance()` — parallel to `NativeDateAdapter`’s `new Date(NaN)`. Temporal has no
 * invalid `PlainDate` in the spec, so adapters use branded plain objects cast to `Temporal.*`.
 *
 * **Why not `null`:** `null` means *empty* (cleared field). Invalid user input is *non-empty*;
 * conflating the two breaks required-field validation and error styling while typing.
 *
 * **App code:** use {@link isTemporalInvalid} or `DateAdapter.isValid()`. Never persist sentinels.
 *
 * @see https://github.com/kbrilla/material-temporal-adapter/blob/main/docs/design-rationale.md#invalid-sentinels-the-ugly-objects
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

/** @internal Used by adapters — do not construct in application code. */
export function createInvalidPlainDate(calendarId: TemporalCalendarId): InvalidPlainDate {
  return {
    _invalid: true,
    calendarId,
    ...INVALID_DATE_FIELDS,
  };
}

/** @internal Used by adapters — do not construct in application code. */
export function createInvalidPlainDateTime(calendarId: TemporalCalendarId): InvalidPlainDateTime {
  return {
    ...createInvalidPlainDate(calendarId),
    ...INVALID_TIME_FIELDS,
  };
}

/** @internal Used by adapters — do not construct in application code. */
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

/**
 * Type guard for Material adapter invalid sentinels (not real `Temporal.*` instances).
 *
 * Returns `false` for `null` — empty controls are not invalid sentinels.
 */
export function isTemporalInvalid(value: unknown): value is TemporalInvalidSentinel {
  return typeof value === 'object' && value !== null && '_invalid' in value && value._invalid === true;
}
