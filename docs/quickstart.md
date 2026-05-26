# Quick start

Get `@kbrilla/material-temporal-adapter` running with Angular Material datepicker in a standalone Angular app.

## 1. Install

```bash
pnpm add @kbrilla/material-temporal-adapter temporal-polyfill
# or: npm install / yarn add
```

Peer dependencies: `@angular/material`, `@angular/cdk`, `@angular/core` (18–20).

## 2. Load the Temporal polyfill first

Import the polyfill **before** Angular bootstraps. The adapter does not bundle Temporal — it expects the [Temporal global API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal).

```typescript
// main.ts
import 'temporal-polyfill/global';

import {bootstrapApplication} from '@angular/platform-browser';
import {AppComponent} from './app/app.component';
import {appConfig} from './app/app.config';

bootstrapApplication(AppComponent, appConfig);
```

For SSR, mirror this import in `main.server.ts` — see [ssr-considerations.md](./ssr-considerations.md).

## 3. Register one split adapter

Pick **exactly one** adapter for your app (or per lazy route). Each maps to a different Temporal type.

### Plain date (most common)

Use when the control stores [`Temporal.PlainDate`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate) — date only, no time zone.

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

### Plain date + time

Use when the control stores [`Temporal.PlainDateTime`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDateTime) — wall-clock date and time, no time zone.

```typescript
import {providePlainDateTimeAdapter} from '@kbrilla/material-temporal-adapter';

providers: [providePlainDateTimeAdapter()],
```

### Zoned date + time

Use when the control stores [`Temporal.ZonedDateTime`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime). **`timezone`** ([`timeZoneId`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime/timeZoneId)) **is required.**

```typescript
import {provideZonedDateTimeAdapter} from '@kbrilla/material-temporal-adapter';

providers: [
  provideZonedDateTimeAdapter({
    timezone: 'America/New_York',
    calendar: 'iso8601',
    overflow: 'reject', // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate/from#overflow
  }),
],
```

## 4. Import Material modules in your component

```typescript
import {Component} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';

@Component({
  selector: 'app-booking-date',
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
export class BookingDateComponent {
  /** Typed as Temporal.PlainDate when using providePlainDateAdapter(). */
  date = new FormControl<Temporal.PlainDate | null>(null);
}
```

## 5. Validate invalid picker values

Material may hold an invalid sentinel (not `null`) when parsing fails. Use `isTemporalInvalid()`:

```typescript
import {isTemporalInvalid} from '@kbrilla/material-temporal-adapter';

const value = this.date.value;
if (value !== null && isTemporalInvalid(value)) {
  // show "invalid date" error
}
```

## 6. Optional locale

```typescript
import {MAT_DATE_LOCALE} from '@angular/material/core';

providers: [
  ...providePlainDateAdapter(),
  {provide: MAT_DATE_LOCALE, useValue: 'de-DE'},
],
```

## Next steps

| Topic | Document |
| --- | --- |
| Forms, ranges, timepicker, custom formats | [usage.md](./usage.md) |
| Overflow, invalid sentinel, rounding | [behavior-notes.md](./behavior-notes.md) |
| Non-Gregorian calendars | [calendar-support.md](./calendar-support.md) |
| SSR / hydration | [ssr-considerations.md](./ssr-considerations.md) |
| Interactive examples with exact configs | [Live Storybook demo](https://kbrilla.github.io/material-temporal-adapter/) |
