# Calendar support

Calendar behavior depends on the **Temporal polyfill** and engine (V8, JavaScriptCore, etc.). This package does not embed calendar data; it forwards `calendar` / `outputCalendar` options to Temporal and `Intl`.

## Tested calendars

The test suite includes a per-calendar matrix (when `Temporal.PlainDate.from({ calendar })` succeeds in the CI environment):

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

Each file runs roughly twenty cases: `today()` calendar id, `getYear` / `getMonth`, month name lengths, variable `daysInMonth`, `outputCalendar` formatting, and era display where applicable.

Tests use `describeCalendar()` — calendars unsupported by the current polyfill are **skipped** automatically, not failed.

## Islamic calendar — intentionally skipped

| Calendar ID | Status |
| --- | --- |
| `islamic` | **`describe.skip`** in `calendars/islamic.skip.spec.ts` |

**Reason:** `temporal-polyfill` and other engines disagree on Islamic calendar month arithmetic and identifiers. Enabling Islamic tests produced flaky CI across Node versions. The skip is documented in code:

```typescript
describe.skip('islamic calendar', () => {
  it('skipped — polyfill inconsistency; see docs/calendar-support.md', () => {});
});
```

You may still pass `calendar: 'islamic'` at runtime if your polyfill supports it; behavior is **not** guaranteed or covered by this package’s tests until a single canonical implementation is available.

## Configuration example

```typescript
providePlainDateAdapter(undefined, {
  calendar: 'iso8601',
  outputCalendar: 'japanese',
  overflow: 'reject',
}),
```

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

- [behavior-notes.md](./behavior-notes.md) — `withCalendar`, overflow, invalid sentinel
- [migration-from-pr.md](./migration-from-pr.md) — PR → package mapping
