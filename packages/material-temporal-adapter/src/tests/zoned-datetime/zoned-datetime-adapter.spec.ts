import {createEnvironmentInjector} from '@angular/core';
import {DateAdapter, MAT_DATE_LOCALE} from '@angular/material/core';
import {describe, expect, it, vi} from 'vitest';

import {
  MAT_TEMPORAL_ZONED_OPTIONS,
  provideZonedDateTimeAdapter,
  ZonedDateTimeAdapter,
} from '../../zoned-datetime';
import {testInjectorProviders} from '../shared/test-providers';

const MAR = 2;
const NOV = 10;
const NEW_YORK = 'America/New_York';

function createAdapter(options: Partial<Parameters<typeof zonedOptions>[0]> = {}): ZonedDateTimeAdapter {
  const injector = createEnvironmentInjector(
    testInjectorProviders(...provideZonedDateTimeAdapter(zonedOptions({timezone: NEW_YORK, ...options}))),
    null,
  );
  return injector.runInContext(() => injector.get(DateAdapter) as ZonedDateTimeAdapter);
}

function zonedOptions(options: {
  timezone: string;
  disambiguation?: 'compatible' | 'earlier' | 'later' | 'reject';
  overflow?: 'reject' | 'constrain';
  calendar?: string;
}) {
  return {calendar: 'iso8601', overflow: 'reject' as const, ...options};
}

