/**
 * @license
 * Copyright (c) Krzysztof Brilla
 * SPDX-License-Identifier: MIT
 */

import {Provider} from '@angular/core';
import {DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatDateFormats} from '@angular/material/core';

import {MAT_TEMPORAL_ZONED_FORMATS} from '../formats/zoned-formats';
import {ZonedDateTimeAdapter} from './zoned-datetime-adapter';
import {MAT_TEMPORAL_ZONED_OPTIONS, ZonedDateTimeOptions} from './zoned-datetime-options';

export function provideZonedDateTimeAdapter(
  options: ZonedDateTimeOptions,
  formats: MatDateFormats = MAT_TEMPORAL_ZONED_FORMATS,
): Provider[] {
  return [
    {provide: MAT_DATE_FORMATS, useValue: formats},
    {provide: MAT_TEMPORAL_ZONED_OPTIONS, useValue: options},
    {
      provide: DateAdapter,
      useFactory: (opts: ZonedDateTimeOptions, locale: string | null) =>
        new ZonedDateTimeAdapter(opts, locale),
      deps: [MAT_TEMPORAL_ZONED_OPTIONS, MAT_DATE_LOCALE],
    },
  ];
}
