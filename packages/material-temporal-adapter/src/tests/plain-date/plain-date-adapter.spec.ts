import {createEnvironmentInjector, NgZone} from '@angular/core';
import {DateAdapter, MAT_DATE_LOCALE} from '@angular/material/core';
import {beforeEach, describe, expect, it} from 'vitest';

import {PlainDateAdapter, MAT_TEMPORAL_PLAIN_DATE_OPTIONS} from '../../plain-date';

const JAN = 0;
const FEB = 1;
const MAR = 2;

function createAdapter(options = {}): PlainDateAdapter {
  const injector = createEnvironmentInjector(
    [
      {provide: NgZone, useFactory: () => new NgZone({enableLongStackTrace: false})},
      {provide: MAT_DATE_LOCALE, useValue: 'en-US'},
      {provide: MAT_TEMPORAL_PLAIN_DATE_OPTIONS, useValue: {calendar: 'iso8601', overflow: 'reject', ...options}},
      {provide: DateAdapter, useClass: PlainDateAdapter},
    ],
    null,
  );
  return injector.runInContext(() => injector.get(DateAdapter) as PlainDateAdapter);
}

function isPlainDate(value: unknown): value is Temporal.PlainDate {
  return value instanceof Temporal.PlainDate;
}

describe('PlainDateAdapter', () => {
  let adapter: PlainDateAdapter;

  beforeEach(() => {
    adapter = createAdapter();
  });

  it('should create PlainDate instances', () => {
    const date = adapter.createDate(2024, JAN, 15);

    expect(isPlainDate(date)).toBe(true);
    expect(date.toString()).toBe('2024-01-15');
  });

  it('should clone dates into new instances', () => {
    const date = adapter.createDate(2017, JAN, 1);
    const clone = adapter.clone(date);

    expect(clone).not.toBe(date);
    expect(clone.equals(date)).toBe(true);
  });

  it('should return 0 for time getters on PlainDate', () => {
    const date = adapter.createDate(2024, JAN, 15);

    expect(adapter.getHours(date)).toBe(0);
    expect(adapter.getMinutes(date)).toBe(0);
    expect(adapter.getSeconds(date)).toBe(0);
  });

  it('should throw when setting time on PlainDate', () => {
    const date = adapter.createDate(2024, JAN, 15);

    expect(() => adapter.setTime(date, 14, 30, 0)).toThrowError(
      /PlainDateTimeAdapter.*ZonedDateTimeAdapter/,
    );
  });

  it('should return an invalid date for parseTime', () => {
    const result = adapter.parseTime('12:30');

    expect(adapter.isValid(result!)).toBe(false);
  });

  it('should parse epoch milliseconds as PlainDate', () => {
    const date = adapter.parse(1704067200000);

    expect(adapter.isValid(date!)).toBe(true);
    expect(isPlainDate(date)).toBe(true);
  });

  it('should handle invalid epoch milliseconds', () => {
    const date = adapter.parse(Infinity);

    expect(adapter.isValid(date!)).toBe(false);
  });

  it('should reject invalid month indexes by default', () => {
    expect(() => adapter.createDate(2024, 12, 1)).toThrowError(/Invalid month/);
    expect(() => adapter.createDate(2024, -1, 1)).toThrowError(/Invalid month/);
  });

  it('should reject invalid dates by default', () => {
    expect(() => adapter.createDate(2024, JAN, 0)).toThrowError(/Invalid date/);
    expect(() => adapter.createDate(2024, FEB, 30)).toThrowError(/Invalid date/);
  });

  it('should constrain invalid dates when configured', () => {
    const constrainAdapter = createAdapter({overflow: 'constrain'});

    expect(constrainAdapter.createDate(2024, FEB, 30).toString()).toBe('2024-02-29');
    expect(constrainAdapter.createDate(2024, 15, 1).toString()).toBe('2024-12-01');
  });

  it('should constrain calendar arithmetic when configured', () => {
    const constrainAdapter = createAdapter({overflow: 'constrain'});
    const date = constrainAdapter.createDate(2024, MAR, 31);
    const result = constrainAdapter.addCalendarMonths(date, -1);

    expect(result.toString()).toBe('2024-02-29');
  });

  it('should recognize invalid sentinel as a date instance', () => {
    const invalid = adapter.invalid();

    expect(adapter.isDateInstance(invalid)).toBe(true);
    expect(adapter.isValid(invalid)).toBe(false);
  });

  it('should deserialize ISO date strings', () => {
    const result = adapter.deserialize('2024-01-15');

    expect(adapter.isValid(result!)).toBe(true);
    expect(result!.toString()).toBe('2024-01-15');
  });

  it('should return null when deserializing an empty string', () => {
    expect(adapter.deserialize('')).toBeNull();
  });

  it('should return an invalid date when deserializing malformed strings', () => {
    const result = adapter.deserialize('not-a-date');

    expect(adapter.isValid(result!)).toBe(false);
  });
});
