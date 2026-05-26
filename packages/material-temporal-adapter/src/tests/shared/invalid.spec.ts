import {describe, expect, it} from 'vitest';
import {
  createInvalidPlainDate,
  createInvalidPlainDateTime,
  createInvalidZonedDateTime,
  isTemporalInvalid,
} from '../../shared/invalid';

describe('isTemporalInvalid', () => {
  it('returns false for null/undefined/{}', () => {
    expect(isTemporalInvalid(null)).toBe(false);
    expect(isTemporalInvalid(undefined)).toBe(false);
    expect(isTemporalInvalid({})).toBe(false);
  });

  it('returns false for valid PlainDate', () => {
    expect(isTemporalInvalid(Temporal.PlainDate.from('2024-01-01'))).toBe(false);
  });

  it('returns true for plain-date sentinel', () => {
    const s = createInvalidPlainDate('iso8601');
    expect(isTemporalInvalid(s)).toBe(true);
    expect(Number.isNaN(s.year)).toBe(true);
    expect((s as unknown as {_invalid: boolean})._invalid).toBe(true);
  });

  it('returns true for plain-datetime sentinel', () => {
    expect(isTemporalInvalid(createInvalidPlainDateTime('iso8601'))).toBe(true);
  });

  it('returns true for zoned sentinel with timeZoneId', () => {
    const s = createInvalidZonedDateTime('iso8601', 'UTC');
    expect(isTemporalInvalid(s)).toBe(true);
    expect(s.timeZoneId).toBe('UTC');
  });
});
