import {type ApplicationConfig, type Provider, provideZoneChangeDetection} from '@angular/core';
import {DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE} from '@angular/material/core';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import {applicationConfig, moduleMetadata} from '@storybook/angular';

import {
  MAT_TEMPORAL_DATE_FORMATS,
  MAT_TEMPORAL_DATETIME_FORMATS,
  MAT_TEMPORAL_PLAIN_DATE_OPTIONS,
  MAT_TEMPORAL_PLAIN_DATETIME_OPTIONS,
  MAT_TEMPORAL_ZONED_OPTIONS,
  MAT_TEMPORAL_ZONED_FORMATS,
  PlainDateAdapter,
  PlainDateTimeAdapter,
  ZonedDateTimeAdapter,
} from '@kbrilla/material-temporal-adapter';
import type {
  PlainDateOptions,
  PlainDateTimeOptions,
  ZonedDateTimeOptions,
} from '@kbrilla/material-temporal-adapter';

/**
 * Storybook-only adapter providers. Import `DateAdapter` from the demo app's
 * `@angular/material/core` so the DI token matches Storybook's Material bundle.
 * The package's `provide*Adapter()` helpers are for application bootstrap.
 */
function plainDateAdapterProviders(options?: PlainDateOptions, locale = 'en-US'): Provider[] {
  const resolvedOptions = options ?? {calendar: 'iso8601', overflow: 'reject'};

  return [
    {provide: MAT_DATE_FORMATS, useValue: MAT_TEMPORAL_DATE_FORMATS},
    {provide: MAT_TEMPORAL_PLAIN_DATE_OPTIONS, useValue: resolvedOptions},
    {provide: MAT_DATE_LOCALE, useValue: locale},
    {
      provide: DateAdapter,
      useFactory: (opts: PlainDateOptions, resolvedLocale: string) =>
        new PlainDateAdapter(opts, resolvedLocale),
      deps: [MAT_TEMPORAL_PLAIN_DATE_OPTIONS, MAT_DATE_LOCALE],
    },
  ];
}

function plainDateTimeAdapterProviders(options?: PlainDateTimeOptions, locale = 'en-US'): Provider[] {
  const resolvedOptions = options ?? {calendar: 'iso8601', overflow: 'reject'};

  return [
    {provide: MAT_DATE_FORMATS, useValue: MAT_TEMPORAL_DATETIME_FORMATS},
    {provide: MAT_TEMPORAL_PLAIN_DATETIME_OPTIONS, useValue: resolvedOptions},
    {provide: MAT_DATE_LOCALE, useValue: locale},
    {
      provide: DateAdapter,
      useFactory: (opts: PlainDateTimeOptions, resolvedLocale: string) =>
        new PlainDateTimeAdapter(opts, resolvedLocale),
      deps: [MAT_TEMPORAL_PLAIN_DATETIME_OPTIONS, MAT_DATE_LOCALE],
    },
  ];
}

function zonedDateTimeAdapterProviders(options: ZonedDateTimeOptions, locale = 'en-US'): Provider[] {
  return [
    {provide: MAT_DATE_FORMATS, useValue: MAT_TEMPORAL_ZONED_FORMATS},
    {provide: MAT_TEMPORAL_ZONED_OPTIONS, useValue: options},
    {provide: MAT_DATE_LOCALE, useValue: locale},
    {
      provide: DateAdapter,
      useFactory: (opts: ZonedDateTimeOptions, resolvedLocale: string) =>
        new ZonedDateTimeAdapter(opts, resolvedLocale),
      deps: [MAT_TEMPORAL_ZONED_OPTIONS, MAT_DATE_LOCALE],
    },
  ];
}

/** Shared bootstrap providers required by Angular Material in Storybook. */
function storyBootstrapProviders(adapterProviders: Provider[]): NonNullable<ApplicationConfig['providers']> {
  return [provideZoneChangeDetection({eventCoalescing: true}), provideAnimationsAsync(), ...adapterProviders];
}

function withAdapterProviders(adapterProviders: Provider[]) {
  const applicationProviders = storyBootstrapProviders(adapterProviders);
  const appDecorator = applicationConfig({providers: applicationProviders});
  const moduleDecorator = moduleMetadata({providers: adapterProviders});

  return (storyFn: Parameters<typeof appDecorator>[0], context: Parameters<typeof appDecorator>[1]) =>
    moduleDecorator(() => appDecorator(storyFn, context), context);
}

export function withPlainDateAdapter(options?: PlainDateOptions, locale = 'en-US') {
  return withAdapterProviders(plainDateAdapterProviders(options, locale));
}

export function withPlainDateTimeAdapter(options?: PlainDateTimeOptions, locale = 'en-US') {
  return withAdapterProviders(plainDateTimeAdapterProviders(options, locale));
}

export function withZonedDateTimeAdapter(options: ZonedDateTimeOptions, locale = 'en-US') {
  return withAdapterProviders(zonedDateTimeAdapterProviders(options, locale));
}

/** Default PlainDate providers for preview.ts */
export function previewPlainDateAdapterProviders(locale = 'en-US'): Provider[] {
  return plainDateAdapterProviders(undefined, locale);
}
