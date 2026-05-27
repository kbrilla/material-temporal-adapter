/**
 * @license
 * Copyright (c) Krzysztof Brilla
 * SPDX-License-Identifier: MIT
 */

import {Provider} from '@angular/core';
import {DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatDateFormats} from '@angular/material/core';

import {MAT_TEMPORAL_DATETIME_FORMATS} from '../formats/datetime-formats';
import {PlainDateTimeAdapter} from './plain-datetime-adapter';
import {
  MAT_TEMPORAL_PLAIN_DATETIME_OPTIONS,
  PlainDateTimeOptions,
} from './plain-datetime-options';

export function providePlainDateTimeAdapter(
  formats: MatDateFormats = MAT_TEMPORAL_DATETIME_FORMATS,
  options?: PlainDateTimeOptions,
): Provider[] {
  const resolvedOptions = options ?? {calendar: 'iso8601', overflow: 'reject'};

  return [
    {provide: MAT_DATE_FORMATS, useValue: formats},
    {provide: MAT_TEMPORAL_PLAIN_DATETIME_OPTIONS, useValue: resolvedOptions},
    {
      provide: DateAdapter,
      useFactory: (opts: PlainDateTimeOptions, locale: string | null) =>
        new PlainDateTimeAdapter(opts, locale),
      deps: [MAT_TEMPORAL_PLAIN_DATETIME_OPTIONS, MAT_DATE_LOCALE],
    },
  ];
}
