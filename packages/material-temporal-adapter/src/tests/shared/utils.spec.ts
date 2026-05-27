import {describe, expect, it, vi} from 'vitest';

import {getDefaultLocale, getLocaleFirstDayOfWeek, range} from '../../shared/utils';

describe('utils', () => {
  describe('range', () => {
    it('creates a zero-based array for a length', () => {
      expect(range(3)).toEqual([0, 1, 2]);
    });

    it('creates an array for a start/end pair', () => {
      expect(range(2, 5)).toEqual([2, 3, 4]);
    });

    it('returns an empty array when end is not greater than start', () => {
      expect(range(5, 5)).toEqual([]);
      expect(range(5, 2)).toEqual([]);
    });
  });

  describe('getDefaultLocale', () => {
    it('returns the resolved Intl locale', () => {
      expect(getDefaultLocale()).toBe(Intl.DateTimeFormat().resolvedOptions().locale);
    });
  });

  describe('getLocaleFirstDayOfWeek', () => {
    it('returns Monday when Intl.Locale is unavailable', () => {
      const originalLocale = (Intl as {Locale?: unknown}).Locale;
      (Intl as {Locale?: unknown}).Locale = undefined;

      try {
        expect(getLocaleFirstDayOfWeek('en-US')).toBe(1);
      } finally {
        (Intl as {Locale?: unknown}).Locale = originalLocale;
      }
    });

    it('reads weekInfo.firstDay when available', () => {
      class MockLocale {
        readonly weekInfo = {firstDay: 7};

        constructor(_locale: string) {}
      }

      const originalLocale = (Intl as {Locale?: unknown}).Locale;
      (Intl as {Locale?: unknown}).Locale = MockLocale as unknown as typeof Intl.Locale;

      try {
        expect(getLocaleFirstDayOfWeek('en-US')).toBe(7);
      } finally {
        (Intl as {Locale?: unknown}).Locale = originalLocale;
      }
    });

    it('falls back to getWeekInfo when weekInfo is missing', () => {
      class MockLocale {
        getWeekInfo() {
          return {firstDay: 6};
        }

        constructor(_locale: string) {}
      }

      const originalLocale = (Intl as {Locale?: unknown}).Locale;
      (Intl as {Locale?: unknown}).Locale = MockLocale as unknown as typeof Intl.Locale;

      try {
        expect(getLocaleFirstDayOfWeek('en-US')).toBe(6);
      } finally {
        (Intl as {Locale?: unknown}).Locale = originalLocale;
      }
    });

    it('defaults to Monday when locale metadata is missing', () => {
      class MockLocale {
        constructor(_locale: string) {}
      }

      const originalLocale = (Intl as {Locale?: unknown}).Locale;
      (Intl as {Locale?: unknown}).Locale = MockLocale as unknown as typeof Intl.Locale;

      try {
        expect(getLocaleFirstDayOfWeek('en-US')).toBe(1);
      } finally {
        (Intl as {Locale?: unknown}).Locale = originalLocale;
      }
    });

    it('uses getDefaultLocale when no locale is passed', () => {
      const localeSpy = vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
        locale: 'en-US',
        calendar: 'gregory',
        numberingSystem: 'latn',
        timeZone: 'UTC',
      });

      try {
        expect(getLocaleFirstDayOfWeek()).toBe(getLocaleFirstDayOfWeek('en-US'));
      } finally {
        localeSpy.mockRestore();
      }
    });
  });
});
