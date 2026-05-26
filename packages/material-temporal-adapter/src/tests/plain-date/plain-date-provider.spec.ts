import {createEnvironmentInjector} from '@angular/core';
import {DateAdapter, MAT_DATE_FORMATS} from '@angular/material/core';
import {describe, expect, it} from 'vitest';

import {MAT_TEMPORAL_DATE_FORMATS} from '../../formats/date-formats';
import {
  MAT_TEMPORAL_PLAIN_DATE_OPTIONS,
  PlainDateAdapter,
  providePlainDateAdapter,
} from '../../plain-date';
import {testInjectorProviders} from '../shared/test-providers';

describe('providePlainDateAdapter', () => {
  it('should provide PlainDateAdapter as DateAdapter', () => {
    const injector = createEnvironmentInjector(testInjectorProviders(...providePlainDateAdapter()), null);

    const adapter = injector.runInContext(() => injector.get(DateAdapter));

    expect(adapter).toBeInstanceOf(PlainDateAdapter);
    expect(adapter.createDate(2024, 0, 1).toString()).toBe('2024-01-01');
  });

  it('should provide default date formats', () => {
    const injector = createEnvironmentInjector(testInjectorProviders(...providePlainDateAdapter()), null);

    expect(injector.get(MAT_DATE_FORMATS)).toBe(MAT_TEMPORAL_DATE_FORMATS);
  });

  it('should allow custom formats and options', () => {
    const customFormats = {
      ...MAT_TEMPORAL_DATE_FORMATS,
      display: {
        ...MAT_TEMPORAL_DATE_FORMATS.display,
        dateInput: {year: 'numeric'},
      },
    };
    const injector = createEnvironmentInjector(
      testInjectorProviders(...providePlainDateAdapter(customFormats, {calendar: 'iso8601', overflow: 'constrain'})),
      null,
    );

    expect(injector.get(MAT_DATE_FORMATS)).toBe(customFormats);
    expect(injector.get(MAT_TEMPORAL_PLAIN_DATE_OPTIONS)).toEqual({
      calendar: 'iso8601',
      overflow: 'constrain',
    });
  });
});
