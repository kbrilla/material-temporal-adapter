/**
 * @license
 * Copyright (c) Krzysztof Brilla
 * SPDX-License-Identifier: MIT
 */

import {InjectionToken} from '@angular/core';

import type {TemporalBaseOptions} from '../shared/types';

/** Options for {@link PlainDateAdapter} and `providePlainDateAdapter()`. @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate MDN: Temporal.PlainDate} */
export interface TemporalPlainDateOptions extends TemporalBaseOptions {}

export type PlainDateOptions = TemporalPlainDateOptions;

export const MAT_TEMPORAL_PLAIN_DATE_OPTIONS = new InjectionToken<TemporalPlainDateOptions>(
  'MAT_TEMPORAL_PLAIN_DATE_OPTIONS',
  {
    providedIn: 'root',
    factory: () => ({calendar: 'iso8601', overflow: 'reject'}),
  },
);
