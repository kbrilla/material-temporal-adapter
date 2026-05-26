import {MAT_DATE_LOCALE} from '@angular/material/core';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import {applicationConfig} from '@storybook/angular';

import {
  providePlainDateAdapter,
  providePlainDateTimeAdapter,
  provideZonedDateTimeAdapter,
} from '@kbrilla/material-temporal-adapter';
import type {
  PlainDateOptions,
  PlainDateTimeOptions,
  ZonedDateTimeOptions,
} from '@kbrilla/material-temporal-adapter';

export function withPlainDateAdapter(options?: PlainDateOptions, locale = 'en-US') {
  return applicationConfig({
    providers: [
      provideAnimationsAsync(),
      providePlainDateAdapter(undefined, options),
      {provide: MAT_DATE_LOCALE, useValue: locale},
    ],
  });
}

export function withPlainDateTimeAdapter(options?: PlainDateTimeOptions, locale = 'en-US') {
  return applicationConfig({
    providers: [
      provideAnimationsAsync(),
      providePlainDateTimeAdapter(undefined, options),
      {provide: MAT_DATE_LOCALE, useValue: locale},
    ],
  });
}

export function withZonedDateTimeAdapter(options: ZonedDateTimeOptions, locale = 'en-US') {
  return applicationConfig({
    providers: [
      provideAnimationsAsync(),
      provideZonedDateTimeAdapter(options),
      {provide: MAT_DATE_LOCALE, useValue: locale},
    ],
  });
}
