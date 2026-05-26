# @kbrilla/material-temporal-adapter

Temporal API `DateAdapter` implementations for Angular Material datepicker, timepicker, and date-range controls.

> **Community-maintained.** This package is **not** part of Angular or the Angular Material team. It is extracted from [angular/components#32668](https://github.com/angular/components/pull/32668) and published independently under the MIT license. For framework integration, follow the upstream PR; for production use today, install this package.

## Requirements

- Angular Material **18–20** (`@angular/material`, `@angular/cdk`, `@angular/core`)
- A **Temporal polyfill** loaded before any adapter is constructed (see Quick start)
- Node **20+** for local development in this monorepo

## Quick start

Install the adapter and a polyfill (you bring your own — the package does not bundle Temporal):

```bash
pnpm add @kbrilla/material-temporal-adapter temporal-polyfill
```

Load the polyfill **before** bootstrapping Angular (order matters for SSR — see [docs/ssr-considerations.md](../../docs/ssr-considerations.md)):

```typescript
import 'temporal-polyfill/global';
```

Register a split adapter in `bootstrapApplication` (or a route/environment `providers` array):

```typescript
import {bootstrapApplication} from '@angular/platform-browser';
import {providePlainDateAdapter, isTemporalInvalid} from '@kbrilla/material-temporal-adapter';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {MatDatepickerModule} from '@angular/material/datepicker';

bootstrapApplication(AppComponent, {
  providers: [providePlainDateAdapter()],
});
```

Use `Temporal.PlainDate` (or the adapter type you chose) in form controls and templates. Check invalid picker values with `isTemporalInvalid()`:

```typescript
import {isTemporalInvalid} from '@kbrilla/material-temporal-adapter';

const value = dateControl.value;
if (isTemporalInvalid(value)) {
  // User entered an unparseable or out-of-range date; sentinel has NaN fields.
}
```

### Date + time (no time zone)

```typescript
import {providePlainDateTimeAdapter} from '@kbrilla/material-temporal-adapter';

providers: [providePlainDateTimeAdapter()],
```

### Date + time with time zone

`timezone` is **required** — there is no system-time-zone fallback.

```typescript
import {provideZonedDateTimeAdapter} from '@kbrilla/material-temporal-adapter';

providers: [
  provideZonedDateTimeAdapter({
    timezone: 'America/New_York',
    calendar: 'iso8601',
    overflow: 'reject',
  }),
],
```

### Non-Gregorian calendar

```typescript
providePlainDateAdapter(undefined, {
  calendar: 'hebrew',
  outputCalendar: 'hebrew',
}),
```

See [docs/calendar-support.md](../../docs/calendar-support.md) for tested calendars.

## Adapter comparison

| Adapter | Temporal type | Time | Time zone | Provider | Default formats token |
| --- | --- | --- | --- | --- | --- |
| `PlainDateAdapter` | `Temporal.PlainDate` | No (`setTime` throws) | N/A | `providePlainDateAdapter(formats?, options?)` | `MAT_TEMPORAL_DATE_FORMATS` |
| `PlainDateTimeAdapter` | `Temporal.PlainDateTime` | Yes | N/A | `providePlainDateTimeAdapter(formats?, options?)` | `MAT_TEMPORAL_DATETIME_FORMATS` |
| `ZonedDateTimeAdapter` | `Temporal.ZonedDateTime` | Yes | **Required** `timezone` | `provideZonedDateTimeAdapter(options, formats?)` | `MAT_TEMPORAL_ZONED_FORMATS` |

**Removed from the upstream PR:** unified `TemporalDateAdapter`, hybrid `PlainTemporalAdapter`, `MatTemporalModule`, and shared `MAT_BASE_TEMPORAL_OPTIONS`. Use exactly one split adapter per application (or per lazy route via `providers`).

## Behavior notes (summary)

| Topic | Default / behavior |
| --- | --- |
| Overflow | `overflow: 'reject'` — invalid calendar arithmetic throws in dev mode or returns an invalid sentinel |
| Invalid values | `isTemporalInvalid()` detects sentinel objects with `_invalid: true` and `NaN` fields |
| Polyfill | BYO; constructor calls `ensureTemporalAvailable()` and throws if `globalThis.Temporal` is missing |
| Zoned time zone | Required in `provideZonedDateTimeAdapter({ timezone: '...' })` — no `Temporal.Now.timeZoneId()` default |
| Output calendar | `outputCalendar` formats via `withCalendar()`; storage uses `calendar` |
| First day of week | Locale-derived unless `firstDayOfWeek` is set in options |
| Zoned DST / offset | Optional `disambiguation` and `offset`; optional `rounding` on format/ISO output |

Details: [docs/behavior-notes.md](../../docs/behavior-notes.md).

## SSR

Import the polyfill in `main.server.ts` (or equivalent) before adapter providers. Pass an explicit `timezone` for zoned adapters on the server. See [docs/ssr-considerations.md](../../docs/ssr-considerations.md).

## Migrating from the Angular PR

If you prototyped against `@angular/material-temporal-adapter` or the PR branch, see [docs/migration-from-pr.md](../../docs/migration-from-pr.md).

## Documentation

| Doc | Description |
| --- | --- |
| [behavior-notes.md](../../docs/behavior-notes.md) | Overflow, rounding, invalid sentinel, locale, `withCalendar` |
| [calendar-support.md](../../docs/calendar-support.md) | Tested calendars matrix |
| [ssr-considerations.md](../../docs/ssr-considerations.md) | Polyfill order, hydration, explicit timezone |
| [migration-from-pr.md](../../docs/migration-from-pr.md) | PR → community package mapping |

## Demo

Storybook examples live in this monorepo under `apps/demo`. **Live demo:** https://kbrilla.github.io/material-temporal-adapter/

## License

MIT — Copyright Krzysztof Brilla. See [LICENSE](./LICENSE).
