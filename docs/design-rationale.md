# Design rationale

Why `@kbrilla/material-temporal-adapter` behaves the way it does. For behavior details see [behavior-notes.md](./behavior-notes.md); for usage see [usage.md](./usage.md).

## Invalid sentinels (the “ugly” objects)

### What they are

When parsing or calendar math fails, adapters may return a **branded plain object** (not a real `Temporal.PlainDate`) with:

- `_invalid: true`
- `year`, `month`, `day` (and time fields) set to **`NaN`**
- `monthCode: 'MNaN'`

Detect with `isTemporalInvalid(value)`. Real dates are normal `Temporal.*` instances from your polyfill.

### Why not `null`?

| Value | Meaning in Material |
| --- | --- |
| `null` | **Empty** — user cleared the field; optional inputs, “no date selected” |
| `invalid()` | **Invalid but non-empty** — user typed `32/13/2025`, partial input failed parse, or arithmetic produced an impossible date |

Angular Material’s `DateAdapter` contract requires both:

1. **`abstract invalid(): D`** — “Gets date instance that is not valid” ([Material `DateAdapter`](https://material.angular.io/components/datepicker/overview))
2. **`isValid(date)`** returns `false` for that value
3. **`isDateInstance(obj)`** returns `true` for it — the control keeps a single type `D`, not `D | null | undefined | Error`

The built-in **`NativeDateAdapter`** uses the same idea: `invalid()` returns `new Date(NaN)`. That is also an “ugly” sentinel — it is not `null`, but every getter returns `NaN` and `isValid()` is false.

Temporal has **no** spec equivalent of `Invalid PlainDate`. The proposal is strict: failed `from()` throws; there is no first-class invalid Temporal value. So this package follows Material + NativeDateAdapter and uses a **fake Temporal-shaped object** cast to `D`.

### Why not throw on bad input?

Throwing from `parse()` during keystrokes would break the datepicker input pipeline. Material expects `parse()` to return a value `isValid()` can reject while the user keeps editing.

### Could we use `null` for invalid instead?

Only if Material treated “parse failed” as empty. It does not — conflating **invalid** with **empty** breaks:

- Required field validation (invalid input is not the same as “no value”)
- Error styling while the input still shows the user’s text
- `deserialize()` of bad ISO strings (empty string → `null`, malformed string → invalid)

### Trade-offs (we accept these)

- **Type lie:** `FormControl<Temporal.PlainDate | null>` may hold a non-Temporal object. Use `isTemporalInvalid()` or `adapter.isValid()`.
- **No `instanceof Temporal.PlainDate` alone:** Check validity before calling Temporal methods.
- **Serialization:** Never persist sentinels — treat as validation errors; store ISO strings or `null`.

### What you should do in app code

```typescript
import {DateAdapter} from '@angular/material/core';
import {isTemporalInvalid} from '@kbrilla/material-temporal-adapter';

const v = control.value;
if (v === null) {
  // empty
} else if (isTemporalInvalid(v) || !adapter.isValid(v)) {
  // invalid entry — show mat-error
} else {
  // real Temporal.PlainDate
}
```

See [behavior-notes.md — Invalid sentinel](./behavior-notes.md#invalid-sentinel) and Storybook **Invalid Handling**.

---

## Split adapters (PlainDate / PlainDateTime / ZonedDateTime)

**Decision:** Ship three adapters; drop unified `TemporalDateAdapter` from the upstream PR.

**Rationale:**

- Temporal separates **plain** vs **zoned** types on purpose. One adapter hiding three storage shapes caused type confusion.
- `PlainDateAdapter` cannot support timepicker (`setTime` throws) — forcing a single adapter hid bugs until runtime.
- Per-route `providers: [provideZonedDateTimeAdapter(...)]` is clearer than a `mode` flag.

---

## Required `timezone` (zoned adapter)

**Decision:** `provideZonedDateTimeAdapter({ timezone: '...' })` — no default from `Temporal.Now.timeZoneId()`.

**Rationale:**

- SSR and CI have no meaningful user zone; implicit “system zone” caused flaky tests and wrong `today()`.
- Explicit zone matches backend storage (often UTC) and user profile zones applied in app logic.

---

## Default `overflow: 'reject'`

**Decision:** Default calendar arithmetic overflow is `'reject'`, not `'constrain'`.

**Rationale:**

- Matches Temporal’s strict-by-default philosophy and surfaces bad data in development.
- Material pickers often prefer `'constrain'` for free-text entry — opt in via adapter options.

---

## BYO Temporal polyfill

**Decision:** No polyfill bundled; `ensureTemporalAvailable()` throws if `globalThis.Temporal` is missing.

**Rationale:**

- Lets apps choose `temporal-polyfill` vs `@js-temporal/polyfill` and control bundle size.
- Polyfill must load before adapter construction (see [ssr-considerations.md](./ssr-considerations.md)).

---

## `isTemporalInvalid()` exported from this package

**Decision:** Material-specific helper lives here, not in generic Temporal utility libraries.

**Rationale:**

- Sentinels are an **adapter/Material contract**, not part of the Temporal spec.
- Generic validators ([temporal-kit](https://github.com/KristjanESPERANTO/temporal-kit), etc.) operate on real Temporal values; they do not know about `_invalid`.

---

## Reference year 2017 for month/weekday labels

**Decision:** Month and weekday name helpers use fixed reference dates in **2017**.

**Rationale:**

- Stable labels across environments and test snapshots (upstream PR moved from 2024 to 2017 for the same reason).
- Formatting still uses [`toLocaleString()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate/toLocaleString) with the configured output calendar.

---

## No `MAT_BASE_TEMPORAL_OPTIONS` / unified options token

**Decision:** Per-adapter injection tokens only (`MAT_TEMPORAL_PLAIN_DATE_OPTIONS`, etc.).

**Rationale:**

- Options differ (zoned requires `timezone`; plain date does not).
- Avoids hidden global config that breaks lazy routes with different adapters.

---

## Community package scope

**Decision:** Adapters + invalid helpers + docs/demo — not validators, not token formatting, not Day.js-style utilities.

**Rationale:**

- Material integration is already a focused surface.
- Ergonomic gaps vs Day.js are better filled by [ecosystem libraries](./temporal-ecosystem.md) that work on the same Temporal objects.

---

## Related

- [behavior-notes.md](./behavior-notes.md) — locked behavior
- [temporal-ecosystem.md](./temporal-ecosystem.md) — helper libraries
- [calendar-support.md](./calendar-support.md) — Hijri test skip rationale
