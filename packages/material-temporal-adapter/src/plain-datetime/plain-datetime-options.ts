/**
 * @license
 * Copyright (c) Krzysztof Brilla
 * SPDX-License-Identifier: MIT
 */

import {InjectionToken} from '@angular/core';

import type {TemporalBaseOptions} from '../shared/types';

export interface TemporalPlainDateTimeOptions extends TemporalBaseOptions {}

export const MAT_TEMPORAL_PLAIN_DATETIME_OPTIONS =
  new InjectionToken<TemporalPlainDateTimeOptions>('MAT_TEMPORAL_PLAIN_DATETIME_OPTIONS', {
    providedIn: 'root',
    factory: () => ({calendar: 'iso8601', overflow: 'reject'}),
  });
