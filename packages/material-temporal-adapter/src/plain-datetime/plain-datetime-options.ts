/**
 * @license
 * Copyright (c) Krzysztof Brilla
 * SPDX-License-Identifier: MIT
 */

import {InjectionToken} from '@angular/core';

import type {TemporalBaseOptions} from '../shared/types';

/** Options for {@link PlainDateTimeAdapter}. @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDateTime MDN: Temporal.PlainDateTime} */
export interface TemporalPlainDateTimeOptions extends TemporalBaseOptions {}

export type PlainDateTimeOptions = TemporalPlainDateTimeOptions;

export const MAT_TEMPORAL_PLAIN_DATETIME_OPTIONS =
  new InjectionToken<TemporalPlainDateTimeOptions>('MAT_TEMPORAL_PLAIN_DATETIME_OPTIONS', {
    providedIn: 'root',
    factory: () => ({calendar: 'iso8601', overflow: 'reject'}),
  });
