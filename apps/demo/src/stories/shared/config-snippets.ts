/**
 * Exact provider configurations shown in Storybook Docs.
 * Keep in sync with story decorators in *.stories.ts.
 */
export const CONFIG = {
  polyfill: `import 'temporal-polyfill/global';`,

  plainDateDefault: `import {providePlainDateAdapter} from '@kbrilla/material-temporal-adapter';

providers: [
  ...providePlainDateAdapter(),
],`,

  plainDateConstrain: `providers: [
  ...providePlainDateAdapter(undefined, {
    calendar: 'iso8601',
    overflow: 'constrain',
  }),
],`,

  plainDateJapanese: `providers: [
  ...providePlainDateAdapter(undefined, {
    calendar: 'japanese',
  }),
],`,

  plainDateOutputJapanese: `providers: [
  ...providePlainDateAdapter(undefined, {
    calendar: 'iso8601',
    outputCalendar: 'japanese',
  }),
],`,

  plainDateGregoryMonday: `providers: [
  ...providePlainDateAdapter(undefined, {
    calendar: 'gregory',
    firstDayOfWeek: 1,
  }),
],`,

  plainDateTimeDefault: `import {providePlainDateTimeAdapter} from '@kbrilla/material-temporal-adapter';

providers: [
  ...providePlainDateTimeAdapter(),
],`,

  plainDateTimeHebrew: `providers: [
  ...providePlainDateTimeAdapter(undefined, {
    calendar: 'hebrew',
  }),
],`,

  zonedUtc: `import {provideZonedDateTimeAdapter} from '@kbrilla/material-temporal-adapter';

providers: [
  ...provideZonedDateTimeAdapter({
    timezone: 'UTC',
    calendar: 'iso8601',
    overflow: 'reject',
  }),
],`,

  zonedNewYork: `providers: [
  ...provideZonedDateTimeAdapter({
    timezone: 'America/New_York',
    calendar: 'iso8601',
    overflow: 'reject',
  }),
],`,

  zonedDstReject: `providers: [
  ...provideZonedDateTimeAdapter({
    timezone: 'America/New_York',
    disambiguation: 'reject',
  }),
],`,

  zonedDstCompatible: `providers: [
  ...provideZonedDateTimeAdapter({
    timezone: 'America/New_York',
    disambiguation: 'compatible',
  }),
],`,

  zonedRounding: `providers: [
  ...provideZonedDateTimeAdapter({
    timezone: 'UTC',
    rounding: {smallestUnit: 'minute', roundingMode: 'halfExpand'},
  }),
],`,

  locale: `import {MAT_DATE_LOCALE} from '@angular/material/core';

providers: [
  ...providePlainDateAdapter(),
  {provide: MAT_DATE_LOCALE, useValue: 'en-US'},
],`,

  storybookDecorator: `import {applicationConfig} from '@storybook/angular';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import {provideZoneChangeDetection} from '@angular/core';
import {MAT_DATE_LOCALE} from '@angular/material/core';
import {providePlainDateAdapter} from '@kbrilla/material-temporal-adapter';

// Story decorator (see apps/demo/src/stories/shared/story-providers.ts)
export const withPlainDateAdapter = (options?) =>
  applicationConfig({
    providers: [
      provideZoneChangeDetection({eventCoalescing: true}),
      provideAnimationsAsync(),
      ...providePlainDateAdapter(undefined, options),
      {provide: MAT_DATE_LOCALE, useValue: 'en-US'},
    ],
  });`,

  invalidCheck: `import {isTemporalInvalid} from '@kbrilla/material-temporal-adapter';

if (control.value !== null && isTemporalInvalid(control.value)) {
  // Material invalid sentinel — not null
}`,
} as const;

/** Markdown block for Storybook docs panels. */
export function configBlock(title: string, code: string): string {
  return `**${title}**\n\n\`\`\`typescript\n${code}\n\`\`\``;
}

export function storyConfig(title: string, code: string): {description: {story: string}} {
  return {description: {story: configBlock(title, code)}};
}
