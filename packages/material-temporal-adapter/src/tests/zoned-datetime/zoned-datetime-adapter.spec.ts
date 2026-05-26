import {createEnvironmentInjector, NgZone} from '@angular/core';
import {DateAdapter, MAT_DATE_LOCALE} from '@angular/material/core';
import {describe, expect, it} from 'vitest';

import {MAT_TEMPORAL_ZONED_OPTIONS, ZonedDateTimeAdapter} from '../../zoned-datetime';

const MAR = 2;
const NOV = 10;
const NEW_YORK = 'America/New_York';

function createAdapter(options: Partial<Parameters<typeof provideOptions>[0]> = {}): ZonedDateTimeAdapter {
  const injector = createEnvironmentInjector(
    [
      {provide: NgZone, useFactory: () => new NgZone({enableLongStackTrace: false})},
      {provide: MAT_DATE_LOCALE, useValue: 'en-US'},
      {
        provide: MAT_TEMPORAL_ZONED_OPTIONS,
        useValue: provideOptions({timezone: NEW_YORK, ...options}),
      },
      {provide: DateAdapter, useClass: ZonedDateTimeAdapter},
    ],
    null,
  );
  return injector.runInContext(() => injector.get(DateAdapter) as ZonedDateTimeAdapter);
}

function provideOptions(options: {
  timezone: string;
  disambiguation?: 'compatible' | 'earlier' | 'later' | 'reject';
}) {
  return {calendar: 'iso8601', overflow: 'reject' as const, ...options};
}

describe('ZonedDateTimeAdapter', () => {
  it('should throw without a timezone option', () => {
    const injector = createEnvironmentInjector(
      [
        {provide: NgZone, useFactory: () => new NgZone({enableLongStackTrace: false})},
        {provide: MAT_TEMPORAL_ZONED_OPTIONS, useValue: {calendar: 'iso8601'}},
        {provide: DateAdapter, useClass: ZonedDateTimeAdapter},
      ],
      null,
    );

    expect(() => injector.runInContext(() => injector.get(DateAdapter))).toThrowError(/timezone/i);
  });

  it.each([
    ['compatible', '2024-03-10T03:30:00-04:00[America/New_York]'],
    ['earlier', '2024-03-10T01:30:00-05:00[America/New_York]'],
    ['later', '2024-03-10T03:30:00-04:00[America/New_York]'],
  ] as const)(
    'should resolve nonexistent DST times using %s disambiguation',
    (disambiguation, expected) => {
      const adapter = createAdapter({disambiguation});
      const transitionDate = adapter.createDate(2024, MAR, 10);

      expect(adapter.setTime(transitionDate, 2, 30, 0).toString()).toBe(expected);
    },
  );

  it('should reject nonexistent DST times when disambiguation is reject', () => {
    const adapter = createAdapter({disambiguation: 'reject'});
    const transitionDate = adapter.createDate(2024, MAR, 10);

    expect(() => adapter.setTime(transitionDate, 2, 30, 0)).toThrowError();
  });

  it.each([
    ['compatible', '2024-11-03T01:30:00-04:00[America/New_York]'],
    ['earlier', '2024-11-03T01:30:00-04:00[America/New_York]'],
    ['later', '2024-11-03T01:30:00-05:00[America/New_York]'],
  ] as const)(
    'should resolve repeated DST times using %s disambiguation',
    (disambiguation, expected) => {
      const adapter = createAdapter({disambiguation});
      const transitionDate = adapter.createDate(2024, NOV, 3);

      expect(adapter.setTime(transitionDate, 1, 30, 0).toString()).toBe(expected);
    },
  );

  it('should reject repeated DST times when disambiguation is reject', () => {
    const adapter = createAdapter({disambiguation: 'reject'});
    const transitionDate = adapter.createDate(2024, NOV, 3);

    expect(() => adapter.setTime(transitionDate, 1, 30, 0)).toThrowError();
  });
});
