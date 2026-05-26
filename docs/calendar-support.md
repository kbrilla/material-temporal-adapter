# Calendar support

Calendar behavior depends on the **Temporal polyfill** and engine (V8, JavaScriptCore, etc.). This package does not embed calendar data; it forwards `calendar` / `outputCalendar` options to Temporal and [`Intl`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat#calendar).

> Setup: [quickstart.md](./quickstart.md) · Provider examples: [usage.md](./usage.md) · Per-story configs: [Storybook Calendars](https://kbrilla.github.io/material-temporal-adapter/?path=/docs/docs-calendars--docs)

## Tested calendars

The test suite includes a per-calendar matrix (when [`Temporal.PlainDate.from({ calendar })`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate/from) succeeds in the CI environment):

| Calendar ID | Test file | Notes |
| --- | --- | --- |
| `gregory` | `calendars/gregory.spec.ts` | Default Gregorian / ISO-8601-style |
| `japanese` | `calendars/japanese.spec.ts` | Era labels (e.g. Reiwa) via `outputCalendar` |
| `hebrew` | `calendars/hebrew.spec.ts` | Lunisolar, variable month lengths |
| `chinese` | `calendars/chinese.spec.ts` | Lunisolar, leap months |
| `persian` | `calendars/persian.spec.ts` | Solar Hijri (Jalaali) |
| `buddhist` | `calendars/buddhist.spec.ts` | Buddhist era offset |
| `indian` | `calendars/indian.spec.ts` | Indian national calendar |
| `ethiopic` | `calendars/ethiopic.spec.ts` | 13-month year |
| `coptic` | `calendars/coptic.spec.ts` | Coptic calendar |

Each file runs roughly twenty cases: `today()` calendar id, `getYear` / `getMonth`, month name lengths, variable `daysInMonth`, [`withCalendar()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate/withCalendar) / `outputCalendar` formatting, and era display where applicable.

Tests use `describeCalendar()` — calendars unsupported by the current polyfill are **skipped** automatically, not failed.

## Hijri (Islamic) calendars — tests intentionally skipped

| Calendar ID | Status |
| --- | --- |
| `islamic` (generic) | **`describe.skip`** in `calendars/islamic.skip.spec.ts` |
| `islamic-umalqura`, `islamic-tbla`, … | May work at runtime; **not covered** by this package’s matrix |

### Why tests stay skipped (2026)

This is still valid. The underlying issue is **upstream calendar standardization**, not a bug in this adapter:

1. **TC39 has not finished defining Hijri support.** Generic `islamic` vs stable variants like `islamic-umalqura` is actively discussed — Temporal may require explicit variant ids rather than a single `islamic` alias. See [tc39/proposal-intl-era-monthcode#29](https://github.com/tc39/proposal-intl-era-monthcode/issues/29).
2. **Engines and polyfills still disagree** on Hijri era labels, month arithmetic, and ICU output (e.g. [js-temporal/temporal-polyfill#284](https://github.com/js-temporal/temporal-polyfill/issues/284)).
3. **Polyfill fixes are ongoing** ([js-temporal/temporal-polyfill#361](https://github.com/js-temporal/temporal-polyfill/pull/361)) but cross-engine consistency is not stable enough for our CI matrix — enabling Islamic tests previously produced flaky results across Node versions.

```typescript
describe.skip('islamic calendar', () => {
  it('skipped — Hijri calendar ids still inconsistent across engines; see docs/calendar-support.md', () => {});
});
```

### What to use instead

- Prefer an **explicit variant** such as `islamic-umalqura` (Saudi Umm al-Qura) rather than bare `islamic`.
- **Feature-detect** before wiring the adapter (see below).
- For custom Hijri logic outside built-in ids, community packages such as [temporal-hijri](https://github.com/acamarata/temporal-hijri) plug into Temporal’s calendar protocol.

Behavior of any Hijri id is **not guaranteed or tested** by this package until TC39 and polyfills converge.

## Configuration example

```typescript
providePlainDateAdapter(undefined, {
  calendar: 'iso8601',
  outputCalendar: 'japanese',
  overflow: 'reject',
}),
```

[`overflow`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate/from#overflow) is forwarded to Temporal `from()` / `add()`.

## Feature detection

To probe support before wiring the adapter:

```typescript
function supportsCalendar(id: string): boolean {
  try {
    Temporal.PlainDate.from({year: 2024, month: 1, day: 1, calendar: id});
    return true;
  } catch {
    return false;
  }
}
```

## Related docs

- [behavior-notes.md](./behavior-notes.md) — [`withCalendar`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate/withCalendar), overflow, invalid sentinel
