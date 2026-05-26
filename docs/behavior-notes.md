# Behavior notes

Locked behavior for `@kbrilla/material-temporal-adapter` v0.1. These notes apply to all three split adapters unless stated otherwise.

## Overflow (`reject` vs `constrain`)

- Default: **`overflow: 'reject'`** on `TemporalPlainDateOptions`, `TemporalPlainDateTimeOptions`, and `ZonedDateTimeOptions`.
- Passed to Temporal `add()` / `from()` as `{overflow: this._overflow}`.
- With **`reject`**, out-of-range calendar dates throw in **development** (`ngDevMode`) during `createDate`; in production, failed construction returns an **invalid sentinel** instead of throwing in some paths.
- With **`constrain`**, Temporal constrains values to valid calendar dates (e.g. Jan 32 → last day of month).

Configure per adapter:

```typescript
providePlainDateAdapter(undefined, {calendar: 'iso8601', overflow: 'constrain'}),
```

## Invalid sentinel

Material expects invalid picker state to be representable without `null` in some flows. Adapters use branded sentinel objects:

- `createInvalidPlainDate(calendarId)`
- `createInvalidPlainDateTime(calendarId)`
- `createInvalidZonedDateTime(calendarId, timeZoneId)`

Sentinels expose `year` / `month` / `day` (and time fields) as **`NaN`**, `monthCode: 'MNaN'`, and `_invalid: true`.

Detect them in app code:

```typescript
import {isTemporalInvalid} from '@kbrilla/material-temporal-adapter';

if (isTemporalInvalid(control.value)) {
  // show validation error
}
```

`isDateInstance()` returns `true` for both real Temporal instances and invalid sentinels so Material can hold a single control type.

`format()` on an invalid value throws: *"Cannot format invalid date."*

## Time zone (zoned adapter only)

- **`timezone` is required** in `provideZonedDateTimeAdapter({ timezone: '...' })`.
- There is **no** fallback to `Temporal.Now.timeZoneId()` in the community package.
- `today()` uses `Temporal.Now.zonedDateTimeISO(this._timezone)`.
- For UTC storage/display, pass `timezone: 'UTC'` explicitly.

This avoids server/client drift and makes SSR behavior predictable when combined with an explicit zone (see [ssr-considerations.md](./ssr-considerations.md)).

## DST disambiguation and offset (zoned)

Optional `ZonedDateTimeOptions`:

| Option | Values | Purpose |
| --- | --- | --- |
| `disambiguation` | `'compatible'`, `'earlier'`, `'later'`, `'reject'` | Resolve ambiguous local times during DST gaps/overlaps |
| `offset` | `'use'`, `'ignore'`, `'reject'`, `'prefer'` | Control behavior when parsed offset conflicts with time zone rules |

Forwarded to `Temporal.ZonedDateTime.from()` via `_getZonedFromOptions()`.

## Rounding (zoned)

Optional `rounding: { smallestUnit, roundingIncrement?, roundingMode? }` on zoned options.

Applied in `_maybeRoundZoned()` before:

- `format()` display strings
- `toIso8601()` output

Not applied to raw `clone()` / internal picker math unless formatting paths run.

Example:

```typescript
provideZonedDateTimeAdapter({
  timezone: 'UTC',
  rounding: {smallestUnit: 'minute', roundingMode: 'halfExpand'},
}),
```

## Locale and first day of week

- Locale comes from `MAT_DATE_LOCALE` when provided, else `getDefaultLocale()` from shared utils.
- `getFirstDayOfWeek()` uses `options.firstDayOfWeek` when set; otherwise derives from locale (Sunday = `0`, matching Material).
- Weekday **names** are generated from ISO dates in **January 2017** (days 1–7) for stable short/long labels across environments.
- Month and day **numeric names** use reference year **2017** in the configured **output** calendar.

## `withCalendar` and dual-calendar pattern

- **`calendar`** — storage calendar id on `PlainDate` / `PlainDateTime` / `ZonedDateTime` instances (`today()`, `createDate()`, parsing).
- **`outputCalendar`** — optional; when set, `format()` and label helpers call `date.withCalendar(outputCalendar)` before `toLocaleString()`.

Typical pattern:

- Store **`calendar: 'iso8601'`** for API/backend compatibility.
- Display **`outputCalendar: 'japanese'`** (or user locale calendar) in the picker.

If `outputCalendar` is omitted, formatting uses the same id as `calendar`.

## Plain date vs date-time capabilities

| Method | PlainDate | PlainDateTime | ZonedDateTime |
| --- | --- | --- | --- |
| `setTime` | **throws** | supported | supported |
| `parseTime` | returns invalid sentinel | supported | supported |
| `getHours` / `getMinutes` / `getSeconds` | always `0` | from value | from value |
| `addSeconds` | no-op (returns same date) | supported | supported |

Use **`PlainDateTimeAdapter`** or **`ZonedDateTimeAdapter`** when Material timepicker APIs are enabled.

## Polyfill

`BaseTemporalAdapter` calls `ensureTemporalAvailable()` in the constructor. If `globalThis.Temporal` is undefined:

```
Temporal is not available. Import temporal-polyfill/global before using material-temporal-adapter.
```

The package lists **no** runtime dependency on a polyfill — you choose `temporal-polyfill` or `@js-temporal/polyfill`.

## Parsing and deserialization

- **String parse failure** in `parse()` often yields an **invalid sentinel** (not `null`) so the field shows error state.
- **Empty string** deserializes to `null`.
- **Epoch milliseconds** outside ±8.64e15 produce an invalid sentinel for plain adapters.

## Extension

`BaseTemporalAdapter` is exported for advanced subclasses. Prefer the three official adapters for application use.
