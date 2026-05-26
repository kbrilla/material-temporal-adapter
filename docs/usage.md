# Usage guide

Production patterns for `@kbrilla/material-temporal-adapter` with Angular Material.

Temporal reference: [MDN — Temporal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal)

## Choose an adapter

| Use case | Adapter | FormControl type | Provider |
| --- | --- | --- | --- |
| Date only | `PlainDateAdapter` | [`Temporal.PlainDate`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate) | `providePlainDateAdapter(formats?, options?)` |
| Date + time, no zone | `PlainDateTimeAdapter` | [`Temporal.PlainDateTime`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDateTime) | `providePlainDateTimeAdapter(formats?, options?)` |
| Date + time + zone | `ZonedDateTimeAdapter` | [`Temporal.ZonedDateTime`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime) | `provideZonedDateTimeAdapter(options, formats?)` |

Register **one** `DateAdapter` implementation per injector tree. Do not mix adapters in the same component tree.

## Provider signatures

```typescript
// Plain date — formats optional, defaults to MAT_TEMPORAL_DATE_FORMATS
providePlainDateAdapter(formats?, options?)

// Plain date-time — defaults to MAT_TEMPORAL_DATETIME_FORMATS
providePlainDateTimeAdapter(formats?, options?)

// Zoned — options required (must include timezone), formats optional
provideZonedDateTimeAdapter(options, formats?)
```

### Options (all adapters)

Maps to Temporal [`from()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate/from) / [`withCalendar()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate/withCalendar) behavior:

```typescript
interface TemporalBaseOptions {
  calendar?: string;           // default 'iso8601' — see Intl calendar ids on MDN
  outputCalendar?: string;     // display via withCalendar() before toLocaleString()
  firstDayOfWeek?: number;     // 0 = Sunday … 6 = Saturday
  overflow?: 'reject' | 'constrain';  // default 'reject'
}
```

