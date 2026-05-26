# SSR considerations

Angular Material date controls with Temporal adapters work in SSR when the **polyfill loads on the server** and **zoned adapters use an explicit time zone**.

> Setup: [quickstart.md](./quickstart.md) · Usage: [usage.md](./usage.md)

## Polyfill import order

`ensureTemporalAvailable()` runs when the first adapter is constructed. On the server, [`globalThis.Temporal`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal) must already exist.

**Do:**

```typescript
// main.server.ts (or a shared polyfills.server.ts imported first)
import 'temporal-polyfill/global';

import {bootstrapApplication} from '@angular/platform-browser';
import {providePlainDateAdapter} from '@kbrilla/material-temporal-adapter';
```

**Do not** rely on lazy `import()` of the polyfill after Material components instantiate — the adapter constructor will throw.

Mirror the same import in `main.ts` for the browser bundle so hydration sees the same global.

## Hydration

- Serialize form values as **ISO 8601 strings** (`adapter.toIso8601()` / [`Temporal.*.toString()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate/toString)) in transfer state when possible.
- On the client, `deserialize()` / `parse()` rebuild Temporal values using the same adapter options (`calendar`, `timezone`).
- Avoid comparing object identity across server and client; compare string or epoch representations.

Invalid sentinels (`isTemporalInvalid`) should not be written into transfer state — treat them as validation errors client-side only.

## Explicit time zone (required for zoned)

The community package **does not** default zoned adapters to the system zone ([`Temporal.Now.timeZoneId()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/Now/timeZoneId)). On the server there is often no meaningful “local” zone for the user.

Always configure:

```typescript
provideZonedDateTimeAdapter({
  timezone: 'UTC', // ZonedDateTime.timeZoneId — explicit IANA id
  calendar: 'iso8601',
}),
```

Map end-user zones in application logic (e.g. from a cookie or profile) before passing to `provideZonedDateTimeAdapter`.

## Locale

- `MAT_DATE_LOCALE` and adapter locale follow the same rules as native Material adapters.
- Provide locale on both server and client for consistent month/weekday labels via [`toLocaleString()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate/toLocaleString).
- `firstDayOfWeek` can be pinned in options when locale detection differs between server and client.

## Plain date / plain datetime on server

`PlainDateAdapter` and `PlainDateTimeAdapter` do not embed a time zone. `today()` uses [`Temporal.Now.plainDateISO()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/Now/plainDateISO) in the **environment’s** instant interpretation — ensure server clock is acceptable or avoid calling `today()` during SSR render if you need deterministic snapshots (inject a fixed date in tests and stories).

## Epoch deserialization

`_createFromEpochMs` for plain adapters converts via `Temporal.Now.timeZoneId()` when building from milliseconds. For deterministic SSR, prefer ISO strings over raw epoch in transferred state.

## Checklist

1. `import 'temporal-polyfill/global'` in server entry **before** bootstrap.
2. Same import in browser entry.
3. Zoned: `timezone` set explicitly (never omit).
4. Align `MAT_DATE_LOCALE` / `firstDayOfWeek` across server and client.
5. Transfer ISO strings, not invalid sentinels.

## See also

- [behavior-notes.md](./behavior-notes.md)
- [Package README](../packages/material-temporal-adapter/README.md) — quick start
