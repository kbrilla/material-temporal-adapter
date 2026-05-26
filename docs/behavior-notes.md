# Behavior notes

Locked behavior for `@kbrilla/material-temporal-adapter` v0.1. These notes apply to all three split adapters unless stated otherwise.

> Setup: [quickstart.md](./quickstart.md) · Patterns: [usage.md](./usage.md) · Storybook configs: [live demo](https://kbrilla.github.io/material-temporal-adapter/)

Temporal API reference: [MDN — Temporal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal)

## Overflow (`reject` vs `constrain`)

> **Rationale:** [design-rationale.md — overflow](./design-rationale.md#default-overflow-reject)

- Default: **`overflow: 'reject'`** on plain and zoned adapter options.
- Passed to Temporal [`add()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate/add) / [`from()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate/from) as `{overflow: this._overflow}` ([`overflow` option on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate/from#overflow)).
- With **`reject`**, out-of-range calendar dates throw in **development** (`ngDevMode`) during `createDate`; in production, failed construction returns an **invalid sentinel** instead of throwing in some paths.
- With **`constrain`**, Temporal constrains values to valid calendar dates (e.g. Jan 32 → last day of month).

Configure per adapter:

```typescript
providePlainDateAdapter(undefined, {calendar: 'iso8601', overflow: 'constrain'}),
```

## Invalid sentinel

> **Rationale (read this):** [design-rationale.md — Invalid sentinels](./design-rationale.md#invalid-sentinels-the-ugly-objects) — why not `null`, why Material requires this, trade-offs.

Angular Material’s `DateAdapter` requires an **`invalid()`** value that is **not valid** but still **`isDateInstance()`** — same pattern as `NativeDateAdapter`’s `new Date(NaN)`. Temporal has no invalid `PlainDate` in the spec, so adapters use a **branded sentinel object** cast to `Temporal.PlainDate`.

| Control value | Meaning |
| --- | --- |
| `null` | Empty field — nothing selected |
| Real `Temporal.*` | Valid date/time |
| Sentinel (`_invalid: true`, `NaN` fields) | **Invalid but non-empty** — bad parse, impossible calendar date, etc. |

Factory helpers (internal shape — do not construct manually):

- `createInvalidPlainDate(calendarId)`
- `createInvalidPlainDateTime(calendarId)`
- `createInvalidZonedDateTime(calendarId, timeZoneId)`

Sentinels expose `year` / `month` / `day` (and time fields) as **`NaN`**, [`monthCode`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate/monthCode): `'MNaN'`, and `_invalid: true`.

Detect them in app code:

```typescript
import {isTemporalInvalid} from '@kbrilla/material-temporal-adapter';

if (control.value !== null && isTemporalInvalid(control.value)) {
  // show validation error — NOT the same as empty (null)
}
```

`isDateInstance()` returns `true` for both real Temporal instances and invalid sentinels so Material can hold a single control type.

`isValid()` returns `false` for sentinels.

`format()` on an invalid value throws: *"Cannot format invalid date."*

**Do not** serialize sentinels to your API or SSR transfer state — use `null` or omit the field after validation fails.

## Time zone (zoned adapter only)

> **Rationale:** [design-rationale.md — Required timezone](./design-rationale.md#required-timezone-zoned-adapter)

- **`timezone` is required** in `provideZonedDateTimeAdapter({ timezone: '...' })` — maps to [`timeZoneId`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime/timeZoneId).
- There is **no** fallback to [`Temporal.Now.timeZoneId()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/Now/timeZoneId) in the community package.
- `today()` uses [`Temporal.Now.zonedDateTimeISO(timeZone)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/Now/zonedDateTimeISO).
- For UTC storage/display, pass `timezone: 'UTC'` explicitly.

This avoids server/client drift and makes SSR behavior predictable when combined with an explicit zone (see [ssr-considerations.md](./ssr-considerations.md)).

## DST disambiguation and offset (zoned)

Optional `ZonedDateTimeOptions` forwarded to [`Temporal.ZonedDateTime.from()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime/from):

| Option | Values | Purpose | MDN |
| --- | --- | --- | --- |
| `disambiguation` | `'compatible'`, `'earlier'`, `'later'`, `'reject'` | Resolve ambiguous local times during DST gaps/overlaps | [disambiguation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime/from#disambiguation) |
| `offset` | `'use'`, `'ignore'`, `'reject'`, `'prefer'` | Parsed offset vs time zone rules | [offset](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime/from#offset) |

## Rounding (zoned)

Optional `rounding: { smallestUnit, roundingIncrement?, roundingMode? }` on zoned options.

Applied in `_maybeRoundZoned()` via [`Temporal.ZonedDateTime.round()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime/round) before:

- [`toLocaleString()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime/toLocaleString) display strings
- `toIso8601()` output ([`toString()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime/toString) / ISO 8601)

Not applied to raw `clone()` / internal picker math unless formatting paths run.

Example:

```typescript
provideZonedDateTimeAdapter({
  timezone: 'UTC',
  rounding: {smallestUnit: 'minute', roundingMode: 'halfExpand'},
}),
```

[`roundingMode` values on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/Duration/round#roundingmode)

## Locale and first day of week

- Locale comes from Angular [`MAT_DATE_LOCALE`](https://material.angular.io/components/datepicker/overview) when provided, else `getDefaultLocale()` from shared utils.
- `getFirstDayOfWeek()` uses `options.firstDayOfWeek` when set; otherwise derives from locale (Sunday = `0`, matching Material).
- Weekday **names** are generated from ISO dates in **January 2017** (days 1–7) for stable short/long labels across environments.
- Month and day **numeric names** use reference year **2017** in the configured **output** calendar via [`toLocaleString()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate/toLocaleString).

## `withCalendar` and dual-calendar pattern

- **`calendar`** — storage calendar id on [`PlainDate`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate) / [`PlainDateTime`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDateTime) / [`ZonedDateTime`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime) instances (`today()`, `createDate()`, parsing). See [`Intl` calendar ids](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat#calendar).
- **`outputCalendar`** — optional; when set, `format()` and label helpers call [`date.withCalendar(outputCalendar)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate/withCalendar) before `toLocaleString()`.

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

Plain-date `today()` uses [`Temporal.Now.plainDateISO()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/Now/plainDateISO) (environment instant).

## Polyfill

> **Rationale:** [design-rationale.md — BYO polyfill](./design-rationale.md#byo-temporal-polyfill)

`BaseTemporalAdapter` calls `ensureTemporalAvailable()` in the constructor. If `globalThis.Temporal` is undefined:

```
Temporal is not available. Import temporal-polyfill/global before using material-temporal-adapter.
```

The package lists **no** runtime dependency on a polyfill — you choose [`temporal-polyfill`](https://www.npmjs.com/package/temporal-polyfill) or [`@js-temporal/polyfill`](https://www.npmjs.com/package/@js-temporal/polyfill). Spec: [tc39.es/proposal-temporal](https://tc39.es/proposal-temporal/docs/).

## Parsing and deserialization

- **String parse failure** in `parse()` often yields an **invalid sentinel** (not `null`) so the field shows error state.
- **Empty string** deserializes to `null`.
- **Epoch milliseconds** outside ±8.64e15 produce an invalid sentinel for plain adapters.

## Extension

`BaseTemporalAdapter` is exported for advanced subclasses. Prefer the three official adapters for application use.

## Further reading

- [design-rationale.md](./design-rationale.md) — decision log (sentinels, split adapters, timezone, scope)
- [temporal-ecosystem.md](./temporal-ecosystem.md) — helper libraries vs Day.js gaps