describe('ZonedDateTimeAdapter', () => {
  it('should throw without a timezone option', () => {
    const injector = createEnvironmentInjector(
      testInjectorProviders(
        {provide: MAT_TEMPORAL_ZONED_OPTIONS, useValue: {calendar: 'iso8601'}},
        {
          provide: DateAdapter,
          useFactory: (opts: {calendar: string} | null, locale: string | null) =>
            new ZonedDateTimeAdapter(opts as never, locale),
          deps: [MAT_TEMPORAL_ZONED_OPTIONS, MAT_DATE_LOCALE],
        },
      ),
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

  describe('rounding lifecycle', () => {
    function createRoundedAdapter() {
      const injector = createEnvironmentInjector(
        testInjectorProviders(
          ...provideZonedDateTimeAdapter({
            timezone: 'UTC',
            rounding: {smallestUnit: 'minute'},
          }),
        ),
        null,
      );
      return injector.runInContext(() => injector.get(DateAdapter) as ZonedDateTimeAdapter);
    }

    it('format and toIso8601 apply rounding while stored values stay unrounded', () => {
      const adapter = createRoundedAdapter();
      const stored = adapter.setTime(adapter.createDate(2024, 0, 15), 10, 30, 45);

      expect(adapter.getSeconds(stored)).toBe(45);
      expect(adapter.toIso8601(stored)).toBe('2024-01-15T10:31:00+00:00[UTC]');
      expect(adapter.format(stored, {hour: 'numeric', minute: 'numeric', second: 'numeric'})).toContain(
        '31',
      );
    });

    it('leaves values unchanged when rounding is not configured', () => {
      const adapter = createAdapter({timezone: 'UTC'});
      const stored = adapter.setTime(adapter.createDate(2024, 0, 15), 10, 30, 45);

      expect(adapter.toIso8601(stored)).toBe('2024-01-15T10:30:45+00:00[UTC]');
      expect(adapter.getSeconds(stored)).toBe(45);
    });
  });

  describe('DST calendar arithmetic', () => {
    it('addCalendarDays preserves local hour across spring-forward', () => {
      const adapter = createAdapter({timezone: 'America/New_York'});
      const before = adapter.setTime(adapter.createDate(2024, 2, 9), 10, 0, 0);
      const after = adapter.addCalendarDays(before, 1);

      expect(adapter.getHours(after)).toBe(10);
      expect(adapter.getDate(after)).toBe(10);
      expect(adapter.getMonth(after)).toBe(2);
    });

    it('addCalendarDays preserves local hour across fall-back', () => {
      const adapter = createAdapter({timezone: 'America/New_York'});
      const before = adapter.setTime(adapter.createDate(2024, 10, 2), 10, 0, 0);
      const after = adapter.addCalendarDays(before, 1);

      expect(adapter.getHours(after)).toBe(10);
      expect(adapter.getDate(after)).toBe(3);
      expect(adapter.getMonth(after)).toBe(10);
    });

    it('addCalendarMonths preserves local hour across a DST boundary', () => {
      const adapter = createAdapter({timezone: 'America/New_York'});
      const before = adapter.setTime(adapter.createDate(2024, 1, 9), 10, 0, 0);
      const after = adapter.addCalendarMonths(before, 1);

      expect(adapter.getHours(after)).toBe(10);
      expect(adapter.getMonth(after)).toBe(2);
    });
  });

  describe('core adapter behavior', () => {
    it('clones zoned date-times into new instances', () => {
      const adapter = createAdapter({timezone: 'UTC'});
      const date = adapter.setTime(adapter.createDate(2024, 0, 15), 12, 0, 0);
      const clone = adapter.clone(date);

      expect(clone).not.toBe(date);
      expect(clone.equals(date)).toBe(true);
    });

    it('returns today in the configured timezone and calendar', () => {
      const adapter = createAdapter({timezone: 'UTC'});
      const today = adapter.today();

      expect(adapter.isValid(today)).toBe(true);
      expect(today.timeZoneId).toBe('UTC');
      expect(today.calendarId).toBe('iso8601');
    });

    it('parses epoch milliseconds', () => {
      const adapter = createAdapter({timezone: 'UTC'});
      const parsed = adapter.parse(1704067200000);

      expect(adapter.isValid(parsed!)).toBe(true);
      expect(parsed!.toPlainDate().toString()).toBe('2024-01-01');
    });

    it('returns invalid dates for out-of-range epoch milliseconds', () => {
      const adapter = createAdapter({timezone: 'UTC'});

      expect(adapter.isValid(adapter.parse(Infinity)!)).toBe(false);
      expect(adapter.isValid(adapter.parse(9e15)!)).toBe(false);
    });

    it('parses ISO zoned date-time strings', () => {
      const adapter = createAdapter({timezone: 'UTC'});
      const parsed = adapter.parse('2024-01-15T10:30:00+00:00[UTC]');

      expect(adapter.isValid(parsed!)).toBe(true);
      expect(parsed!.toString()).toBe('2024-01-15T10:30:00+00:00[UTC]');
    });

    it('parses plain date strings at midnight in the configured timezone', () => {
      const adapter = createAdapter({timezone: 'UTC'});
      const parsed = adapter.parse('2024-01-15');

      expect(adapter.isValid(parsed!)).toBe(true);
      expect(parsed!.toPlainDate().toString()).toBe('2024-01-15');
      expect(adapter.getHours(parsed!)).toBe(0);
    });

    it('returns null for empty strings and invalid values', () => {
      const adapter = createAdapter({timezone: 'UTC'});

      expect(adapter.parse('')).toBeNull();
      expect(adapter.parse(null)).toBeNull();
      expect(adapter.isValid(adapter.parse('not-a-date')!)).toBe(false);
      expect(adapter.isValid(adapter.parse({})!)).toBe(false);
    });

    it('clones parsed zoned date-time instances', () => {
      const adapter = createAdapter({timezone: 'UTC'});
      const original = adapter.setTime(adapter.createDate(2024, 0, 15), 8, 0, 0);
      const parsed = adapter.parse(original);

      expect(parsed).not.toBe(original);
      expect(parsed!.equals(original)).toBe(true);
    });

    it('deserializes ISO strings and rejects malformed input', () => {
      const adapter = createAdapter({timezone: 'UTC'});

      expect(adapter.deserialize('2024-01-15T10:00:00+00:00[UTC]')!.toString()).toBe(
        '2024-01-15T10:00:00+00:00[UTC]',
      );
      expect(adapter.deserialize('')).toBeNull();
      expect(adapter.isValid(adapter.deserialize('not-a-date')!)).toBe(false);
    });

    it('throws when formatting invalid dates', () => {
      const adapter = createAdapter({timezone: 'UTC'});

      expect(() => adapter.format(adapter.invalid(), {year: 'numeric'})).toThrowError(
        /Cannot format invalid date/,
      );
    });

    it('adds seconds across minute boundaries', () => {
      const adapter = createAdapter({timezone: 'UTC'});
      const date = adapter.setTime(adapter.createDate(2024, 0, 15), 10, 30, 0);
      const result = adapter.addSeconds(date, 90);

      expect(adapter.getHours(result)).toBe(10);
      expect(adapter.getMinutes(result)).toBe(31);
      expect(adapter.getSeconds(result)).toBe(30);
    });

    it('constrains invalid createDate values when overflow is constrain', () => {
      const adapter = createAdapter({timezone: 'UTC', overflow: 'constrain'});

      expect(adapter.createDate(2024, 1, 30).toPlainDate().toString()).toBe('2024-02-29');
    });
  });

  describe('parseTime', () => {
    it('parses 24-hour and 12-hour time strings', () => {
      const adapter = createAdapter({timezone: 'UTC'});

      const afternoon = adapter.parseTime('14:30');
      expect(adapter.getHours(afternoon!)).toBe(14);
      expect(adapter.getMinutes(afternoon!)).toBe(30);

      const morning = adapter.parseTime('9.15.30 AM');
      expect(adapter.getHours(morning!)).toBe(9);
      expect(adapter.getMinutes(morning!)).toBe(15);
      expect(adapter.getSeconds(morning!)).toBe(30);

      const noon = adapter.parseTime('12:00 PM');
      expect(adapter.getHours(noon!)).toBe(12);

      const midnight = adapter.parseTime('12:00 AM');
      expect(adapter.getHours(midnight!)).toBe(0);
    });

    it('parses ISO plain time strings', () => {
      const adapter = createAdapter({timezone: 'UTC'});
      const parsed = adapter.parseTime('T18:45:10');

      expect(adapter.getHours(parsed!)).toBe(18);
      expect(adapter.getMinutes(parsed!)).toBe(45);
      expect(adapter.getSeconds(parsed!)).toBe(10);
    });

    it('returns null for empty input and invalid for malformed strings', () => {
      const adapter = createAdapter({timezone: 'UTC'});

      expect(adapter.parseTime(null)).toBeNull();
      expect(adapter.parseTime('   ')).toEqual(adapter.invalid());
      expect(adapter.isValid(adapter.parseTime('not-a-time')!)).toBe(false);
      expect(adapter.isValid(adapter.parseTime('x'.repeat(33))!)).toBe(false);
    });

    it('throws when setTime receives an invalid target', () => {
      const adapter = createAdapter({timezone: 'UTC'});

      expect(() => adapter.setTime(adapter.invalid(), 0, 0, 0)).toThrowError(
        /Expected a valid Temporal\.ZonedDateTime/,
      );
    });

    it('falls back to 12 months when calendar metadata lookup fails', () => {
      const adapter = createAdapter({timezone: 'UTC'});
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
});
