import {createEnvironmentInjector} from '@angular/core';
import {DateAdapter} from '@angular/material/core';
import {describe, expect, it} from 'vitest';

import {PlainDateAdapter, providePlainDateAdapter} from '../../plain-date';
import {PlainDateTimeAdapter, providePlainDateTimeAdapter} from '../../plain-datetime';
import {provideZonedDateTimeAdapter, ZonedDateTimeAdapter} from '../../zoned-datetime';
import {testInjectorProviders} from './test-providers';

function createPlainDateAdapter(options?: Parameters<typeof providePlainDateAdapter>[1]): PlainDateAdapter {
  const injector = createEnvironmentInjector(
    testInjectorProviders(...providePlainDateAdapter(undefined, options)),
    null,
  );
  return injector.runInContext(() => injector.get(DateAdapter) as PlainDateAdapter);
}

function createPlainDateTimeAdapter(): PlainDateTimeAdapter {
  const injector = createEnvironmentInjector(
    testInjectorProviders(...providePlainDateTimeAdapter()),
    null,
  );
  return injector.runInContext(() => injector.get(DateAdapter) as PlainDateTimeAdapter);
}

function createZonedDateTimeAdapter(): ZonedDateTimeAdapter {
  const injector = createEnvironmentInjector(
    testInjectorProviders(...provideZonedDateTimeAdapter({timezone: 'UTC'})),
    null,
  );
  return injector.runInContext(() => injector.get(DateAdapter) as ZonedDateTimeAdapter);
}

describe('round-trip serialization', () => {
  it.each([
    ['PlainDate', createPlainDateAdapter()],
    ['PlainDateTime', createPlainDateTimeAdapter()],
    ['ZonedDateTime', createZonedDateTimeAdapter()],
  ] as const)('%s createDate round-trips through toIso8601 and deserialize', (_label, adapter) => {
    const original = adapter.createDate(2026, 4, 26);
    const roundTripped = adapter.deserialize(adapter.toIso8601(original));

    expect(roundTripped).not.toBeNull();
    expect(adapter.sameDate(original, roundTripped!)).toBe(true);
  });

  it('PlainDate round-trips a non-Gregorian calendar date', () => {
    const adapter = createPlainDateAdapter({calendar: 'japanese', overflow: 'reject'});
    const original = adapter.createDate(2026, 0, 20);
    const roundTripped = adapter.deserialize(adapter.toIso8601(original));

    expect(roundTripped).not.toBeNull();
    expect(roundTripped!.calendarId).toBe('japanese');
    expect(adapter.sameDate(original, roundTripped!)).toBe(true);
  });

  it.each([
    ['PlainDate', createPlainDateAdapter()],
    ['PlainDateTime', createPlainDateTimeAdapter()],
    ['ZonedDateTime', createZonedDateTimeAdapter()],
  ] as const)('%s round-trips year boundaries', (_label, adapter) => {
    const original = adapter.createDate(2025, 11, 31);
    const roundTripped = adapter.deserialize(adapter.toIso8601(original));

    expect(roundTripped).not.toBeNull();
    expect(adapter.sameDate(original, roundTripped!)).toBe(true);
  });

  it('PlainDate round-trips Japanese era boundaries', () => {
    const adapter = createPlainDateAdapter({calendar: 'japanese', overflow: 'reject'});
    const heiseiLastDay = adapter.createDate(2019, 3, 30);
    const reiwaFirstDay = adapter.createDate(2019, 4, 1);

    for (const original of [heiseiLastDay, reiwaFirstDay]) {
      const roundTripped = adapter.deserialize(adapter.toIso8601(original));
      expect(roundTripped).not.toBeNull();
      expect(adapter.sameDate(original, roundTripped!)).toBe(true);
    }
  });
});
