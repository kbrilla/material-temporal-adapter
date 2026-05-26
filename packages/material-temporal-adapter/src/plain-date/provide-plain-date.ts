/**
 * @license
 * Copyright (c) Krzysztof Brilla
 * SPDX-License-Identifier: MIT
 */

import {Provider} from '@angular/core';
import {DateAdapter, MAT_DATE_FORMATS, MatDateFormats} from '@angular/material/core';

import {MAT_TEMPORAL_DATE_FORMATS} from '../formats/date-formats';
import {PlainDateAdapter} from './plain-date-adapter';
import {MAT_TEMPORAL_PLAIN_DATE_OPTIONS, TemporalPlainDateOptions} from './plain-date-options';

export function providePlainDateAdapter(
  formats: MatDateFormats = MAT_TEMPORAL_DATE_FORMATS,
  options?: TemporalPlainDateOptions,
): Provider[] {
  return [
    {provide: DateAdapter, useClass: PlainDateAdapter},
    {provide: MAT_DATE_FORMATS, useValue: formats},
    {
      provide: MAT_TEMPORAL_PLAIN_DATE_OPTIONS,
      useValue: options ?? {calendar: 'iso8601', overflow: 'reject'},
    },
  ];
}
