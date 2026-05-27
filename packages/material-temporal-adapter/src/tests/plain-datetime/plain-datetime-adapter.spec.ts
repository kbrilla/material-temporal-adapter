import {createEnvironmentInjector} from '@angular/core';
import {DateAdapter} from '@angular/material/core';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {PlainDateTimeAdapter, providePlainDateTimeAdapter} from '../../plain-datetime';
import {testInjectorProviders} from '../shared/test-providers';

const JAN = 0;

function createAdapter(options = {}): PlainDateTimeAdapter {
  const injector = createEnvironmentInjector(
    testInjectorProviders(
      ...providePlainDateTimeAdapter(undefined, {calendar: 'iso8601', overflow: 'reject', ...options}),
    ),
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

  describe('outputCalendar', () => {
    it('stores dates in calendar and formats in outputCalendar', () => {
      const hebrewAdapter = createAdapter({calendar: 'hebrew', outputCalendar: 'iso8601'});
      const date = hebrewAdapter.createDate(2024, 0, 15);

      expect(date.calendarId).toBe('hebrew');
      expect(() =>
        hebrewAdapter.format(date, {year: 'numeric', month: 'short', day: 'numeric'}),
      ).not.toThrow();
    });

    it('round-trips through parse preserving storage calendar', () => {
      const hebrewAdapter = createAdapter({calendar: 'hebrew', outputCalendar: 'iso8601'});
      const created = hebrewAdapter.createDate(2024, 0, 15);
      const parsed = hebrewAdapter.parse(hebrewAdapter.toIso8601(created), null);

      expect(parsed).not.toBeNull();
      expect(parsed!.calendarId).toBe('hebrew');
      expect(hebrewAdapter.sameDate(created, parsed!)).toBe(true);
    });
  });

  describe('core adapter behavior', () => {
    it('clones plain date-time instances', () => {
      const date = adapter.createDate(2024, JAN, 15);
      const clone = adapter.clone(date);

      expect(clone).not.toBe(date);
      expect(clone.equals(date)).toBe(true);
    });

    it('returns today in the configured calendar', () => {
      const today = adapter.today();

      expect(adapter.isValid(today)).toBe(true);
      expect(today.calendarId).toBe('iso8601');
    });

    it('parses epoch milliseconds using the system timezone', () => {
      const parsed = adapter.parse(1704067200000);

      expect(adapter.isValid(parsed!)).toBe(true);
      expect(parsed!.hour).toBeGreaterThanOrEqual(0);
    });

    it('returns invalid dates for out-of-range epoch milliseconds', () => {
      expect(adapter.isValid(adapter.parse(Infinity)!)).toBe(false);
      expect(adapter.isValid(adapter.parse(9e15)!)).toBe(false);
    });

    it('parses ISO date-time and plain date strings', () => {
      const dateTime = adapter.parse('2024-01-15T14:30:45');
      expect(dateTime!.toString()).toBe('2024-01-15T14:30:45');

      const dateOnly = adapter.parse('2024-01-15');
      expect(dateOnly!.toString()).toBe('2024-01-15T00:00:00');
    });

    it('returns null for empty strings and invalid values', () => {
      expect(adapter.parse('')).toBeNull();
      expect(adapter.parse(null)).toBeNull();
      expect(adapter.isValid(adapter.parse('not-a-date')!)).toBe(false);
      expect(adapter.isValid(adapter.parse({})!)).toBe(false);
    });

    it('clones parsed plain date-time instances', () => {
      const original = adapter.setTime(adapter.createDate(2024, JAN, 15), 8, 0, 0);
      const parsed = adapter.parse(original);

      expect(parsed).not.toBe(original);
      expect(parsed!.equals(original)).toBe(true);
    });

    it('deserializes ISO strings and rejects malformed input', () => {
      expect(adapter.deserialize('2024-01-15T10:00:00')!.toString()).toBe('2024-01-15T10:00:00');
      expect(adapter.deserialize('')).toBeNull();
      expect(adapter.isValid(adapter.deserialize('not-a-date')!)).toBe(false);
    });

    it('recognizes invalid sentinel as a date instance', () => {
      const invalid = adapter.invalid();

      expect(adapter.isDateInstance(invalid)).toBe(true);
      expect(adapter.isValid(invalid)).toBe(false);
    });

    it('constrains invalid createDate values when overflow is constrain', () => {
      const constrainAdapter = createAdapter({overflow: 'constrain'});

      expect(constrainAdapter.createDate(2024, 1, 30).toString()).toBe('2024-02-29T00:00:00');
    });

    it('deserializes epoch milliseconds through the base implementation', () => {
      const result = adapter.deserialize(1704067200000);

      expect(result).not.toBeNull();
      expect(adapter.isValid(result!)).toBe(true);
    });

    it('returns invalid dates for unsupported deserialize values', () => {
      expect(adapter.isValid(adapter.deserialize({})!)).toBe(false);
    });

    it('falls back to 12 months when calendar metadata lookup fails', () => {
      const originalFrom = Temporal.PlainDate.from.bind(Temporal.PlainDate);
      let callCount = 0;
      const fromSpy = vi.spyOn(Temporal.PlainDate, 'from').mockImplementation((...args) => {
        callCount += 1;
        if (callCount === 1) {
          throw new Error('broken calendar metadata');
        }
        return originalFrom(...args);
      });

      try {
        expect(() => adapter.createDate(2024, 15, 1)).toThrowError(/Invalid month/);
      } finally {
        fromSpy.mockRestore();
      }
    });
  });

  describe('parseTime variants', () => {
    it('parses 12-hour time strings and ISO plain times', () => {
      const afternoon = adapter.parseTime('2:30 PM');
      expect(adapter.getHours(afternoon!)).toBe(14);

      const morning = adapter.parseTime('9.15.30 AM');
      expect(adapter.getHours(morning!)).toBe(9);
      expect(adapter.getMinutes(morning!)).toBe(15);
      expect(adapter.getSeconds(morning!)).toBe(30);

      const isoTime = adapter.parseTime('T18:45:10');
      expect(adapter.getHours(isoTime!)).toBe(18);
    });

    it('returns null for empty input and invalid for malformed strings', () => {
      expect(adapter.parseTime(null)).toBeNull();
      expect(adapter.parseTime('   ')).toEqual(adapter.invalid());
      expect(adapter.isValid(adapter.parseTime('not-a-time')!)).toBe(false);
    });
  });
});
