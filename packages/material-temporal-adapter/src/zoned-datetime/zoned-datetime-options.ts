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

export interface ZonedDateTimeOptions extends TemporalBaseOptions {
  timezone: string;
  disambiguation?: TemporalDisambiguation;
  offset?: TemporalOffsetOption;
  rounding?: TemporalRoundingOptions;
}

export const MAT_TEMPORAL_ZONED_OPTIONS = new InjectionToken<ZonedDateTimeOptions>(
  'MAT_TEMPORAL_ZONED_OPTIONS',
);
