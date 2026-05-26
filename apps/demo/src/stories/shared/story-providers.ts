import {provideZoneChangeDetection} from '@angular/core';
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

/** Shared bootstrap providers required by Angular Material in Storybook. */
function storyBootstrapProviders(
  adapterProviders: ReturnType<typeof providePlainDateAdapter>,
  locale = 'en-US',
) {
  return [
    provideZoneChangeDetection({eventCoalescing: true}),
    provideAnimationsAsync(),
    ...adapterProviders,
    {provide: MAT_DATE_LOCALE, useValue: locale},
  ];
}

export function withPlainDateAdapter(options?: PlainDateOptions, locale = 'en-US') {
  return applicationConfig({
    providers: storyBootstrapProviders(providePlainDateAdapter(undefined, options), locale),
  });
}

export function withPlainDateTimeAdapter(options?: PlainDateTimeOptions, locale = 'en-US') {
  return applicationConfig({
    providers: storyBootstrapProviders(
      providePlainDateTimeAdapter(undefined, options),
      locale,
    ),
  });
}

export function withZonedDateTimeAdapter(options: ZonedDateTimeOptions, locale = 'en-US') {
  return applicationConfig({
    providers: storyBootstrapProviders(provideZonedDateTimeAdapter(options), locale),
  });
}
