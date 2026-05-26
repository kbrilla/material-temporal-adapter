# Migration from Angular Components PR #32668

This guide maps symbols and patterns from the in-repo prototype (`@angular/material-temporal-adapter` on branch `temporal-adapter-25753`) to the community package **`@kbrilla/material-temporal-adapter`**.

## Package and imports

| PR / prototype | Community package |
| --- | --- |
| `@angular/material-temporal-adapter` | `@kbrilla/material-temporal-adapter` |
| `@angular/material-temporal-adapter/split` | Same entry point — no `/split` subpath |
| Google license header | MIT — Krzysztof Brilla |

## Adapters and modules (removed)

| PR symbol | Community replacement |
| --- | --- |
| `TemporalDateAdapter` | **Removed** — pick `PlainDateAdapter`, `PlainDateTimeAdapter`, or `ZonedDateTimeAdapter` |
| `provideTemporalDateAdapter()` | **Removed** |
| `MatTemporalModule`, `TemporalModule` | **Removed** — use `provide*Adapter()` only |
| `PlainTemporalAdapter` | **Removed** — use `PlainDateAdapter` or `PlainDateTimeAdapter` |
| `providePlainTemporalAdapter(formats, { mode })` | `providePlainDateAdapter(...)` when `mode: 'date'`; `providePlainDateTimeAdapter(...)` when `mode: 'datetime'` |
| `MAT_PLAIN_TEMPORAL_ADAPTER_OPTIONS` | `MAT_TEMPORAL_PLAIN_DATE_OPTIONS` or `MAT_TEMPORAL_PLAIN_DATETIME_OPTIONS` |
| `PlainTemporalType` / `mode: 'date' \| 'datetime'` | Separate adapter classes — no mode flag |

## Split adapters (renamed tokens / formats)

| PR symbol | Community symbol |
| --- | --- |
| `PlainDateAdapter` | `PlainDateAdapter` (unchanged) |
| `PlainDateTimeAdapter` | `PlainDateTimeAdapter` (unchanged) |
| `ZonedDateTimeAdapter` | `ZonedDateTimeAdapter` (unchanged) |
| `providePlainDateAdapter` | `providePlainDateAdapter` — if only present on `/split` in PR, import from package root |
| `providePlainDateTimeAdapter` | `providePlainDateTimeAdapter` |
| `provideZonedDateTimeAdapter(formats?, options?)` | `provideZonedDateTimeAdapter(options, formats?)` — **argument order reversed**; `options.timezone` **required** |
| `MAT_PLAIN_DATE_FORMATS` | `MAT_TEMPORAL_DATE_FORMATS` |
| `MAT_PLAIN_DATETIME_FORMATS` | `MAT_TEMPORAL_DATETIME_FORMATS` |
| `MAT_ZONED_DATETIME_FORMATS` | `MAT_TEMPORAL_ZONED_FORMATS` |
| `MAT_ZONED_DATETIME_OPTIONS` | `MAT_TEMPORAL_ZONED_OPTIONS` |
| `ZonedDateTimeAdapterOptions` | `ZonedDateTimeOptions` |
| `MAT_BASE_TEMPORAL_OPTIONS` | **Removed** — options live on per-adapter tokens |
| `MAT_TEMPORAL_DATE_ADAPTER_OPTIONS` | Per-adapter: `MAT_TEMPORAL_PLAIN_DATE_OPTIONS`, etc. |
| `MAT_TEMPORAL_DATE_FORMATS` (unified) | `MAT_TEMPORAL_DATE_FORMATS` (plain date defaults) |

## Options and behavior changes

| PR behavior | Community v0.1 |
| --- | --- |
| Zoned `timezone` optional, defaults to system zone | `timezone: string` **required**; adapter throws if missing |
| `provideZonedDateTimeAdapter()` with no args | Must pass `{ timezone: 'UTC' }` (or your zone) |
| Shared `MAT_BASE_TEMPORAL_OPTIONS` injection | Each adapter injects its own token |
| `BaseTemporalAdapter` public + shared token | `BaseTemporalAdapter` exported for extension; no shared options token |
| Inline invalid objects | `createInvalidPlainDate*`, `isTemporalInvalid()` from package |
| Polyfill bundled / assumed in Material | **BYO** — import `temporal-polyfill/global` (or `@js-temporal/polyfill`) before bootstrap |
| Reference year 2024 in month/day name helpers | Reference year **2017** (stable Intl labels) |
| `_formatWithLocale` string calendar branch | Always `date.withCalendar(outputCalendar)` |
| Schematics (`ng add`) | **Not shipped** in community package |

## File layout (source port)

| PR path | Community path |
| --- | --- |
| `src/material-temporal-adapter/adapter/split/plain-date-adapter.ts` | `src/plain-date/plain-date-adapter.ts` |
| `src/material-temporal-adapter/adapter/split/plain-datetime-adapter.ts` | `src/plain-datetime/plain-datetime-adapter.ts` |
| `src/material-temporal-adapter/adapter/split/zoned-datetime-adapter.ts` | `src/zoned-datetime/zoned-datetime-adapter.ts` |
| `adapter/split/base-temporal-adapter.ts` | `src/shared/base-temporal-adapter.ts` |
| `adapter/temporal-date-adapter.ts` | **Not ported** |
| `adapter/split/plain-temporal-adapter.ts` | **Not ported** |
| `schematics/**` | **Not ported** |

## Example: PR unified → community split

**PR (unified, deprecated in package):**

```typescript
import {provideTemporalDateAdapter} from '@angular/material-temporal-adapter';

providers: [provideTemporalDateAdapter()],
```

**Community (plain date):**

```typescript
import 'temporal-polyfill/global';
import {providePlainDateAdapter} from '@kbrilla/material-temporal-adapter';

providers: [providePlainDateAdapter()],
```

## Example: PR PlainTemporal → community split

**PR:**

```typescript
import {providePlainTemporalAdapter, MAT_PLAIN_DATE_FORMATS} from '@angular/material-temporal-adapter/split';

providers: [providePlainTemporalAdapter(MAT_PLAIN_DATE_FORMATS, {mode: 'date'})],
```

**Community:**

```typescript
import {providePlainDateAdapter, MAT_TEMPORAL_DATE_FORMATS} from '@kbrilla/material-temporal-adapter';

providers: [providePlainDateAdapter(MAT_TEMPORAL_DATE_FORMATS, {calendar: 'iso8601'})],
```

## Example: PR zoned provider signature

**PR:**

```typescript
provideZonedDateTimeAdapter(MAT_ZONED_DATETIME_FORMATS, {timezone: 'UTC'});
```

**Community:**

```typescript
provideZonedDateTimeAdapter({timezone: 'UTC'}, MAT_TEMPORAL_ZONED_FORMATS);
```

## Demo and docs

| Resource | PR era | Community |
| --- | --- | --- |
| Reference Storybook | [temporal-adapter-demo](https://github.com/kbrilla/temporal-adapter-demo) | `apps/demo` in this repo |
| Hosted demo | kbrilla.github.io/temporal-adapter-demo | kbrilla.github.io/material-temporal-adapter (GitHub Pages, pending) |

## Issue and PR pointers

- Upstream PR: https://github.com/angular/components/pull/32668
- Tracking issue: https://github.com/angular/components/issues/25753
- Community package issues: https://github.com/kbrilla/material-temporal-adapter/issues
