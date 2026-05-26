import {createEnvironmentInjector, NgZone} from '@angular/core';
import {DateAdapter, MAT_DATE_FORMATS} from '@angular/material/core';
import {describe, expect, it} from 'vitest';

import {MAT_TEMPORAL_ZONED_FORMATS} from '../../formats/zoned-formats';
import {
  MAT_TEMPORAL_ZONED_OPTIONS,
  provideZonedDateTimeAdapter,
  ZonedDateTimeAdapter,
} from '../../zoned-datetime';

describe('provideZonedDateTimeAdapter', () => {
  it('should provide ZonedDateTimeAdapter as DateAdapter', () => {
    const injector = createEnvironmentInjector(
      [
        {provide: NgZone, useFactory: () => new NgZone({enableLongStackTrace: false})},
        ...provideZonedDateTimeAdapter({timezone: 'UTC'}),
      ],
      null,
    );

    const adapter = injector.runInContext(() => injector.get(DateAdapter));

    expect(adapter).toBeInstanceOf(ZonedDateTimeAdapter);
    expect(adapter.createDate(2024, 0, 1).toString()).toBe('2024-01-01T00:00:00+00:00[UTC]');
  });

  it('should provide default zoned datetime formats', () => {
    const injector = createEnvironmentInjector(
      [
        {provide: NgZone, useFactory: () => new NgZone({enableLongStackTrace: false})},
        ...provideZonedDateTimeAdapter({timezone: 'UTC'}),
      ],
      null,
    );

    expect(injector.get(MAT_DATE_FORMATS)).toBe(MAT_TEMPORAL_ZONED_FORMATS);
  });

  it('should allow custom formats and options', () => {
    const customFormats = {
      ...MAT_TEMPORAL_ZONED_FORMATS,
      display: {
        ...MAT_TEMPORAL_ZONED_FORMATS.display,
        timeInput: {hour: 'numeric'},
      },
    };
    const injector = createEnvironmentInjector(
      [
        {provide: NgZone, useFactory: () => new NgZone({enableLongStackTrace: false})},
        ...provideZonedDateTimeAdapter(
          {
            timezone: 'America/New_York',
            calendar: 'iso8601',
            overflow: 'constrain',
          },
          customFormats,
        ),
      ],
      null,
    );

    expect(injector.get(MAT_DATE_FORMATS)).toBe(customFormats);
    expect(injector.get(MAT_TEMPORAL_ZONED_OPTIONS)).toEqual({
      timezone: 'America/New_York',
      calendar: 'iso8601',
      overflow: 'constrain',
    });
  });
});
