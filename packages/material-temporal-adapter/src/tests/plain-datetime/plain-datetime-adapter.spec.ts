import {createEnvironmentInjector, NgZone} from '@angular/core';
import {DateAdapter, MAT_DATE_LOCALE} from '@angular/material/core';
import {beforeEach, describe, expect, it} from 'vitest';

import {PlainDateTimeAdapter, MAT_TEMPORAL_PLAIN_DATETIME_OPTIONS} from '../../plain-datetime';

const JAN = 0;

function createAdapter(options = {}): PlainDateTimeAdapter {
  const injector = createEnvironmentInjector(
    [
      {provide: NgZone, useFactory: () => new NgZone({enableLongStackTrace: false})},
      {provide: MAT_DATE_LOCALE, useValue: 'en-US'},
      {
        provide: MAT_TEMPORAL_PLAIN_DATETIME_OPTIONS,
        useValue: {calendar: 'iso8601', overflow: 'reject', ...options},
      },
      {provide: DateAdapter, useClass: PlainDateTimeAdapter},
    ],
    null,
  );
  return injector.runInContext(() => injector.get(DateAdapter) as PlainDateTimeAdapter);
}

function isPlainDateTime(value: unknown): value is Temporal.PlainDateTime {
  return value instanceof Temporal.PlainDateTime;
}

describe('PlainDateTimeAdapter', () => {
  let adapter: PlainDateTimeAdapter;

  beforeEach(() => {
    adapter = createAdapter();
  });

  it('should create PlainDateTime instances', () => {
    const date = adapter.createDate(2024, JAN, 15);

    expect(isPlainDateTime(date)).toBe(true);
    expect(date.toString()).toBe('2024-01-15T00:00:00');
  });

  it('should set time correctly', () => {
    const date = adapter.createDate(2024, JAN, 15);
    const withTime = adapter.setTime(date, 14, 30, 45);

    expect(withTime.toString()).toBe('2024-01-15T14:30:45');
    expect(adapter.getHours(withTime)).toBe(14);
    expect(adapter.getMinutes(withTime)).toBe(30);
    expect(adapter.getSeconds(withTime)).toBe(45);
  });

  it('should validate time in setTime', () => {
    const date = adapter.createDate(2024, JAN, 15);

    expect(() => adapter.setTime(date, 25, 0, 0)).toThrowError(/Invalid hours/);
    expect(() => adapter.setTime(date, 0, 60, 0)).toThrowError(/Invalid minutes/);
    expect(() => adapter.setTime(date, 0, 0, 60)).toThrowError(/Invalid seconds/);
  });

  it('should parse time strings', () => {
    const result = adapter.parseTime('14:30', 'HH:mm');

    expect(result).not.toBeNull();
    expect(adapter.isValid(result!)).toBe(true);
    expect(adapter.getHours(result!)).toBe(14);
    expect(adapter.getMinutes(result!)).toBe(30);
    expect(adapter.getSeconds(result!)).toBe(0);
  });

  it('should return invalid dates for invalid time strings', () => {
    const result = adapter.parseTime('not-a-time');

    expect(adapter.isValid(result!)).toBe(false);
  });

  it('should add seconds', () => {
    const date = adapter.setTime(adapter.createDate(2024, JAN, 15), 10, 30, 0);
    const result = adapter.addSeconds(date, 90);

    expect(adapter.getHours(result)).toBe(10);
    expect(adapter.getMinutes(result)).toBe(31);
    expect(adapter.getSeconds(result)).toBe(30);
  });

  it('should handle day overflow when adding seconds', () => {
    const date = adapter.setTime(adapter.createDate(2024, JAN, 15), 23, 59, 59);
    const result = adapter.addSeconds(date, 2);

    expect(result.toString()).toBe('2024-01-16T00:00:01');
  });
});
