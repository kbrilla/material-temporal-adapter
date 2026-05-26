/**
 * @license
 * Copyright (c) Krzysztof Brilla
 * SPDX-License-Identifier: MIT
 */

import {Provider} from '@angular/core';
import {DateAdapter, MAT_DATE_FORMATS, MatDateFormats} from '@angular/material/core';

import {MAT_TEMPORAL_DATETIME_FORMATS} from '../formats/datetime-formats';
import {PlainDateTimeAdapter} from './plain-datetime-adapter';
import {
  MAT_TEMPORAL_PLAIN_DATETIME_OPTIONS,
  TemporalPlainDateTimeOptions,
} from './plain-datetime-options';

export function providePlainDateTimeAdapter(
  formats: MatDateFormats = MAT_TEMPORAL_DATETIME_FORMATS,
  options?: TemporalPlainDateTimeOptions,
): Provider[] {
  return [
    {provide: DateAdapter, useClass: PlainDateTimeAdapter},
    {provide: MAT_DATE_FORMATS, useValue: formats},
    {
      provide: MAT_TEMPORAL_PLAIN_DATETIME_OPTIONS,
      useValue: options ?? {calendar: 'iso8601', overflow: 'reject'},
    },
  ];
}
