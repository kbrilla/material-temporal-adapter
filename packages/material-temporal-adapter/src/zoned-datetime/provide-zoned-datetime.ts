/**
 * @license
 * Copyright (c) Krzysztof Brilla
 * SPDX-License-Identifier: MIT
 */

import {Provider} from '@angular/core';
import {DateAdapter, MAT_DATE_FORMATS, MatDateFormats} from '@angular/material/core';

import {MAT_TEMPORAL_ZONED_FORMATS} from '../formats/zoned-formats';
import {ZonedDateTimeAdapter} from './zoned-datetime-adapter';
import {MAT_TEMPORAL_ZONED_OPTIONS, ZonedDateTimeOptions} from './zoned-datetime-options';

export function provideZonedDateTimeAdapter(
  options: ZonedDateTimeOptions,
  formats: MatDateFormats = MAT_TEMPORAL_ZONED_FORMATS,
): Provider[] {
  return [
    {provide: DateAdapter, useClass: ZonedDateTimeAdapter},
    {provide: MAT_DATE_FORMATS, useValue: formats},
    {provide: MAT_TEMPORAL_ZONED_OPTIONS, useValue: options},
  ];
}