[`overflow` on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate/from#overflow)

### Zoned-only options

Forwarded to [`Temporal.ZonedDateTime.from()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime/from):

```typescript
interface ZonedDateTimeOptions extends TemporalBaseOptions {
  timezone: string;  // required IANA id — ZonedDateTime.timeZoneId
  disambiguation?: 'compatible' | 'earlier' | 'later' | 'reject';
  offset?: 'use' | 'ignore' | 'reject' | 'prefer';
  rounding?: {
    smallestUnit: 'minute' | 'second' | /* … */;
    roundingIncrement?: number;
    roundingMode?: 'ceil' | 'floor' | 'trunc' | 'halfExpand';
  };
}
```

| Option | MDN |
| --- | --- |
| `disambiguation` | [ZonedDateTime.from#disambiguation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime/from#disambiguation) |
| `offset` | [ZonedDateTime.from#offset](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime/from#offset) |
| `rounding` | [ZonedDateTime.round](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime/round) |

## Reactive forms

### Single date

```typescript
import {FormControl, Validators} from '@angular/forms';
import {isTemporalInvalid} from '@kbrilla/material-temporal-adapter';

date = new FormControl<Temporal.PlainDate | null>(null, {
  validators: [(c) => (c.value && isTemporalInvalid(c.value) ? {invalidDate: true} : null)],
});
```

### Date range

```typescript
import {FormGroup} from '@angular/forms';
import {MatDateRangeInput} from '@angular/material/datepicker';

range = new FormGroup({
  start: new FormControl<Temporal.PlainDate | null>(null),
  end: new FormControl<Temporal.PlainDate | null>(null),
});
```

Template (same for all adapters — types follow your provider):

```html
<mat-form-field>
  <mat-label>Enter a date range</mat-label>
  <mat-date-range-input [rangePicker]="picker">
    <input matStartDate [formControl]="range.controls.start" placeholder="Start" />
    <input matEndDate [formControl]="range.controls.end" placeholder="End" />
  </mat-date-range-input>
  <mat-datepicker-toggle matIconSuffix [for]="picker" />
  <mat-date-range-picker #picker />
</mat-form-field>
```

### Timepicker

Requires `PlainDateTimeAdapter` or `ZonedDateTimeAdapter`:

```typescript
providers: [providePlainDateTimeAdapter()],
```

```html
<mat-form-field>
  <mat-label>Time</mat-label>
  <input matInput [matTimepicker]="tp" [formControl]="time" />
  <mat-timepicker #tp />
</mat-form-field>
```

`PlainDateAdapter` does not support `setTime` — timepicker APIs throw or no-op.

## Custom display formats

Pass a `MatDateFormats` object as the first argument (plain / plain-datetime) or second argument (zoned). Display uses Temporal [`toLocaleString()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate/toLocaleString) under the hood:

```typescript
import {
  MAT_TEMPORAL_DATE_FORMATS,
  providePlainDateAdapter,
} from '@kbrilla/material-temporal-adapter';

const formats = {
  ...MAT_TEMPORAL_DATE_FORMATS,
  display: {
    ...MAT_TEMPORAL_DATE_FORMATS.display,
    dateInput: {year: 'numeric', month: 'long', day: 'numeric'},
  },
};

providers: [providePlainDateAdapter(formats)],
```

Exported defaults: `MAT_TEMPORAL_DATE_FORMATS`, `MAT_TEMPORAL_DATETIME_FORMATS`, `MAT_TEMPORAL_ZONED_FORMATS`.

## Calendar configuration

Store in ISO, display in Japanese ([`withCalendar`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate/withCalendar)):

```typescript
providePlainDateAdapter(undefined, {
  calendar: 'iso8601',
  outputCalendar: 'japanese',
}),
```

Full Japanese calendar storage:

```typescript
providePlainDateAdapter(undefined, {calendar: 'japanese'}),
```

Tested calendars and Hijri skip: [calendar-support.md](./calendar-support.md)

## Overflow behavior

Default `overflow: 'reject'` — invalid calendar dates throw in dev or become invalid sentinels.

Lenient mode for data entry:

```typescript
providePlainDateAdapter(undefined, {calendar: 'iso8601', overflow: 'constrain'}),
```

Details: [behavior-notes.md](./behavior-notes.md)

## Per-route providers

Lazy-load a feature with its own adapter:

```typescript
export const routes: Routes = [
  {
    path: 'scheduling',
    loadComponent: () => import('./scheduling.component'),
    providers: [
      provideZonedDateTimeAdapter({timezone: 'UTC'}),
    ],
  },
];
```

## Serialization

Prefer ISO strings for APIs and SSR transfer state:

```typescript
import {inject} from '@angular/core';
import {DateAdapter} from '@angular/material/core';

const adapter = inject(DateAdapter<Temporal.PlainDate>);
const iso = adapter.toIso8601(value); // wraps Temporal.toString() / ISO 8601
const restored = adapter.parse(iso);
```

Do not serialize invalid sentinels — check with `isTemporalInvalid()` first.

Why sentinels exist (and why not `null`): [design-rationale.md](./design-rationale.md#invalid-sentinels-the-ugly-objects). Helper libraries for formatting and app logic: [temporal-ecosystem.md](./temporal-ecosystem.md).

## Injection tokens (advanced)

| Token | Purpose |
| --- | --- |
| `MAT_TEMPORAL_PLAIN_DATE_OPTIONS` | Plain date adapter options |
| `MAT_TEMPORAL_PLAIN_DATETIME_OPTIONS` | Plain date-time adapter options |
| `MAT_TEMPORAL_ZONED_OPTIONS` | Zoned adapter options |
| `MAT_DATE_FORMATS` | Display/parse formats (Material) |
| `MAT_DATE_LOCALE` | Locale for labels (Material) |

## Public API summary

```typescript
// Adapters
PlainDateAdapter, PlainDateTimeAdapter, ZonedDateTimeAdapter

// Providers
providePlainDateAdapter, providePlainDateTimeAdapter, provideZonedDateTimeAdapter

// Options types
PlainDateOptions, PlainDateTimeOptions, ZonedDateTimeOptions

// Formats
MAT_TEMPORAL_DATE_FORMATS, MAT_TEMPORAL_DATETIME_FORMATS, MAT_TEMPORAL_ZONED_FORMATS

// Helpers
isTemporalInvalid

// Extension
BaseTemporalAdapter
```

## Interactive reference

Each Storybook story documents the **exact provider configuration** used in that demo:

**https://kbrilla.github.io/material-temporal-adapter/**
