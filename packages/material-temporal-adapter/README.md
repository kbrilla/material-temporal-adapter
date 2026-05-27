# @kbrilla/material-temporal-adapter

Temporal API `DateAdapter` implementations for Angular Material datepicker, timepicker, and date-range controls.

> **Community-maintained.** Not part of Angular or the Angular Material team. Extracted from [angular/components#32668](https://github.com/angular/components/pull/32668). MIT license.

## Requirements

- Angular Material **18–20** (`@angular/material`, `@angular/cdk`, `@angular/core`)
- A **Temporal polyfill** loaded before any adapter is constructed
- Node **20+** for development in this monorepo

## Quick start

### Install

```bash
pnpm add @kbrilla/material-temporal-adapter temporal-polyfill
```

### Polyfill (required, first import)

```typescript
// main.ts
import 'temporal-polyfill/global';

import {bootstrapApplication} from '@angular/platform-browser';
import {appConfig} from './app/app.config';
import {AppComponent} from './app/app.component';

bootstrapApplication(AppComponent, appConfig);
```

### Register an adapter

```typescript
// app.config.ts
import {ApplicationConfig} from '@angular/core';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import {providePlainDateAdapter} from '@kbrilla/material-temporal-adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimationsAsync(),
    providePlainDateAdapter(),
  ],
};
```

### Component + template

```typescript
import {Component} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {isTemporalInvalid} from '@kbrilla/material-temporal-adapter';

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule],
  template: `
    <mat-form-field>
      <mat-label>Date</mat-label>
      <input matInput [matDatepicker]="picker" [formControl]="date" />
      <mat-datepicker-toggle matIconSuffix [for]="picker" />
      <mat-datepicker #picker />
    </mat-form-field>
  `,
})
export class AppComponent {
  date = new FormControl<Temporal.PlainDate | null>(null);

  isInvalid(): boolean {
    const v = this.date.value;
    return v !== null && isTemporalInvalid(v);
  }
}
```

Extended guides: [docs/quickstart.md](../../docs/quickstart.md) · [docs/usage.md](../../docs/usage.md)

## Adapters

| Adapter | Type | Provider | Notes |
| --- | --- | --- | --- |
| `PlainDateAdapter` | [`Temporal.PlainDate`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate) | `providePlainDateAdapter(formats?, options?)` | No time; `setTime` throws |
| `PlainDateTimeAdapter` | [`Temporal.PlainDateTime`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDateTime) | `providePlainDateTimeAdapter(formats?, options?)` | Timepicker supported |
| `ZonedDateTimeAdapter` | [`Temporal.ZonedDateTime`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime) | `provideZonedDateTimeAdapter(options, formats?)` | **`timezone` required** |

### Plain date + time (no zone)

```typescript
import {providePlainDateTimeAdapter} from '@kbrilla/material-temporal-adapter';

providers: [providePlainDateTimeAdapter()],
```

### Zoned date + time

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

There is **no** system-time-zone fallback. Pass `'UTC'` explicitly when needed.

### Non-Gregorian calendar

```typescript
providePlainDateAdapter(undefined, {
  calendar: 'hebrew',
  outputCalendar: 'hebrew',
}),
```

### Custom formats

```typescript
import {MAT_TEMPORAL_DATE_FORMATS, providePlainDateAdapter} from '@kbrilla/material-temporal-adapter';

providePlainDateAdapter({
  ...MAT_TEMPORAL_DATE_FORMATS,
  display: {
    ...MAT_TEMPORAL_DATE_FORMATS.display,
    dateInput: {year: 'numeric', month: 'long', day: 'numeric'},
  },
}),
```

Default format tokens: `MAT_TEMPORAL_DATE_FORMATS`, `MAT_TEMPORAL_DATETIME_FORMATS`, `MAT_TEMPORAL_ZONED_FORMATS`.

## Parsing

`adapter.parse(value, parseFormat?)` accepts string values in **ISO 8601** only —
the format the Temporal API itself accepts. The `parseFormat` argument exists to
satisfy Material's `DateAdapter<D>` contract but is ignored, because the Temporal
proposal deliberately has no format-string parser (`Intl` provides formatting but
not reverse-parsing).

For custom input formats (e.g. `DD/MM/YYYY`):
- Pre-parse the string in your component with your preferred library
- Pass the resulting `Temporal.*` value through `FormControl.setValue` directly

This matches `NativeDateAdapter`'s behavior with non-ISO input.

## Options reference

Shared options (`PlainDateOptions`, `PlainDateTimeOptions`, `ZonedDateTimeOptions`):

| Option | Default | Description |
| --- | --- | --- |
| `calendar` | `'iso8601'` | Storage calendar id |
| `outputCalendar` | same as `calendar` | Display calendar via `withCalendar()` |
| `firstDayOfWeek` | from locale | `0` = Sunday … `6` = Saturday |
| `overflow` | `'reject'` | `'constrain'` for lenient entry |

Zoned-only:

| Option | Description |
| --- | --- |
| `timezone` | **Required** IANA zone |
| `disambiguation` | DST gap/overlap: `'compatible'`, `'earlier'`, `'later'`, `'reject'` |
| `offset` | `'use'`, `'ignore'`, `'reject'`, `'prefer'` |
| `rounding` | `{ smallestUnit, roundingIncrement?, roundingMode? }` |

## Invalid values

Material requires a non-`null` **invalid** value when parse fails (same idea as `NativeDateAdapter`’s `new Date(NaN)`). Temporal has no invalid `PlainDate` in the spec, so adapters use branded sentinels — **not the same as empty (`null`)**.

```typescript
import {isTemporalInvalid} from '@kbrilla/material-temporal-adapter';

if (control.value !== null && isTemporalInvalid(control.value)) {
  // invalid sentinel — NaN fields, _invalid: true
}
```

| Value | Meaning |
| --- | --- |
| `null` | Empty field |
| Sentinel | Invalid but non-empty input |
| Real `Temporal.*` | Valid |

**Why:** [docs/design-rationale.md](../../docs/design-rationale.md#invalid-sentinels-the-ugly-objects) · **Behavior:** [docs/behavior-notes.md](../../docs/behavior-notes.md#invalid-sentinel)

## Temporal ecosystem (not this package)

For token formatting, relative dates, and app helpers see [docs/temporal-ecosystem.md](../../docs/temporal-ecosystem.md). `isTemporalInvalid()` stays here — it is Material/adapter-specific, not a generic Temporal utility.

## Removed from upstream PR

Do not look for these — use split adapters instead:

- `TemporalDateAdapter`, `provideTemporalDateAdapter()`
- `PlainTemporalAdapter`, `providePlainTemporalAdapter()`
- `MatTemporalModule`, `MAT_BASE_TEMPORAL_OPTIONS`

Upstream PR for context: [angular/components#32668](https://github.com/angular/components/pull/32668).

## Documentation

| Doc | Description |
| --- | --- |
| [docs/quickstart.md](../../docs/quickstart.md) | Step-by-step setup |
| [docs/usage.md](../../docs/usage.md) | Forms, ranges, timepicker, serialization |
| [docs/behavior-notes.md](../../docs/behavior-notes.md) | Overflow, rounding, locale |
| [docs/design-rationale.md](../../docs/design-rationale.md) | Why sentinels, split adapters, scope |
| [docs/temporal-ecosystem.md](../../docs/temporal-ecosystem.md) | temporal-kit, tempo, Day.js gaps |
| [docs/calendar-support.md](../../docs/calendar-support.md) | Calendar matrix |
| [docs/ssr-considerations.md](../../docs/ssr-considerations.md) | Server rendering |

## Demo

Live Storybook with exact provider configs per story:

**https://kbrilla.github.io/material-temporal-adapter/**

## License

MIT — Copyright Krzysztof Brilla. See [LICENSE](./LICENSE).
