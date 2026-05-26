/**
 * @license
 * Copyright (c) Krzysztof Brilla
 * SPDX-License-Identifier: MIT
 */

import {Provider} from '@angular/core';
import {DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatDateFormats} from '@angular/material/core';

import {MAT_TEMPORAL_DATE_FORMATS} from '../formats/date-formats';
import {PlainDateAdapter} from './plain-date-adapter';
import {MAT_TEMPORAL_PLAIN_DATE_OPTIONS, TemporalPlainDateOptions} from './plain-date-options';

export function providePlainDateAdapter(
  formats: MatDateFormats = MAT_TEMPORAL_DATE_FORMATS,
  options?: TemporalPlainDateOptions,
): Provider[] {
  const resolvedOptions = options ?? {calendar: 'iso8601', overflow: 'reject'};

  return [
    {provide: MAT_DATE_FORMATS, useValue: formats},
    {provide: MAT_TEMPORAL_PLAIN_DATE_OPTIONS, useValue: resolvedOptions},
    {
      provide: DateAdapter,
      useFactory: (opts: TemporalPlainDateOptions, locale: string | null) =>
        new PlainDateAdapter(opts, locale),
      deps: [MAT_TEMPORAL_PLAIN_DATE_OPTIONS, MAT_DATE_LOCALE],
    },
  ];
}
