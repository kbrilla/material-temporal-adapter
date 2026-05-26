/**
 * @license
 * Copyright (c) Krzysztof Brilla
 * SPDX-License-Identifier: MIT
 */

import {InjectionToken} from '@angular/core';

import type {TemporalBaseOptions} from '../shared/types';

export interface TemporalPlainDateOptions extends TemporalBaseOptions {}

export type PlainDateOptions = TemporalPlainDateOptions;

export const MAT_TEMPORAL_PLAIN_DATE_OPTIONS = new InjectionToken<TemporalPlainDateOptions>(
  'MAT_TEMPORAL_PLAIN_DATE_OPTIONS',
  {
    providedIn: 'root',
    factory: () => ({calendar: 'iso8601', overflow: 'reject'}),
  },
);
