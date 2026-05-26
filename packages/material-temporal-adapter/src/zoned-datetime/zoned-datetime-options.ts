/**
 * @license
 * Copyright (c) Krzysztof Brilla
 * SPDX-License-Identifier: MIT
 */

import {InjectionToken} from '@angular/core';

import type {
  TemporalBaseOptions,
  TemporalDisambiguation,
  TemporalOffsetOption,
  TemporalRoundingOptions,
} from '../shared/types';

/**
 * Options for {@link ZonedDateTimeAdapter} and `provideZonedDateTimeAdapter()`.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime MDN: Temporal.ZonedDateTime}
 */
export interface ZonedDateTimeOptions extends TemporalBaseOptions {
  /**
   * Required IANA time zone id (no system default).
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime/timeZoneId MDN: timeZoneId}
   */
  timezone: string;
  /** @see TemporalDisambiguation */
  disambiguation?: TemporalDisambiguation;
  /** @see TemporalOffsetOption */
  offset?: TemporalOffsetOption;
  /** Applied before `format()` and `toIso8601()`. @see TemporalRoundingOptions */
  rounding?: TemporalRoundingOptions;
}

export const MAT_TEMPORAL_ZONED_OPTIONS = new InjectionToken<ZonedDateTimeOptions>(
  'MAT_TEMPORAL_ZONED_OPTIONS',
);
