import {createEnvironmentInjector} from '@angular/core';
import {DateAdapter, MAT_DATE_FORMATS} from '@angular/material/core';
import {describe, expect, it} from 'vitest';

import {MAT_TEMPORAL_DATETIME_FORMATS} from '../../formats/datetime-formats';
import {
  MAT_TEMPORAL_PLAIN_DATETIME_OPTIONS,
  PlainDateTimeAdapter,
  providePlainDateTimeAdapter,
} from '../../plain-datetime';
import {testInjectorProviders} from '../shared/test-providers';

describe('providePlainDateTimeAdapter', () => {
  it('should provide PlainDateTimeAdapter as DateAdapter', () => {
    const injector = createEnvironmentInjector(testInjectorProviders(...providePlainDateTimeAdapter()), null);

    const adapter = injector.runInContext(() => injector.get(DateAdapter));

    expect(adapter).toBeInstanceOf(PlainDateTimeAdapter);
    expect(adapter.createDate(2024, 0, 1).toString()).toBe('2024-01-01T00:00:00');
  });

  it('should provide default datetime formats', () => {
    const injector = createEnvironmentInjector(testInjectorProviders(...providePlainDateTimeAdapter()), null);

    expect(injector.get(MAT_DATE_FORMATS)).toBe(MAT_TEMPORAL_DATETIME_FORMATS);
  });

  it('should allow custom formats and options', () => {
    const customFormats = {
      ...MAT_TEMPORAL_DATETIME_FORMATS,
      display: {
        ...MAT_TEMPORAL_DATETIME_FORMATS.display,
        timeInput: {hour: 'numeric'},
      },
    };
    const injector = createEnvironmentInjector(
      testInjectorProviders(
        ...providePlainDateTimeAdapter(customFormats, {
          calendar: 'iso8601',
          overflow: 'constrain',
        }),
      ),
      null,
    );

    expect(injector.get(MAT_DATE_FORMATS)).toBe(customFormats);
    expect(injector.get(MAT_TEMPORAL_PLAIN_DATETIME_OPTIONS)).toEqual({
      calendar: 'iso8601',
      overflow: 'constrain',
    });
  });
});
