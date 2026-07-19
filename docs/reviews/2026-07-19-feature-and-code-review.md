# Feature & code review: `@kbrilla/material-temporal-adapter` v0.2.0

**Date:** 2026-07-19  
**Reviewed commit:** `5ba760e227e50a15d7ece23ec70826728dc40005` (`main` / `origin/main` at review time)  
**Package:** `@kbrilla/material-temporal-adapter@0.2.0`  
**Reviewer context:** Cross-checked against Angular Material `DateAdapter` / `NativeDateAdapter` (raw sources from `angular/components` `main` as of 2026-07-19), TC39 Temporal docs / MDN + `temporal-polyfill@0.3.2` runtime checks, and this repo’s own docs, demo, and tests.

**Verification run locally:**

| Command | Result |
| --- | --- |
| `pnpm test` | **163 passed**, 1 skipped (islamic) |
| `pnpm test:cov` | **90.82%** stmts / **88.44%** branches / **94%** funcs (thresholds met) |
| `pnpm build` | **OK** (ng-packagr) |
| `pnpm lint` | **No-op** — no package defines a `lint` script |

---

## 0. Executive summary

This is a **solid, purposeful community adapter**: split Temporal types, honest invalid-sentinel design, required zoned timezone, and generally careful mapping of Material’s 0-based months / Sunday-based weekdays onto Temporal’s 1-based months / Monday-based `dayOfWeek`. Docs are unusually thorough for a v0.x library.

It is **not** production-safe with default options, and not as docs/demo/CI-honest as claimed.

| Severity | Count | Themes |
| --- | --- | --- |
| **Critical** | 3 | **(C0)** default `overflow: 'reject'` makes Material month/year navigation throw; **(C1)** sentinel `clone`/`deserialize` crash; **(C2)** false e2e/lint claims |
| **Important** | 12 | Docs/API serialization ambiguity; calendar matrix overclaim; fake integration tests; Storybook/DST demo gaps; rounding types; etc. |
| **Minor** | 10 | Dead code, argument-order footgun, shallow type tests, stale version notes |

**Verdict:** Change package default `overflow` to Temporal’s **`constrain`**, and stop duplicating range checks that ignore that knob (see §3.3 / §4.1). Until then, default `'reject'` makes Material month/year navigation throw (**C0**). Sentinel `deserialize`/`clone` (**C1**) and false e2e/lint claims (**C2**) remain blockers for “complete” claims.

**How to fix:** Concrete patch plans (repo-only vs optional Material issue) are in [§20](#20-fix-plans-how-to-address-findings).

**Upstream:** Since v0.2.0 (2026-05-27), Material **DateAdapter method surface is unchanged** through 20.x / `main`, but npm latest is **Angular/Material 22** while peers are still `>=18 <21` — packaging lag, not missing methods. Official Temporal PR [#32668](https://github.com/angular/components/pull/32668) remains open/dirty; maintainers steered to a community adapter. Details: [§16](#16-upstream-material-drift-since-this-repos-last-update). Edge-case matrix: [§17](#17-edge-case-matrix-verified-2026-07-19).

> **Peer-review note:** A second independent review (2026-07-19) correctly identified C0 as A-1. That finding was initially under-weighted here; it is now Critical after verifying Material call sites + Temporal `RangeError`. Full adjudication: [§15](#15-adjudication-of-peer-review-claims-2026-07-19).

---

## 1. Scope & methodology

### Reviewed surfaces

1. Library: `packages/material-temporal-adapter/src/**`
2. Docs: `docs/*.md`, package + root READMEs, CONTRIBUTING, CHANGELOG
3. Demo: `apps/demo` Storybook stories, MDX, providers
4. Tests + CI: Vitest suite, workflows, coverage config
5. External contracts:
   - Material [`DateAdapter`](https://github.com/angular/components/blob/main/src/material/core/datetime/date-adapter.ts)
   - Material [`NativeDateAdapter`](https://github.com/angular/components/blob/main/src/material/core/datetime/native-date-adapter.ts)
   - TC39 / MDN Temporal (`PlainDate` / `PlainDateTime` / `ZonedDateTime` `from`, `add`, `overflow`, `round`, `disambiguation`, `offset`)

### What “precise” means here

Each finding cites **file:line**, contrasts with **Material or Temporal text**, and states whether the issue is a **bug**, **doc falsehood**, **intentional divergence**, or **gap**.

---

## 2. Architecture & feature review

### 2.1 Intended product

Three `DateAdapter<D>` implementations:

| Adapter | `D` | Provider | Timepicker |
| --- | --- | --- | --- |
| `PlainDateAdapter` | `Temporal.PlainDate` | `providePlainDateAdapter(formats?, options?)` | No (`setTime` throws) |
| `PlainDateTimeAdapter` | `Temporal.PlainDateTime` | `providePlainDateTimeAdapter(formats?, options?)` | Yes |
| `ZonedDateTimeAdapter` | `Temporal.ZonedDateTime` | `provideZonedDateTimeAdapter(options, formats?)` | Yes; **`timezone` required** |

Shared base: `BaseTemporalAdapter` — calendar getters, names, arithmetic, format, partial deserialize.

This split matches Temporal’s type model better than a unified “mode” adapter. **Good decision** (documented in `docs/design-rationale.md`).

### 2.2 Public API (`public-api.ts`)

Exported and accurate relative to source:

- Adapters + `BaseTemporalAdapter`
- Three `provide*` helpers
- Options types + injection tokens
- Format constants
- `isTemporalInvalid`
- Shared Temporal option types

Intentionally **not** public: `createInvalid*`, polyfill helpers, `range` / locale utils. Correct — apps should not construct sentinels.

**Removed from upstream PR** (`TemporalDateAdapter`, `MatTemporalModule`, etc.) is clearly documented. Good.

### 2.3 Feature completeness vs Material datepicker / timepicker

| Material need | Status |
| --- | --- |
| Calendar grid (`getYear/Month/Date`, names, `getNumDaysInMonth`, `addCalendar*`) | Implemented |
| `createDate` / `today` / `clone` / `parse` / `format` / `deserialize` / `toIso8601` | Implemented (with caveats below) |
| `invalid` / `isValid` / `isDateInstance` | Implemented via sentinels |
| Time APIs for timepicker | PlainDateTime + Zoned: yes; PlainDate: deliberate stubs |
| Locale / first day of week | Implemented |
| Non-Gregorian calendars | Forwarded to Temporal; matrix shallow |
| Custom parse format strings | Explicitly out of scope (ISO only) |

### 2.4 Options model

`TemporalBaseOptions`: `calendar`, `outputCalendar`, `firstDayOfWeek`, `overflow` — correctly forwarded to Temporal `from` / `add` / `withCalendar`.

Zoned adds `timezone` (required), `disambiguation`, `offset`, `rounding`. Values match MDN enums for disambiguation/offset. Rounding mode type is a **subset** of Temporal (see §5).

Default `overflow: 'reject'` is a **deliberate package default**, not Temporal’s default (Temporal defaults to `'constrain'`). See §5.1 and §6.4.

---

## 3. Material `DateAdapter` contract compliance

Source of truth: `angular/components` `src/material/core/datetime/date-adapter.ts` and `native-date-adapter.ts`.

### 3.1 Indexing conventions — **CORRECT**

| Concept | Material | Temporal | Adapter |
| --- | --- | --- | --- |
| Month | 0–11 (Gregorian) | 1–`monthsInYear` | `getMonth` → `date.month - 1`; `createDate` adds `+ 1` |
| Day of week | 0 = Sunday | `dayOfWeek` 1 = Monday … 7 = Sunday | `7 → 0` in `getDayOfWeek` / `getFirstDayOfWeek` |
| Weekday names | Sunday-first array | — | Jan 1–7 **2017** ISO (Sun-first) — same trick as NativeDateAdapter |

`BaseTemporalAdapter` lines 40–51, 88–104, 114–121 match Material’s expected indices.

### 3.2 `invalid()` / `isDateInstance` / `isValid` — **CORRECT INTENT, FRAGILE IMPLEMENTATION**

Material requires:

1. `invalid(): D` that is not valid
2. `isDateInstance(invalid)` === true
3. Distinct from `null` (empty)

NativeDateAdapter uses `new Date(NaN)`. Temporal has no invalid value → branded objects with `_invalid: true`. Design is sound and well-documented.

**Bug (C1):** Plain adapters treat sentinels as date instances, then `clone` / `parse` call `Temporal.*.from(date.toString())`. On a plain object, `toString()` is `"[object Object]"` → **throws** (`Cannot parse: [object Object]`).

```22:24:packages/material-temporal-adapter/src/plain-date/plain-date-adapter.ts
  clone(date: Temporal.PlainDate): Temporal.PlainDate {
    return Temporal.PlainDate.from(date.toString());
  }
```

```151:157:packages/material-temporal-adapter/src/shared/base-temporal-adapter.ts
  override deserialize(value: unknown): T | null {
    if (value == null || value === "") {
      return null;
    }
    if (this.isDateInstance(value)) {
      return this.clone(value); // ← no isValid gate (unlike Material base)
    }
```

##### Does `isValid` always run first? **No — not before `deserialize`/`clone`**

Material’s **base** `DateAdapter.deserialize` gates with `isDateInstance && isValid` and never clones invalids:

```typescript
// DateAdapter.deserialize (Material) — safe
if (value == null || (this.isDateInstance(value) && this.isValid(value))) {
  return value;
}
return this.invalid();
```

This package **overrides** that and clones any `isDateInstance` value. Material call sites then do:

```typescript
// datepicker-input-base._assignValueProgrammatically
value = this._dateAdapter.deserialize(value);           // runs FIRST
this._lastValueValid = this._isValidValue(value);
value = this._dateAdapter.getValidDateOrNull(value);    // too late if deserialize threw

// validators / calendar inputs
getValidDateOrNull(this._dateAdapter.deserialize(control.value))
```

`getValidDateOrNull` / `_isValidValue` only see the **result** of `deserialize`. They do **not** protect against a throw inside `deserialize` → `clone`.

**Concrete path that reaches the throw:**

1. User types garbage → `parse("…")` returns `invalid()` sentinel (no throw).
2. That sentinel is stored on the `FormControl` / CVA (Material keeps invalid values for `matDatepickerParse`).
3. Later: `writeValue` / min-max / validator / `@Input()` setter calls `deserialize(control.value)` on that sentinel.
4. `isDateInstance(sentinel) === true` → `clone` → `Temporal.PlainDate.from("[object Object]")` → **throws**.

Also reachable from app code: `adapter.clone(ctrl.value)`, `adapter.parse(sentinel)`, `adapter.deserialize(sentinel)` after a failed parse. Zoned throws earlier via `_assertZoned` (clearer message, still a throw).

##### Better solution for C1 (preferred over ad-hoc `if`s)

**Root cause:** This package’s `deserialize` diverges from Material’s contract (“return valid instance or invalid/null — never throw”), and `clone` assumes a real Temporal value.

**Proposed design (layered):**

1. **Contract layer (required):** Make `BaseTemporalAdapter.deserialize` match Material base semantics:
   ```ts
   override deserialize(value: unknown): T | null {
     if (value == null || value === '') return null;
     if (this.isDateInstance(value)) {
       return this.isValid(value) ? this._cloneValid(value) : this.invalid();
     }
     // string / number / else → existing paths (never throw)
   }
   ```
2. **Single choke-point for Temporal ops:** private `_cloneValid(date: T): T` / `_requireValid(date: T): T` used by `clone`, `format`, `setTime`, `toIso8601`. Sentinels never reach `Temporal.*.from` / `.with` / `.toString()` expectations.
3. **`clone` public API:** `isTemporalInvalid(date) || !isValid(date) ? this.invalid() : this._cloneValid(date)`. Prefer `Temporal.PlainDate.from(date)` (object accept) over `from(date.toString())` for valid values.
4. **Do not** invent a cleverer sentinel (Proxy / fake `toString`) — Material requires `isDateInstance(invalid) === true` and `isValid === false`; the fix is to **honor Material’s deserialize/clone contract**, not to make sentinels look like Temporal.
5. **Optional hardening:** unit test that simulates Material’s `_assignValueProgrammatically` (deserialize → getValidDateOrNull) with a sentinel already on the control — must not throw.

Keep C1 Critical until (1)+(2) land.

### 3.3 Time APIs — **MOSTLY ALIGNED**, with intentional PlainDate divergence

| Method | NativeDateAdapter | PlainDate | PlainDateTime / Zoned |
| --- | --- | --- | --- |
| `getHours/Minutes/Seconds` | real | always `0` | real |
| `setTime` | validates + sets | **throws** | validates + sets |
| `parseTime` | regex + locale strip | `invalid()` | regex + `PlainTime.from` |
| `addSeconds` | epoch ms math | **no-op** | `date.add({seconds})` |

PlainDate stubs are documented and appropriate for date-only usage.

##### Manual checks inventory — where we overstretch vs `overflow`

| Location | What we do today | Why it was added (likely) | Revised direction |
| --- | --- | --- | --- |
| `createDate` month/day pre-checks (`ngDevMode` + `overflow==='reject'`) | Throw Material-shaped “Invalid month index” before Temporal | Copy **NativeDateAdapter.createDate** (`month < 0 \|\| month > 11`, then post-check month overflow) for Material 0-based API messages | Prefer **Temporal.from(..., { overflow: this._overflow })** only; on `RangeError` in reject mode, optionally rethrow a Material-shaped message in `catch`. Drop the *pre*-checks that duplicate Temporal. |
| `createDate` catch → throw vs `invalid()` | Dev+reject rethrows; else sentinel | Native always throws in dev for bad civil dates; Material parse path needs non-throwing invalid for inputs | Keep catch→`invalid()` for adapter parse ergonomics; don’t pre-validate. |
| `setTime` 0–23 / 0–59 + `Number.isFinite` (PlainDateTime + Zoned) | Manual throw (dev) / `invalid()` (prod); **`with`/`from` called without `overflow`** | Copy **NativeDateAdapter.setTime** ngDevMode `inRange` checks ([#29799](https://github.com/angular/components/pull/29799)) | **Remove manual range checks.** Pass `{ overflow: this._overflow }` into `with` / `ZonedDateTime.from`. Catch `RangeError` → `invalid()` (or rethrow in dev if you want Native-like messages). That is what `overflow` is for. |
| `parseTime` hours/minutes/seconds ≤23/59 before `setTime` | Duplicate of setTime gates after regex | Defensive copy of Native regex success path | **Remove.** After regex / `PlainTime.from(..., { overflow })`, call `setTime` and let overflow policy apply. |
| `parseTime` length > 32 | Hard reject | DoS / garbage guard (not in Native) | Optional keep as parse hygiene (not overflow). Document. |
| Locale strip missing | — | — | **Add** Native’s strip ([#29806](https://github.com/angular/components/pull/29806) / [`0fb4247`](https://github.com/angular/components/commit/0fb4247ce834c475556a17e116e20f1ec0fd5a5a)) — this is **string normalization**, not a second overflow policy. |

**Principle going forward:** `overflow: 'constrain' | 'reject'` is the single policy knobs for out-of-range **Temporal fields**. Manual 0–23 checks that ignore `overflow` (and call `with` without overflow) defeat that design.

##### `PlainDateAdapter.addSeconds` no-op — scope correction

Only **PlainDateAdapter** no-ops (`return date`). PlainDateTime / Zoned correctly `date.add({ seconds })`.

Wiring `matTimepicker` under `PlainDateAdapter` is **incorrect usage** (same class as calling `setTime` on PlainDate — already throws). You cannot treat a date-only adapter as a time-capable one (“can’t have the apple and eat it”).

**Recommendation:** Keep unsupported-time story consistent — **`addSeconds` should throw** like `setTime` (clear DX if mis-wired). Not a production bug for apps that correctly use PlainDate **without** timepicker. Downgrade from “critical loop” framing to **incorrect-usage / DX**. Docs already say PlainDate ≠ timepicker.

##### Sub-second clearing (µs/ns) — proposed solution

Native `setHours(h, m, s, 0)` zeroes ms because `Date` has no finer fields ([#29799](https://github.com/angular/components/pull/29799)).

```ts
// PlainDateTime
return target.with(
  {
    hour: hours,
    minute: minutes,
    second: seconds,
    millisecond: 0,
    microsecond: 0,
    nanosecond: 0,
  },
  {overflow: this._overflow},
);

// Zoned — same fields inside ZonedDateTime.from(..., this._getZonedFromOptions())
```

Material timepicker operates at **second** granularity (see also upstream #33354 rejecting intervals &lt; 1s). Clearing µs/ns matches that model.

### 3.4 `toIso8601` — **MATCHES MATERIAL DATE CONTRACT; MISLEADING FOR DATETIME**

Material docs: ISO string for HTML `min`/`max` on `<input type="date">`.

NativeDateAdapter:

```typescript
toIso8601(date: Date): string {
  return [UTCFullYear, UTCMonth+1, UTCDate].join('-'); // date-only
}
```

This package:

| Adapter | `toIso8601` |
| --- | --- |
| PlainDate | `date.toString()` (date, may include `[u-ca=…]`) |
| PlainDateTime | `date.toPlainDate().toString()` — **strips time** |
| Zoned | full `ZonedDateTime.toString()` (+ optional rounding) |

Stripping time on PlainDateTime **matches NativeDateAdapter’s date-only HTML contract**, but:

- `docs/usage.md` says `toIso8601` “wraps `Temporal.toString()`” — **false for PlainDateTime**.
- Round-trip tests use `sameDate` / midnight `createDate`, so **time loss is invisible**.

##### Zoned `toIso8601` — detailed recommendation

| Consumer | Native / PlainDate | Zoned today |
| --- | --- | --- |
| `<input type="date" [min]>` / Material date min/max | `YYYY-MM-DD` | RFC 9557 e.g. `2024-01-15T12:30:00+01:00[Europe/Warsaw]` — **not** a valid HTML date string |
| Persist / API “instant” | N/A (date-only) | Full zoned string is appropriate |
| Interop with PlainDate adapter output | `YYYY-MM-DD` | Different shape |

**Recommendation (pick and document):**

1. **Preferred for Material parity:** `ZonedDateTimeAdapter.toIso8601` → **calendar date in the adapter timezone**: `date.toPlainDate().toString()` (or `date.withTimeZone(...).toPlainDate()`), same role as Native’s UTC y/m/d join. Keep full RFC 9557 on a separate helper, e.g. `toZonedIso8601()` / document `date.toString()` for apps.
2. **Alternative:** Keep full RFC 9557 on `toIso8601` but **rename docs** to say it is *not* for HTML `type="date"` min/max; tell apps to use `toPlainDate().toString()` for Material date bounds. Higher footgun risk because Material *calls* `toIso8601` for those attrs.
3. **Do not** leave docs claiming interchangeability with Native `YYYY-MM-DD`.

Also fix PlainDateTime docs: either document date-only explicitly (Option A in §20 D-1) or add `toHtmlDateString()` and make `toIso8601` full ISO (Option B).

### 3.5 `parse` vs NativeDateAdapter — **DOCS OVERCLAIM**

Package README:

> This matches `NativeDateAdapter`'s behavior with non-ISO input.

**False.** NativeDateAdapter:

```typescript
return value ? new Date(Date.parse(value)) : null;
```

`Date.parse` accepts many non-ISO strings. Temporal adapters only accept what `Temporal.*.from` accepts (RFC 9557 / Temporal ISO). Non-ISO → `invalid()` (or null only for empty).

Accurate statement: parse format argument is ignored (like Native); **accepted string shapes are stricter than Native**.

`deserialize` string path is closer to Native’s ISO-gated deserialize (good).

### 3.6 `compareDate` / `sameDate` / `clampDate` — **INHERITED, DATE-ONLY**

Not overridden. Two PlainDateTimes on the same calendar day with different times → `sameDate === true`. Same as Material for `Date`. Apps needing full equality must use Temporal `.equals` / `sameTime`.

**Proposed usage note** (for `docs/usage.md` + package README “Behavior notes”):

> Material’s `DateAdapter.sameDate` / `compareDate` compare **calendar date only** (year/month/day), not time. That matches `NativeDateAdapter` and is what the datepicker needs for selection highlighting.  
> For full value equality with `PlainDateTime` / `ZonedDateTime`, use Temporal:  
> - `a.equals(b)` — exact Temporal equality (calendar, time, and for zoned: instant/offset rules)  
> - `adapter.sameTime(a, b)` — Material helper for hour/minute/second  
> Do not use `sameDate` to decide whether a timepicker change “did anything.”

### 3.7 `createDate` month range — **IMPROVED vs Native for non-Gregorian**

Native throws if month ∉ 0–11. This package uses `_getMonthsInYearForDate(year)` — correct for Hebrew/Chinese/etc. Good.

### 3.8 Provider pattern — **ALIGNED** (arg order intentional)

Matches `provideNativeDateAdapter(formats?)` style for plain adapters (formats first, optional).

Zoned puts **options first** (`provideZonedDateTimeAdapter(options, formats?)`) because **`timezone` is required** — if formats were first, callers would always have to pass `formats` or `undefined` before options. That asymmetry is **correct API design**, not a footgun to “fix.” Keep as-is; ensure README tables show both signatures side by side.

---

## 4. Temporal semantics compliance

### 4.1 Overflow — **WIRED CORRECTLY; RATIONALE MISSTATES TEMPORAL DEFAULT**

Per **TC39 Temporal docs** ([`PlainDate.from` overflow](https://tc39.es/proposal-temporal/docs/plaindate.html#Temporal.PlainDate.from), [`PlainDate.prototype.add`](https://tc39.es/proposal-temporal/docs/plaindate.html#Temporal.PlainDate.prototype.add)):

- Allowed values: `'constrain' | 'reject'`.
- **Default is `'constrain'`** (out-of-range values clamped). Same for `add` / `subtract` calendar overflow.
- `'reject'` → `RangeError`.

Verified the same with `temporal-polyfill` and consistent with the spec text (not a polyfill quirk).

**Package default should change to `'constrain'`** (align with TC39).

| Today | Proposed |
| --- | --- |
| `options.overflow ?? 'reject'` in base + token factories + `provide*` fallbacks | `?? 'constrain'` everywhere |
| Rationale claims “Temporal strict-by-default” | Rewrite: default matches Temporal; opt into `'reject'` for strict construction |

**Why change the default (not only document):**

1. Spec default is `constrain` — current default surprises Temporal-literate users.
2. **C0 mitigation:** Material month/year navigation stops throwing under defaults without a special-case in `addCalendar*` (still fine to force-constrain nav as belt-and-suspenders).
3. Matches what Material pickers usually want for civil-date UI (Native clamps; design-rationale already admits pickers “often prefer constrain”).

**Migration:** changelog **breaking** for v0.3 (or clearly called out if still pre-1.0): apps that relied on default reject must pass `overflow: 'reject'` explicitly. Update `design-rationale.md`, READMEs, Storybook defaults, tests that assume reject-by-default.

`addCalendarYears/Months/Days` correctly pass `{ overflow: this._overflow }`.

**`addSeconds` + overflow:** seconds balance; calendar `overflow` is irrelevant. Comment only. PlainDate: throw on misuse (see §3.3).

### 4.2 Calendars / `withCalendar` — **CORRECT MECHANICS**

- Storage: `calendar` on `from` / `today` / parse.
- Display: `_formatWithLocale` → `date.withCalendar(outputCalendar).toLocaleString(...)`.
- Dual-calendar pattern in docs matches implementation.

### 4.3 Zoned disambiguation / offset — **CORRECTLY FORWARDED**

`_getZonedFromOptions()` passes `overflow`, `disambiguation`, `offset` into `ZonedDateTime.from`.  
`_toZonedFromPlainDateTime` passes disambiguation into `toZonedDateTime`.

**Gap:** `offset` option has **no unit/integration test**.

**Proposed tests** (`zoned-datetime-adapter.spec.ts`):

```ts
describe('offset option', () => {
  // Fixed: 2024-01-15T12:00:00-05:00[America/New_York] vs wrong offset
  it('offset:use keeps the provided offset instant', () => { /* … */ });
  it('offset:ignore recalculates from local fields + timezone', () => { /* … */ });
  it('offset:prefer uses offset when in range for that local time', () => { /* … */ });
  it('offset:reject throws / invalid when offset conflicts', () => { /* … */ });
  it('parse/deserialize forwards offset from options', () => { /* … */ });
});
```

Use one civil time with a deliberately wrong offset string and assert epoch ns / `offsetNanoseconds` per mode (MDN [`ZonedDateTime.from` offset](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime/from#offset)).

### 4.4 Rounding — **BEHAVIOR OK; TYPE SURFACE INCOMPLETE**

Applied only in zoned `format` / `toIso8601` via `_maybeRoundZoned` — matches docs (“not applied to clone / picker math”).

`TemporalRoundingMode` in `shared/types.ts` allows only:

`'ceil' | 'floor' | 'trunc' | 'halfExpand'`

TC39 / MDN / polyfill also accept:

`'expand' | 'halfCeil' | 'halfFloor' | 'halfTrunc' | 'halfEven'`

(`temporal.d.ts` in this package already lists all nine.) Public options type **rejects valid Temporal modes at compile time**.

**Proposal:** Expand `TemporalRoundingMode` to the full nine-mode union (copy from `temporal.d.ts` / MDN). No runtime change — `date.round()` already accepts them. Add a shallow type test or one runtime test with `halfEven`.

### 4.5 Day-of-week / locale first day — **MOSTLY CORRECT**

`getLocaleFirstDayOfWeek` falls back to **`1` (Monday)** when `Intl.Locale` / weekInfo missing.

NativeDateAdapter falls back to **`0` (Sunday)**.

**Document (do not silently flip without a changeset):** add to `docs/behavior-notes.md` and a short **migration** callout (README or `docs/usage.md` “Migrating from NativeDateAdapter”):

> If `Intl.Locale#getWeekInfo` / `weekInfo` is unavailable, this adapter falls back to **Monday (`1`)**. `NativeDateAdapter` falls back to **Sunday (`0`)**. Set `firstDayOfWeek` explicitly when you need stable SSR/legacy parity.

### 4.6 Epoch → plain conversion uses system TZ — **DOCUMENTED SSR RISK**

Plain adapters: `instant.toZonedDateTimeISO(Temporal.Now.timeZoneId())`.  
Zoned: configured `timezone`.  

SSR doc correctly warns. Still a footgun if apps transfer epoch ms for plain adapters.

**Mitigation options (recommendation order):**

1. **Best for SSR-heavy apps:** Prefer **`ZonedDateTimeAdapter`** with an explicit `timezone` (already required) for any value that crosses the wire as an instant; use Plain\* only for civil dates the user picked (no epoch round-trip).
2. **Plain adapters — optional `timezone` / `epochTimeZone` on options** (default: current behavior = `Temporal.Now.timeZoneId()`). When set (e.g. `'UTC'`), `_createFromEpochMs` uses that zone for the instant→plain projection. Document: *“For SSR, set `epochTimeZone: 'UTC'` (or your app zone) on plain providers so server and client agree.”*
3. **Do not** hard-require a zone on PlainDate adapters — that fights the “date-only / no zone” model. Making zone mandatory for plain would be the wrong default for pure datepicker apps.
4. Docs: discourage `deserialize(epochMs)` / `parse(epochMs)` for Plain\* across SSR; prefer ISO date strings (`YYYY-MM-DD`).

### 4.7 Polyfill

BYO polyfill + `ensureTemporalAvailable()` — good. Message names `temporal-polyfill/global`. Both `temporal-polyfill` and `@js-temporal/polyfill` appear in monorepo devDeps; package peer does not pin either.

---

## 5. Code review (precise)

### 5.1 Critical

#### C0. Default `overflow: 'reject'` breaks Material calendar navigation (peer A-1 — **confirmed**)

- **Where:** `base-temporal-adapter.ts:127-137` — `addCalendarYears/Months/Days` pass `{ overflow: this._overflow }`; default `_overflow` is `'reject'` (`:32`, provider defaults).
- **Session context:** Implementation session **intentionally** chose `reject` (stricter than Temporal’s default `constrain`) for surfacing bad data — see `docs/design-rationale.md` and §19. That intent is fine for **`createDate`**; it is **unsafe** when the same flag is applied to Material navigation arithmetic.
- **Temporal fact (verified with `temporal-polyfill@0.3.2`):**
  - `2024-01-31.add({months:1}, {overflow:'reject'})` → `RangeError`
  - `2024-02-29.add({years:1}, {overflow:'reject'})` → `RangeError`
  - Same with `{overflow:'constrain'}` → `2024-02-29` / `2025-02-28`
- **Material fact (verified in `@angular/material@19.2.19` `fesm2022/datepicker.mjs`):** month/year navigation and keyboard PAGE_UP/DOWN call `addCalendarMonths(this._activeDate, ±1)` and `addCalendarYears(this._activeDate, ±1)` on the **active date** (which keeps the day-of-month). Next/prev month buttons use the same pattern (`~2124-2132`). Range selection also adjusts with `addCalendarMonths`.
- **NativeDateAdapter contrast (`core.mjs`):** `addCalendarMonths` explicitly clamps to the last valid day of the target month when day overflow occurs — never throws.
- **Impact:** Selecting/focusing Jan 31 (or Feb 29) and navigating months/years under **default options** can throw an unhandled `RangeError` in all three adapters. This is a normal datepicker path, not an exotic edge case.
- **Existing tests:** There is coverage that constrain arithmetic works when configured (`plain-date-adapter.spec.ts` “should constrain calendar arithmetic when configured”), but **no default-reject navigation regression** for Jan 31 → February / Feb 29 → non-leap year.
- **Fix (recommended, ordered):**
  1. **Change default `overflow` to `'constrain'`** (TC39 alignment + fixes C0 under defaults) — §4.1.
  2. Optionally still implement `addCalendarMonths` / `Years` with force-`constrain` so explicit `overflow: 'reject'` does not break Material chrome navigation (belt-and-suspenders; matches Native “nav never throws”).
  3. Regression tests: Jan 31 → +1 month / Feb 29 → +1 year under **new defaults**; plus reject-opt-in behavior on `createDate` only.

#### C1. `deserialize` / `parse` / `clone` crash on invalid sentinels (PlainDate / PlainDateTime)

- **Where:** `base-temporal-adapter.ts:155-157`, `plain-date-adapter.ts:22-24,68-70`, `plain-datetime-adapter.ts:22-24,71-73`
- **What:** `isDateInstance(sentinel) === true` → `clone` → `from("[object Object]")` throws
- **Session context:** Delta plan locked “no change” to sentinel stubs because “Material guards with `isValid`.” That assumption is **too optimistic** — see §3.2 and §19. `getValidDateOrNull` / `_isValidValue` run **after** `deserialize`, so they do not prevent the clone throw.
- **Why it matters:** This package’s `deserialize` override clones any `isDateInstance` without `isValid`, unlike Material base. After `parse` stores a sentinel on the control, Material `writeValue` / validators / `@Input` setters call `deserialize(control.value)` → throw. Also app-level `clone`/`parse` on sentinels.
- **Fix:** Align `deserialize` with Material base; gate `clone`/`parse` on `isTemporalInvalid` / `!isValid` → return `invalid()` without `Temporal.from`

#### C2. Documentation / CONTRIBUTING / CI claim Playwright + working lint — **false**

| Claim | Reality |
| --- | --- |
| `CONTRIBUTING.md:29` `pnpm demo:e2e` Playwright | No `test:e2e` script in `apps/demo/package.json`; no Playwright dep/files |
| Root `package.json` `demo:e2e` | Broken filter script |
| Root `CHANGELOG.md` “Storybook + Playwright” | Playwright never shipped |
| CI `pnpm lint` | Passes as empty no-op (`None of the selected packages has a "lint" script`) |

This erodes contributor and consumer trust: scripts and changelogs advertise tooling that is not present, and CI green-checks a lint step that does nothing.

### 5.2 Important

#### I1. Calendar matrix docs overclaim

`docs/calendar-support.md:23` — “roughly twenty cases” including `withCalendar` / `outputCalendar` / era display.

**Actual** (`gregory.spec.ts` and siblings): **5** tests (japanese **7**, buddhist **5** without `getYear`). Almost no `outputCalendar` coverage in matrix files. Plan doc still mentions “~200 cases”.

#### I2. “Integration” tests do not integrate Material UI

- `datepicker.integration.spec.ts` — builds a host component class, never `TestBed.createComponent` / fixture
- `timepicker.integration.spec.ts` — only calls adapter `setTime`; no `MatTimepicker`

Names oversell CI confidence.

#### I3. Storybook setup docs contradict code

`StorybookSetup.mdx` and `config-snippets.ts` show `providePlainDateAdapter()` in decorators.  
Actual `story-providers.ts:23-71` **manually** factories adapters because of Material DI token identity across bundles — with an accurate comment in code, but **wrong docs**.

#### I4. Rounding documented in Storybook; no story exercises it

`CONFIG.zonedRounding` + `ZonedDateTimeAdapter.mdx` document rounding; `Introduction.mdx` lists rounding as a Zoned topic. No story decorator/options actually apply `rounding` — docs/nav imply coverage that the interactive demos do not exercise.

#### I5. DST Gap stories do not exercise DST `setTime`

Decorators set `disambiguation`, but UI is `AdapterExplorer` without gap/overlap `setTime` probes (unlike unit tests, which are good).

#### I6. `TemporalRoundingMode` incomplete vs Temporal

See §4.4. Align `types.ts` with `temporal.d.ts` / MDN.

#### I7. README parse claim vs NativeDateAdapter

See §3.5 — fix wording.

#### I8. `usage.md` serialization example

```typescript
const iso = adapter.toIso8601(value); // wraps Temporal.toString()
const restored = adapter.parse(iso);
```

For PlainDateTime, time is lost; for Material inputs, prefer `deserialize` for ISO. Clarify per adapter.

#### I9. `behavior-notes.md` header still says “v0.1” while package is **0.2.0**

#### I10. `offset` option untested

Wired in `_getZonedFromOptions` but never asserted.

#### I11. PlainDate `addSeconds` silent no-op

Prefer throw (like `setTime`) so mis-wired timepicker fails loudly.

#### I12. `getFirstDayOfWeek` fallback Monday vs Material Sunday

`utils.ts:32,36` vs NativeDateAdapter `0`.

### 5.3 Minor

1. Dead `range()` in production (`utils.ts`) — only used by tests  
2. `_getMonthsInYear` silent `catch → 12` can hide calendar failures  
3. Provider argument order inconsistency (formats-first vs options-first)  
4. Compile-time tests only cover zoned `timezone` required (`compile-time.spec-d.ts`)  
5. `apps/demo/README.md` still Angular CLI boilerplate (Karma / `ng e2e`)  
6. Storybook demos only subset of calendars tested in Vitest  
7. Codecov `fail_ci_if_error: false` — coverage upload failures don’t fail CI  
8. Base adapter coverage **84%** stmts — holes in deserialize branches  
9. `parseTime` whitespace-only → `invalid()`, `''` → `null` (Native trims to null) — slight inconsistency  
10. Exporting `BaseTemporalAdapter` invites fragile subclassing without documented extension points for `_parseString` / `_createFromEpochMs`

### 5.4 What is done well (keep)

- Clear sentinel design + `isTemporalInvalid` + design-rationale essay  
- Required zoned `timezone` (SSR-safe)  
- Overflow/disambiguation unit tests for zoned DST gaps/overlaps — high value  
- Month indexing and weekday remapping correct  
- `parseFormat` ignored with honest docs (aside from Native comparison)  
- Scope discipline (no Day.js clone; ecosystem doc)  
- ng-packagr build clean; peer range `>=18 <21` explicit  
- Format objects set `parse.dateInput: null` consistently with ISO-only parse

---

## 6. Documentation review (section by section)

### 6.1 Root `README.md`

| Claim | Verdict |
| --- | --- |
| Quick start polyfill → provider → `FormControl` | Accurate |
| Adapter table + providers | Accurate |
| Doc index links | Accurate |
| Storybook live URL | Assumed (not fetched in this review) |
| Ecosystem boundary | Accurate |

### 6.2 Package `README.md`

| Claim | Verdict |
| --- | --- |
| Angular 18–20 peers | Matches `package.json` |
| Zoned timezone required | Accurate |
| Invalid sentinel table | Accurate |
| “Matches NativeDateAdapter non-ISO parse” | **False** (§3.5) |
| Removed upstream APIs list | Accurate |

### 6.3 `docs/quickstart.md`

Solid install/polyfill/provider path. Aligns with code.

### 6.4 `docs/usage.md`

Strong forms/range/timepicker/per-route guidance. Issues:

- Serialization blurb imprecise for PlainDateTime `toIso8601`
- RoundingMode list incomplete (matches package type, not Temporal)
- Otherwise accurate provider signatures

### 6.5 `docs/behavior-notes.md`

Excellent locked-behavior reference. Issues:

- Banner “v0.1” stale  
- Overflow section accurate on wiring; pairs with wrong “Temporal default” in design-rationale  
- Plain vs date-time capability table — **accurate** including `addSeconds` no-op

### 6.6 `docs/design-rationale.md`

Best doc in the repo for *why*. Fix:

- **Default overflow** rationale should say: *“stricter than Temporal’s default `constrain`; surfaces bad data in dev”* — not “matches Temporal strict-by-default”

Sentinel / split adapters / required timezone / BYO polyfill — **sound**.

### 6.7 `docs/calendar-support.md`

Islamic skip rationale (TC39 + polyfill inconsistency) is **credible and well-linked**.  
Matrix size / case-count claims — **inflated** (§5.2 I1). Feature-detection snippet — good.

### 6.8 `docs/ssr-considerations.md`

Accurate on polyfill order, explicit zone, epoch TZ risk. One of the better SSR notes in ecosystem adapters.

### 6.9 `docs/temporal-ecosystem.md`

Clear scope split; warns against Temporal.io confusion. Links are third-party (verify before recommending in apps). Appropriate for this package.

### 6.10 `docs/README.md` / Storybook MDX

Index OK. Storybook MDX useful for copy-paste **production** configs, but StorybookSetup MDX describes **wrong** decorator wiring (§5.2 I3).

### 6.11 Plan doc `docs/superpowers/plans/2026-05-26-material-temporal-adapter.md`

Historical plan still lists unchecked Playwright / large calendar matrix. Either archive or mark superseded so it doesn’t read as current status.

---

## 7. Demo / Storybook review

### 7.1 Strengths

- Stories cover PlainDate, PlainDateTime, Zoned, forms, invalid handling, DST config variants, calendar subset
- Per-story config snippets for production providers
- Interactive matrix components with in-browser assertions (`demo-components.ts`)
- Story `play` functions for smoke UX

### 7.2 Gaps / inaccuracies

| Item | Detail |
| --- | --- |
| Provider wiring docs | MDX ≠ `story-providers.ts` |
| Rounding | Documented, not demoed |
| Calendars in UI | gregory/japanese/hebrew/persian only vs 9 Vitest calendars |
| DST stories | Config-only; unit tests carry real DST proof |
| e2e | Claimed elsewhere, absent here |
| `apps/demo/README.md` | Stale CLI template |

### 7.3 Demo vs package API

Production snippets (`provide*Adapter`) match package signatures. Storybook runtime cannot always use those helpers due to duplicate `@angular/material/core` token identity — real constraint; docs should describe the **manual factory** pattern actually used.

---

## 8. Testing strategy review

### 8.1 Inventory (measured)

- **164** tests registered; **163** pass; **1** skipped (`islamic.skip.spec.ts`)
- Layers: unit adapters, providers, shared utils/invalid/polyfill, calendar matrix, “integration”, compile-time types
- Coverage thresholds: lines/functions/statements **90**, branches **80** — currently met overall

### 8.2 What is strong

1. **Zoned DST** — gap/overlap + disambiguation + rounding format/ISO tests  
2. **Time API suites** for PlainDateTime / Zoned (`parseTime` AM/PM, dots, `T` prefix, length limit)  
3. **Overflow reject vs constrain** on `createDate`  
4. **Polyfill missing** throws with expected message  
5. **Provider DI** smoke for all three  
6. Vitest **typecheck** enabled for `*.spec-d.ts`

### 8.3 Structural weaknesses

| Weakness | Impact |
| --- | --- |
| Misnamed integration tests | False confidence for MatDatepicker/MatTimepicker |
| Calendar matrix = 5–7 smokes × PlainDate only | Non-Gregorian regressions in DateTime/Zoned untested |
| Doc claims ~20 cases / outputCalendar / era | Misleading for reviewers |
| No Storybook test-runner / Playwright in CI | `play` functions never gate merges |
| `offset` untested | Option may rot |
| `getDateNames`, `getDayOfWeek`, `addCalendarYears` lightly/untested | Base API drift risk |
| PlainDate `addSeconds` no-op untested | — |
| Type tests only zoned timezone | Miss formats/options arity |
| Single Node 20 | Same class of risk that justified islamic skip |
| Lint step empty | Style/regression gates absent |
| Codecov non-blocking | Upload can fail silently |

### 8.4 Recommended testing strategy (priority order)

1. **Fix sentinel clone/deserialize** + add regression tests (`deserialize(invalid)`, `parse(invalid)`, `clone(invalid)` → `invalid()` / stable)  
2. **Real Angular fixture tests**: `MatDatepicker` + `MatTimepicker` with `TestBed`, open overlay, type input, assert `FormControl` Temporal type + sentinel  
3. **Honest rename** or delete fake integration tests until (2) exists  
4. **Shrink calendar-support claims** to actual case count; add 2–3 leap-month / `outputCalendar` asserts where cheap  
5. **Add `offset` unit tests** (prefer/reject/ignore)  
6. **Either implement Playwright** or remove all e2e claims from CONTRIBUTING/CHANGELOG/root scripts  
7. **Storybook test-runner** for `play` functions in CI (or drop play as non-gated)  
8. Expand `compile-time.spec-d.ts` for provider arities and rounding modes  
9. Configure real ESLint or remove CI lint step  

### 8.5 Coverage note

Overall ≥90% can coexist with **missing behavioral coverage** (integration, offset, sentinel clone). Treat thresholds as necessary but not sufficient.

---

## 9. CI / packaging / release

| Item | Assessment |
| --- | --- |
| `ci.yml` build + test + cov + storybook build | Good skeleton |
| Lint step | Vacuous pass |
| Node matrix | Only 20 |
| `deploy-demo.yml` | Reasonable Pages deploy |
| `release.yml` | build+test+changeset; no storybook/cov |
| Peers `>=18 <21` | Clear; monorepo develops on 19.2.x |
| `sideEffects: false` | OK if polyfill stays app-side |
| No polyfill peerDependency | Intentional BYO; consider `peerDependenciesMeta` optional peer for discoverability |

---

## 10. Compliance matrix (quick reference)

| Area | Compliant? | Notes |
| --- | --- | --- |
| Material month/weekday indices | Yes | |
| Material `invalid` ≠ `null` | Yes (design) | Clone path broken for Plain\* |
| Material timepicker APIs | Partial | PlainDate stubs; locale strip missing |
| Material `toIso8601` date HTML | Yes (date-only) | Docs overstate for DateTime |
| Material `deserialize` invalid handling | **No** | Clones invalid → throw |
| Temporal `overflow` wiring | Partial | Forwarded correctly, but default `'reject'` **breaks Material navigation** (C0) |
| Material month/year navigation | **No** (defaults) | Must clamp/constrain like NativeDateAdapter |
| Temporal `disambiguation` / `offset` | Yes | `offset` untested |
| Temporal `roundingMode` full set | **No** | Type subset |
| Docs accuracy | Mixed | Several false/inflated claims |
| Demo honesty | Mixed | Setup MDX wrong; no e2e |
| Test strategy | Mixed | Strong units; weak integration/docs alignment |

---

## 11. Prioritized recommendations

### P0 — correctness / trust

1. **Fix calendar navigation overflow (C0 / A-1)** — constrain or clamp in `addCalendarMonths`/`Years`; regression tests for Jan 31 and Feb 29  
2. Fix sentinel-safe `clone` / `deserialize` / `parse` (C1)  
3. Remove or implement Playwright; fix CONTRIBUTING / CHANGELOG / `demo:e2e` (C2)  
4. Fix or remove vacuous CI lint step (C2)

### P1 — contract & docs truth

5. Resolve D-1: either full `PlainDateTime` ISO + separate HTML date helper, **or** document date-only `toIso8601` + non-midnight round-trip test proving the limitation  
6. Correct NativeDateAdapter parse comparison; fix overflow rationale (Temporal default is `constrain`)  
7. Fix StorybookSetup MDX to match `story-providers.ts`  
8. Rewrite calendar-support case-count claims  
9. Expand `TemporalRoundingMode` to full Temporal set  
10. Replace DST stories with deterministic gap/overlap inputs (peer D-2)

### P2 — confidence

11. Real MatDatepicker / MatTimepicker fixture tests (including month nav after selecting day 31)  
12. Test `offset`; test `getDateNames` / `getDayOfWeek`  
13. Add rounding Storybook story or drop claim  
14. Align `getFirstDayOfWeek` fallback with Material (Sunday) or document divergence  
15. Replace stale `apps/demo/README.md` (peer D-4)

---

## 12. Appendix A — Method coverage sketch

Legend: **Y** tested · **~** partial · **—** missing · **n/a**

| Method | PlainDate | PlainDateTime | Zoned |
| --- | --- | --- | --- |
| `createDate` | Y | Y | Y |
| `clone` (valid) | Y | Y | Y |
| `clone` (invalid) | — | — | throws path ~ |
| `today` | ~ calendars | Y | Y |
| `parse` (valid / ISO) | ~ | Y | Y |
| `parse` (invalid sentinel) | — (throws) | — (throws) | — (assert throw) |
| `deserialize` (valid / ISO) | Y | Y | Y |
| `deserialize` (invalid sentinel) | — (throws) | — (throws) | — (assert throw) |
| `toIso8601` | ~ | ~ (no time assert) | Y |
| `format` | ~ | ~ | Y |
| `setTime` / `parseTime` / `addSeconds` | Y / Y / — | Y | Y |
| `addCalendarMonths` default reject (Jan 31) | — (**bug**) | — | — |
| `addCalendarYears` default reject (Feb 29) | — (**bug**) | — | — |
| `disambiguation` | n/a | n/a | Y |
| `offset` | n/a | n/a | — |
| `rounding` | n/a | n/a | Y |
| MatDatepicker fixture | — | — | — |
| MatTimepicker fixture | — | — | — |

---

## 13. Appendix B — External references used

- Angular Material `DateAdapter` / `NativeDateAdapter` (github.com/angular/components, `main`)
- MDN / TC39 Temporal: `PlainDate.from` overflow default **`constrain`**; `ZonedDateTime.from` disambiguation/offset; `round` roundingMode enumeration (9 modes)
- Upstream extraction context: angular/components#32668 (cited by repo; not re-reviewed line-by-line here)

---

## 14. Final assessment

**Architecture and type split are good.** The library understands Material’s awkward `invalid()` requirement and Temporal’s Plain vs Zoned separation better than most ports.

**Blockers before production use with defaults:** C0 (navigation `RangeError` under `overflow: 'reject'`), then C1 (sentinel clone/deserialize). **Blockers before “complete” claims:** C2 (e2e/lint honesty), calendar-matrix/Storybook-setup accuracy, D-1 serialization contract clarity.

**Recommended merge posture for follow-up work:** land C0 first; treat this review + §15 adjudication as the backlog source.

---

## 15. Adjudication of peer-review claims (2026-07-19)

A second agent review listed findings A-1, D-1…D-4, T-1, T-2, I-1. Each claim was re-checked against source, Material 19.2.19 call sites, and Temporal polyfill behavior.

| Peer ID | Peer severity | Claim | Our disposition | Notes |
| --- | --- | --- | --- | --- |
| **A-1** | High | `addCalendarMonths`/`Years` with default `reject` throw on ordinary nav | **Accept as Critical (C0)** | Fully confirmed. Material `datepicker.mjs` calls these on `_activeDate` / `calendar.activeDate`. Native clamps. This review initially treated default `reject` as a design choice only — that understated the Material navigation contract. |
| **D-1** | High | `PlainDateTime.toIso8601` drops time; docs imply round-trip | **Accept (Important / docs+API contract)** — not “API must keep time” | Peer is right that `usage.md` / SSR docs mislead. Nuance: NativeDateAdapter `toIso8601` is also **date-only** (HTML `type="date"`). Correct dispositions: (a) document date-only + add non-midnight test, **or** (b) return full ISO and add a separate HTML-date helper. Do not “fix” by blindly matching full `toString()` without deciding Material min/max needs. |
| **T-1** | High | `demo:e2e` absent; Storybook `play` not in CI | **Accept (Critical C2 / Important testing)** | Same finding as our C2 + §8. Agree on “runner or remove claim”. |
| **D-2** | Medium | DST stories don’t exercise gap/overlap | **Accept (Important I5)** | Confirmed: May 26 explorer + no transition `setTime`. Unit tests already cover DST; stories do not. |
| **D-3** | Medium | StorybookSetup MDX ≠ manual providers | **Accept (Important I3)** | Same finding. |
| **D-4** | Medium | `apps/demo/README.md` stale CLI scaffold | **Accept (Minor → P2)** | Same finding. |
| **T-2** | Medium | Coverage ≠ behavioral completeness | **Accept** | Agree; our §8 is more specific (fake integration tests, `offset`, sentinel paths, C0 nav tests). |
| **I-1** | Low | Sharper polyfill/engine boundary on calendar claims | **Accept (Minor)** | Already partly in `calendar-support.md`; wording can be tighter on every non-ISO example. |

### Where the peer review is stronger

1. **A-1 / C0** — correctly elevated default overflow as a **runtime datepicker defect**, with the right Material navigation reasoning. Highest-value finding across both reviews.
2. Clearer **recommended work order** leading with A-1 then D-1 then e2e.
3. Explicit call for **non-midnight** PlainDateTime round-trip test (we noted time loss; peer states the missing test cleanly).

### Where this review remains stronger / peer gaps

| Gap in peer review | Our finding |
| --- | --- |
| Sentinel `clone`/`deserialize`/`parse` crash on Plain\* | **C1** — Critical; peer only asks for sentinel format tests, not the clone throw |
| Design-rationale misstates Temporal overflow default as “strict-by-default” | Temporal default is **`constrain`** |
| `TemporalRoundingMode` public type omits 5 valid modes | Type surface bug |
| README “matches NativeDateAdapter non-ISO parse” | False (`Date.parse` vs Temporal ISO) |
| CI lint is a vacuous no-op | Peer notes lint “passes without analysis”; we classify as trust defect |
| Calendar matrix “~20 cases” inflation | Peer softer (“useful matrix”); docs overclaim remains |
| Fake “integration” tests (no fixture) | Peer asks for real Material flows; we flag misnamed tests |
| `getFirstDayOfWeek` fallback Monday vs Material Sunday | Not in peer list |
| PlainDate `addSeconds` silent no-op | Not in peer list |

### Combined P0 backlog (union)

1. **C0 / A-1** — navigation-safe calendar arithmetic  
2. **C1** — sentinel-safe clone/deserialize/parse  
3. **D-1** — decide and document `toIso8601` contract; add non-midnight test  
4. **T-1 / C2** — real browser runner **or** delete e2e claims; fix lint step  
5. **D-2 / D-3 / D-4** — DST stories, StorybookSetup MDX, demo README  

### Severity calibration note on D-1

Peer rates D-1 **High**. We rate the **documentation contradiction** Important and the **API choice** as intentional-Material-shaped unless the package promises Temporal-faithful serialization. Either way it must be resolved before SSR/API guidance is trustworthy — but it is not the same class of defect as unhandled `RangeError` during month navigation (C0).

---

## 16. Upstream Material drift since this repo’s last update

**Repo freeze point:** `main` tip `5ba760e` — **2026-05-27** (“Version Packages” / v0.2.0).  
**Dev pin:** `@angular/material@19.2.19` (monorepo overrides).  
**Declared peers:** `@angular/material` / `cdk` / `core` **`>=18 <21`**.  
**Review date:** 2026-07-19 (~7.5 weeks later).

### 16.1 npm / Angular version landscape

| Package version | Published (npm `time`) | Relative to repo freeze |
| --- | --- | --- |
| `@angular/material@19.2.19` | 2025-06-25 | Dev pin (already old at freeze) |
| `@angular/material@20.2.14` | 2025-11-19 | Within peer range; latest 20.x at review |
| `@angular/material@21.2.14` | **2026-06-03** | **After freeze; outside peers (`<21`)** |
| `@angular/material@22.0.5` | **2026-07-16** | After freeze; outside peers |
| `@angular/core@latest` / `@angular/material@latest` | **22.0.7 / 22.0.5** (2026-07-19) | Unsupported by current peer range |

**Implication:** The community package’s peer window already excludes current Angular/Material stable (21–22). Consumers on latest Angular cannot install without `peerDependency` overrides. Supporting 21+ is a packaging/compatibility task independent of DateAdapter method shape (below).

### 16.2 Did `DateAdapter` / `NativeDateAdapter` change?

Compared raw sources from `angular/components` tags / `main`:

| Comparison | Result |
| --- | --- |
| `19.2.19` vs `20.2.14` `date-adapter.ts` | **Byte-identical** |
| `19.2.19` vs `20.2.14` `native-date-adapter.ts` | **Byte-identical** |
| `20.2.14` vs `main` `date-adapter.ts` | **No abstract/concrete method surface change.** Only: remove deprecated `MAT_DATE_LOCALE_FACTORY` (inline factory); `locale` → `locale!` definite assignment. |
| `20.2.14` vs `main` `native-date-adapter.ts` | DI modernization: `@Injectable()` → `@Service({autoProvided: false})`; drop deprecated `useUtcForDisplay` / multi-constructor shim. **Behavioral date/time methods unchanged.** |
| Abstract method set (both) | Same 22 abstracts including `toIso8601`, plus optional time APIs (`setTime`, `parseTime`, `addSeconds`, …) |

**Conclusion:** Within the supported peer band (18–20), the DateAdapter **contract this package implements has not moved** since v0.2.0. On `main` / Angular 21–22, adapters may need DI decorator updates (`@Service`) when Material’s publish style changes, but **no new DateAdapter methods** appeared that this package is missing.

Material’s own JSDoc still states the clamp contract this package violates under default `reject`:

- `addCalendarMonths`: *“adding 1 month to Jan 31, 2017 → Feb 28, 2017”*
- `addCalendarYears`: *“adding 1 year to Feb 29, 2016 → Feb 28, 2017”*

That documentation is unchanged on `main` and strengthens **C0**.

### 16.3 Datepicker / timepicker commits after 2026-05-27

`src/material/core/datetime`: **no commits** since 2026-05-01 (API surface idle).

Relevant component commits after freeze:

| Date | SHA | Change | Adapter impact |
| --- | --- | --- | --- |
| 2026-07-13 | `9a247a8` | datepicker focus-indicator shape | Visual only |
| 2026-07-09 | `ebd64a1` | form-field error state tracker | Indirect forms UX |
| 2026-06-05 | `5a8f7df` (#33354) | timepicker: reject intervals **&lt; 1 second** in `generateOptions` | Avoids UI freeze; reinforces that option lists are second-granularity — aligns with this adapter clearing ms in `setTime` and operating at second precision |

No upstream commit since freeze fixes or changes month-arithmetic clamping behavior.

### 16.4 Upstream Temporal / adapter tracking issues & PRs

| Ref | State | Updated | Relevance to this repo |
| --- | --- | --- | --- |
| [#25753](https://github.com/angular/components/issues/25753) feat: Add Temporal Adapter | **Open** (P3) | 2026-05-26 | Original feature request; comment thread notes month 0-index / year-view friction with Temporal (motivates split adapters + month remapping here). |
| [#32668](https://github.com/angular/components/pull/32668) feat: material-temporal-adapter | **Open**, `mergeable_state: dirty`, not merged | 2026-05-26 | Authored by `kbrilla`; Angular maintainer feedback (2026-02-11): *“better suited as a community adapter”*. This repo is that extraction. PR stale vs `main` (dirty). |
| [#33276](https://github.com/angular/components/issues/33276) DateAdapter split date vs time types | **Open** (P3) | 2026-06-08 | Requests first-class `PlainDate` + `PlainTime` (or js-joda Local\*) without hacks; notes invalid-sentinel problem — same design tension this package solves with `isTemporalInvalid`. Future Material API change could simplify PlainDate+timepicker pairing. |
| [#31803](https://github.com/angular/components/issues/31803) timepicker DST + fixed-zone Luxon | **Open** (P3) | 2025-09-29 | Timepicker `_assignUserSelection` + `setTime` collapses ambiguous DST hours. **Same class of risk** for `ZonedDateTimeAdapter` even with correct `disambiguation` — Material may re-apply HMS onto a target instant. Needs a rendered MatTimepicker×DST fixture, not only adapter unit tests. |
| [#27255](https://github.com/angular/components/issues/27255) range picker vs non-primitive dates | **Closed** (fixed ~17.0.x) | 2023-12 | js-joda/`valueOf` throws on `<=`. Temporal also throws `Cannot use valueOf` on `<`/`>`/`Number()`. Current Material month view uses `_getCellCompareValue` → `new Date(y,m,d).getTime()` **numeric** compares — so #27255-class failure is **mitigated** for standard month/year cells. Still a landmine if any code path compares raw Temporal with relational operators. |
| [#30361](https://github.com/angular/components/issues/30361) / [#30910](https://github.com/angular/components/issues/30910) native parse / locale formats | Closed / docs | 2025 | Maintainers: native adapter ignores parse format; *“plan is to eventually use Temporal”*; recommend non-native adapters. Supports this package’s ISO-only parse stance — but **not** the README claim of Native parity for non-ISO strings. |
| [#32975](https://github.com/angular/components/pull/32975) Luxon UTC docs wrong arity | Open | 2026-04 | Parallel footgun: Material docs confused `provideMomentDateAdapter(formats, options)` vs Luxon single-arg. This package’s **formats-first vs zoned options-first** arity split is the same class of docs risk. |
| [#32936](https://github.com/angular/components/pull/32936) Luxon adapter options param | Open | 2026-06 | Upstream considering options bags on provide\* helpers — watch for API alignment ideas. |

**Upstream status summary:** Official Temporal adapter is **not** landing in Angular Material soon (community recommendation stands). Material DateAdapter API is stable through 20.x; this repo is behind on **peer support for 21–22**, not on missing adapter methods.

---

## 17. Edge-case matrix (verified 2026-07-19)

Probes used `temporal-polyfill@0.3.2` (repo lockfile) plus Material 19.2.19 datepicker sources. “Adapter impact” assumes default `overflow: 'reject'` unless noted.

### 17.1 Calendar arithmetic / Material navigation (extends C0)

| Case | `reject` | `constrain` | Adapter / Material impact |
| --- | --- | --- | --- |
| 2024-01-31 + 1 month | **RangeError** | 2024-02-29 | Next-month / PAGE_DOWN with active day 31 |
| 2023-01-31 + 1 month | **RangeError** | 2023-02-28 | Non-leap February |
| 2024-03-31 − 1 month | **RangeError** | 2024-02-29 | Previous-month from Mar 31 |
| 2024-05-31 + 1 month | **RangeError** | 2024-06-30 | 31 → 30-day month |
| 2024-08-31 / 10-31 + 1 month | **RangeError** | Sep 30 / Nov 30 | Same family |
| 2024-12-31 + 1 month | OK → 2025-01-31 | same | Safe |
| 2024-01-31 + 12 months | OK → 2025-01-31 | same | Year via months can succeed where +1 month fails |
| 2024-02-29 + 1 year | **RangeError** | 2025-02-28 | Exact Material JSDoc example |
| 2024-02-29 − 1 year | **RangeError** | 2023-02-28 | PAGE_UP+alt / prev year |
| 2024-02-29 + 4 years | OK → 2028-02-29 | same | Leap-to-leap OK |

Material year view also does `createDate(year, activeMonth, min(day, daysInMonth))` when changing years — that path **clamps via day count**, so some year transitions avoid `addCalendarYears`. Keyboard/header month navigation still hits `addCalendarMonths` on the raw active day → **C0 remains**.

### 17.2 DST / zoned `setTime` (extends peer #31803)

America/New_York 2024-03-10 02:30 (gap) / 2024-11-03 01:30 (overlap):

| disambiguation | Gap 02:30 | Overlap 01:30 |
| --- | --- | --- |
| `compatible` | → 03:30 −04:00 | → 01:30 −04:00 |
| `earlier` | → 01:30 −05:00 | → 01:30 −04:00 |
| `later` | → 03:30 −04:00 | → 01:30 −05:00 |
| `reject` | **RangeError** | **RangeError** |

Adapter `setTime` rebuilds via `ZonedDateTime.from(..., _getZonedFromOptions())`, so `disambiguation: 'reject'` can throw from MatTimepicker selection on transition days. Even with `compatible`, Material timepicker issue **#31803** may still collapse distinct overlap instants when re-assigning onto a target date — **untested with this adapter**.

### 17.3 Calendars / polyfill

| Case | Result with current polyfill | Notes |
| --- | --- | --- |
| `islamic`, `islamic-umalqura`, `islamic-tbla`, `islamic-civil` | **RangeError: Invalid protocol results** | Justifies skipped CI matrix; docs correctly say unsupported |
| Chinese 2023 leap year | `monthsInYear === 13`; month index 3 = `M02L` | `getMonthNames` length 13 OK; year-view Material still iterates month names length — works if names length matches. Leap month **label quality** depends on Intl |
| Ethiopic | `monthsInYear === 13` | Same 13-month UI pressure as Chinese |
| Hebrew `PlainDate.from({year:2024,…})` | Maps to large negative ISO year in `toString` annotation | Compare-value path uses `new Date(hebrewYear, month, day).getTime()` — ordering can be weird vs Gregorian expectations for `min`/`max` across calendars |

### 17.4 Parsing / serialization / sentinels

| Case | Behavior | Risk |
| --- | --- | --- |
| `PlainDate.from('2024-01-15T14:30:00')` | Accepts, strips to date | PlainDate `_parseString` may accept datetime-shaped ISO |
| `PlainDate.from` zoned string | Accepts, strips zone | Same |
| `PlainDateTime.toPlainDate().toString()` | Drops `T23:59:59` | D-1 / docs |
| Epoch ms `8.64e15` | OK | Adapter treats outside ±8.64e15 as invalid |
| Epoch ms `8.64e15+1` | Instant throws | Adapter → invalid sentinel |
| Relational ops on Temporal (`a < b`, `Number(a)`) | **Throws** `Cannot use valueOf` | Mitigated in month grid via numeric `compareValue`; do not put Temporal into raw `<=` paths |
| `clone`/`deserialize` invalid sentinel | Throws / assert | **C1** |

### 17.5 Formats / timepicker

| Case | Notes |
| --- | --- |
| Optional `display.monthLabel` | Material uses it when set; this package’s default formats **omit** `monthLabel` → falls back to `getMonthNames('short')[month]`. OK, but custom formats should set it for non-Gregorian labels |
| Timepicker interval &lt; 1s | Upstream #33354 now blocks; adapter second-level API is aligned |
| `parseTime` locale extras | Native strips non `0-9:AMPM`; this adapter does not — `00:05 ч.` style fails |
| Sub-second fields | `setTime` clears `millisecond` only; µs/ns may remain on PlainDateTime |

### 17.6 Edge cases to add as regression tests (priority)

1. Default-overflow: Jan 31 → +1 month / Feb 29 → +1 year for all three adapters (C0).  
2. Sentinel `deserialize`/`clone` (C1).  
3. Non-midnight PlainDateTime `toIso8601` + parse (D-1).  
4. Zoned `setTime` into NY gap/overlap for each `disambiguation` (including expect throw on `reject`).  
5. MatTimepicker fixture on overlap day (upstream #31803 class).  
6. Chinese leap-year `getMonthNames().length === 13` + `createDate` for month index of `M02L`.  
7. `parseTime('00:05 ч.')` expectation (document fail or add Native-like strip).

---

## 18. Updated recommendations (after upstream + edge pass)

Add to P0/P1 from earlier sections:

1. **Peer range:** plan Angular/Material **21–22** support (or document “18–20 only” prominently). DateAdapter methods are stable; packaging/`@Injectable` vs `@Service` and CI matrix need work.  
2. **Watch upstream #33276 / #31803** — split date/time types and timepicker DST reassignment can force adapter API or demo changes even if DateAdapter abstracts stay put.  
3. **Keep #32668 dirty state in mind** — do not assume Angular will merge an official adapter; community package remains the product.  
4. Expand regression list in §17.6; C0 test vectors should include the full 31→short-month family, not only Jan/Feb.

---

## 19. Calibration against implementation session (`cd04723e…`)

Source: full Cursor transcript of the community-migration / post-port session that built this repo (plan → subagent execution → Storybook DI fix → delta plan A–C → `5ba760e` on `main`). That session’s own wrap-up already lists topics and Q&A; this section only maps **locked decisions vs this review’s findings**.

### 19.1 Branch / ship state (session fact)

| Fact | Implication for review |
| --- | --- |
| Work landed on **`main`** (not a long-lived feature branch); HEAD reviewed = `5ba760e` | Review targets published history, not a WIP branch |
| Package version **0.2.0** via Changesets; **npm publish still needs `NPM_TOKEN`** | “Shipped” in git/docs sense ≠ necessarily on npm registry |
| Cursor co-author trailers stripped via rebase | History is intentional; no co-author noise expected |

### 19.2 Locked decisions → review verdict

| Session decision | Review finding | Calibration |
| --- | --- | --- |
| Default **`overflow: 'reject'`** (stricter than Temporal’s `constrain`) | **C0** | Decision is **intentional for construction**, but **incomplete for Material**: datepicker calls `addCalendarMonths`/`Years` on `_activeDate`. Session rationale in `design-rationale.md` also misstates Temporal as “strict-by-default” (Temporal default is `constrain`). **Do not reverse the createDate policy blindly** — **split nav arithmetic vs createDate** (recommended fix in §5.1). |
| Invalid **sentinels kept**; stubs/`toString` “no change” because “Material guards with `isValid`” | **C1** | Sentinel *existence* stays correct (Material `invalid()`). The **“Material always guards” assumption is false** for `clone`/`parse`/`deserialize` on Plain\* — they call `Temporal.*.from(toString())` and throw. Session under-estimated consumption paths. |
| Playwright / ~570-test budget in v1 plan; delta deferred Playwright | **C2** | Matches: `demo:e2e` / CONTRIBUTING / CHANGELOG still claim Playwright; ~163 Vitest tests shipped. Session consciously deferred runner; **docs were not updated to match**. |
| Storybook DI: duplicate Material `DateAdapter` token → manual `story-providers.ts` | §7.2 StorybookSetup MDX drift | Confirms why demo uses hand-rolled providers; MDX that shows only `providePlainDateAdapter()` is **incomplete/misleading** for Storybook consumers. |
| `parseFormat` **ignored** (ISO-only); README note (delta A.5) | §3.5 / docs | Intentional; still overclaim vs Native in places that imply broader parse parity. |
| DI **`useFactory` + deps only**; dropped `inject()` after Storybook NG0203 | Architecture OK | Do not recommend reverting to field `inject()` without a Storybook/bootstrap plan. |
| Drop `TemporalPlain*Options` aliases; remove `tslib` peer | Minor packaging | Aligned; ng-packagr may still list `tslib` in dist deps — expected. |
| Delete Angular shell; Storybook-only demo | Demo scope | Aligned; leftover `demo:e2e` scripts contradict that cleanup. |
| Islamic calendar **`describe.skip`** (polyfill/engine disagreement) | Calendar docs | Intentional; keep skip + docs, don’t treat as accidental gap. |
| Validators: **no second package yet**; `isTemporalInvalid` stays here | Out of scope | Do not file “missing Validators” as a v0.2 defect. |
| Ecosystem helpers (tempo / temporal-kit) documented externally | `temporal-ecosystem.md` | Good boundary; token format/parse remains BYO. |
| Split adapters; per-adapter tokens; required zoned `timezone`; BYO polyfill; ref year **2017** | Architecture | Affirmed as good decisions throughout this review. |

### 19.3 How discussions progressed (compressed)

1. **Migration plan** → writing-plans → 23 tasks → **subagent-driven** execution.  
2. **npm publish deferred** early (no account) → later Changesets/version to **0.2.0** on `main`; publish still gated on `NPM_TOKEN`.  
3. **Git history** cleaned (Cursor co-author removed).  
4. **Pages/Storybook** broken → long DI debug → factory `Optional` deps bug + **duplicate `@angular/material` tokens** → Storybook-local providers → live fix.  
5. **Docs UX** pass (quickstart/usage/MDX); migration-from-PR doc removed; Islamic wording + MDN links.  
6. **Validators brainstorm** → useful but independent of adapter → **defer package**.  
7. **Day.js/Moment matrix** → ecosystem doc, not adapter scope.  
8. **Sentinel challenge** (“ugly / use null?”) → kept with rationale essay; delta plan later froze stub methods — **that freeze conflicts with C1**.  
9. **Delta plan A–C** → structural DI cleanup, coverage thresholds, release prep → push-all-to-`main`.

### 19.4 What this changes in P0 wording

- **C0:** Frame as *“intentional overflow default collides with Material navigation contract”*, not “accidental reject.” Fix = **constrain/clamp in `addCalendar*`**, keep createDate policy if desired.  
- **C1:** Frame as *“session assumption that Material always `isValid`-guards is wrong”*; sentinel design stays; clone/deserialize/parse must be sentinel-safe.  
- **C2:** Frame as *“deferred Playwright left living claims”* — delete claims or implement runner.

No product code was changed in this review pass; backlog above is the reconciliation of session intent with Material/Temporal reality.

---

## 20. Fix plans (how to address findings)

Two tracks: **(1) fix entirely in this repo** (no Angular Material issue), **(2) optional Material issue** — only if it adds value beyond fixing the community package. Existing upstream issues (#25753, #32668, #33276, #31803) already cover Temporal adoption, type split, and timepicker DST; **do not duplicate those**.

### 20.1 Fixes without a new Angular Material issue

#### C0 — Navigation-safe calendar arithmetic (P0)

**Goal:** Month/year navigation never throws under default options; overflow policy is Temporal’s, not a second hand-rolled validator.

**Recommended approach:**

1. **Default `overflow: 'constrain'`** in base, DI token factories, and `provide*` fallbacks (breaking vs today’s implicit reject — changelog it).
2. **Rewrite `design-rationale.md`:** remove “Temporal strict-by-default”; state default matches TC39; `'reject'` is opt-in.
3. **Belt-and-suspenders (optional but recommended):** `addCalendarMonths` / `addCalendarYears` always pass `{ overflow: 'constrain' }` so apps that opt into `'reject'` for `createDate` still get non-throwing Material chrome (Native never throws on nav).
4. Remove duplicate pre-checks that fight `overflow` (§3.3 inventory); pass `overflow` into `setTime`’s `with` / `from`.
5. **Tests:** defaults — Jan 31 → +1 month / Feb 29 → +1 year; opt-in reject — `createDate` only; one MatDatepicker fixture clicking next month from day 31.

**Do not:** Catch `RangeError` on nav and return `invalid()` — breaks calendar UI.

#### C1 — Sentinel-safe `clone` / `parse` / `deserialize` (P0)

**Goal:** Invalid sentinels never enter `Temporal.*.from(...)`.

**Note:** Material does *not* call `isValid` before `deserialize`. Fixing the override is required even if “happy path” UI only formats valid dates.

**Recommended approach:**

1. Shared helper (private on base or next to `isTemporalInvalid`):
   ```ts
   protected _cloneOrInvalid(value: T): T {
     if (isTemporalInvalid(value) || !this.isValid(value)) {
       return this.invalid();
     }
     return this._cloneValid(value); // current Temporal.from / with path
   }
   ```
2. Gate **all three** PlainDate / PlainDateTime / Zoned paths:
   - `clone` → if invalid, `return this.invalid()`
   - `parse` when `isDateInstance(value)` → same gate before clone
   - `deserialize` → match Material base: `isDateInstance && isValid` → return value (or clone valid only); instance-but-invalid → `invalid()`; else string/number paths
3. Prefer `Temporal.PlainDate.from(date)` for **valid** clones over `from(date.toString())`.
4. **Tests:** `clone(invalid)`, `parse(invalid)`, `deserialize(invalid)`, plus a small TestBed/`_assignValueProgrammatically`-style call that deserializes a control holding a sentinel; assert **no throw**.

Also: `PlainDateAdapter.addSeconds` — throw like `setTime` for consistent “no timepicker on PlainDate” DX (incorrect usage if wired otherwise).

#### C2 — Docs / CI honesty (P0, cheap)

**Recommended (defer Playwright):**

1. Remove root `demo:e2e` script; remove CONTRIBUTING `pnpm demo:e2e` line; edit CHANGELOG “Storybook + Playwright” → “Storybook (+ Vitest play functions)” or similar.
2. Either add a real `lint` script (eslint on `packages/*/src`) **or** drop the CI lint job / rename to “noop removed”.
3. Mark `docs/superpowers/plans/2026-05-26-…` as **superseded** (banner at top) so unchecked Playwright items are not current status.

**Optional later:** add Playwright or Storybook test-runner in CI — only after claims are true again.

#### D-1 — `PlainDateTime.toIso8601` (P1)

Pick one product rule and align docs + tests:

| Option | Behavior | When to choose |
| --- | --- | --- |
| **A (Material-shaped)** | Keep date-only `toIso8601`; document explicitly; add test that non-midnight PDT → date-only string and that min/max HTML date attrs still work | Lowest churn; matches NativeDateAdapter |
| **B (Temporal-faithful)** | `toIso8601` → full `date.toString()`; add `toHtmlDateString()` (or formats helper) for date-only; update SSR/usage samples | Better for APIs/logs that expect datetime |

Do not leave docs claiming round-trip while implementing A.

#### Storybook / demo (P1)

1. Rewrite **StorybookSetup.mdx** to show the **actual** pattern: import `DateAdapter` / formats from the **app’s** `@angular/material/*`, then `useFactory` wiring as in `story-providers.ts` — plus a short “why” (duplicate Material tokens in Storybook bundles).
2. Add a production snippet that **only** uses `providePlainDateAdapter()` (that remains correct for real apps).
3. DST stories: seed a control value on a known gap/overlap civil time (e.g. `2024-03-10T02:30` America/New_York) and assert disambiguation outcome in `play` — or drop “DST” from the story title if it only toggles timezone labels.
4. Replace stale `apps/demo/README.md` with Storybook-only instructions.

#### Docs accuracy (P1)

1. After default flip: Temporal **and** package default **`constrain`**; document `'reject'` as opt-in (update rationale that wrongly said Temporal is strict-by-default).
2. Soften NativeDateAdapter parse comparison (Native is also limited; don’t claim Temporal ISO-only as uniquely worse without nuance).
3. Calendar-support: replace “~20 cases” with the real parameterized count.
4. Expand `TemporalRoundingMode` type to Temporal’s full set (or `Temporal.RoundToOptions['roundingMode']` if typings allow).

#### Peers / packaging (P1–P2)

1. Widen peers to `>=18 <23` (or document “tested on 19 only”) after a smoke build against Material 21/22.
2. CI matrix: Node 20 × Angular 19 + one newer major when peers widen.
3. npm: set `NPM_TOKEN`, merge/publish 0.2.0 (or 0.2.1 after C0/C1) — process only, not a Material issue.

#### Tests to add once C0/C1 land (P2)

- Real `TestBed` + `MatDatepicker` / `MatTimepicker` fixtures (replace DI-only “integration” names).
- Zoned `offset` option matrix; Chinese leap month `getMonthNames` length; `parseTime` locale-junk expectation.

### 20.2 New Angular Material issue / PR — **needed only for a picker-side fix**

**Verdict for this community package:** C0–C2 are still fully fixable in the adapter (§20.1). No Material issue is *required* to ship a safe `@kbrilla/material-temporal-adapter`.

**What is on the remote Temporal PR today:** [`kbrilla/components@temporal-adapter-25753`](https://github.com/kbrilla/components/tree/temporal-adapter-25753) / angular/components#32668 changes **`datepicker.md` / `timepicker.md` only** — no `calendar.ts` / `month-view.ts` / `year-view.ts` / `date-adapter.ts` runtime edits. The old demo’s `vendor/angular-material.tgz` is a **Material 21 rebuild** (formatting / bundling churn vs 19.x), not a custom picker patch set.

**If you have unpushed local picker edits** (laptop `/Users/krzbri/repos/components` or similar), they are **not visible in this cloud workspace**. Point the review at that branch/diff and §20.2 should be rewritten against the actual patch. Until then, the **upstream-shaped** fix (mirroring code Material already has) is:

#### Concrete Material change (prefer a small PR over a vague docs issue)

Material **already clamps day-of-month when selecting a month/year** in year / multi-year views:

```346:351:src/material/datepicker/year-view.ts
    const daysInMonth = this._dateAdapter.getNumDaysInMonth(normalizedDate);
    // ...
      Math.min(this._dateAdapter.getDate(this.activeDate), daysInMonth),
```

(same pattern in `multi-year-view.ts`)

But **header next/prev month** and **month-view keyboard** still do:

```117:135:src/material/datepicker/calendar.ts
      this.calendar.activeDate =
        this.calendar.currentView == 'month'
          ? this._dateAdapter.addCalendarMonths(this.calendar.activeDate, ±1)
          : this._dateAdapter.addCalendarYears(...);
```

**Proposed Material PR:** when advancing months/years for navigation, clamp like year-view selection — e.g. move by month on the period, then `createDate(y, m, min(activeDay, daysInMonth))` (or equivalent via adapter APIs only). That makes navigation safe for strict adapters (`overflow: 'reject'`, Luxon/Temporal reject modes) without forcing every adapter to reimplement Native’s clamp.

**Issue title (if filing before PR):**  
`MatDatepicker: month/year navigation should clamp day-of-month like year-view selection (strict DateAdapters throw)`

**Why this is the right upstream ask (vs only documenting adapter contract):**  
Material is inconsistent today — selection paths clamp, chrome navigation does not. Documenting “adapters must clamp” papers over that inconsistency; aligning navigation with year-view is the durable fix.

**Still do not open new issues for:**

| Topic | Use instead |
| --- | --- |
| Official Temporal adapter | [#25753](https://github.com/angular/components/issues/25753) / PR [#32668](https://github.com/angular/components/pull/32668) |
| Split PlainDate vs time types | [#33276](https://github.com/angular/components/issues/33276) |
| Timepicker DST reassignment | [#31803](https://github.com/angular/components/issues/31803) |
| Non-primitive compare / FormControl | Already mitigated here via numeric `compareValue`; no new issue |

**Dual-track recommendation:** keep §20.1 adapter split-policy as the **community package fix** (ships today). Pursue the Material navigation clamp PR as the **ecosystem fix** so Moment/Luxon/Temporal strict modes all benefit — especially if your local picker work already implements that clamp.

### 20.3 Suggested implementation order

```
1. Default overflow → constrain + rationale/docs/tests     (C0 + TC39 align)
2. C1 Material-shaped deserialize + _cloneValid            (sentinel paths)
3. Remove setTime/parseTime/createDate pre-checks;         (trust overflow)
   pass {overflow} into with/from; clear µs/ns
4. parseTime locale strip (Native parity)                  (string hygiene)
5. PlainDate addSeconds throw (DX) + Zoned toIso8601 date  (consistency)
6. C2 delete false Playwright/lint claims
7. Optional: Material nav clamp PR; force-constrain addCalendar*
8. Peer widen + real Mat* fixtures + npm publish
```

Each of 1–6 is independently shippable on this repo; none require waiting on Angular.

---

## 21. Maintainer Q&A snapshot (2026-07-19)

| Topic | Maintainer position | Review disposition |
| --- | --- | --- |
| C1 / `isValid` first? | Questioned whether path exists | Path exists (`deserialize` before `isValid`); **better fix** = Material-shaped deserialize + `_cloneValid` choke-point (§3.2) |
| `addSeconds` | Only PlainDate; incorrect usage with timepicker | Agree — DX throw, not a correct-app Critical |
| Manual checks vs `overflow` | Should not overstretch; use constrain/reject | Agree — inventory in §3.3; remove setTime/parseTime range gates; pass `overflow` into Temporal |
| µs/ns | Propose solution | Zero ms+µs+ns in `setTime` with `{overflow}` |
| Zoned `toIso8601` | OK with date-only Material parity | Keep §3.4 preferred option |
| TC39 default | Should default to `constrain` | Agree — **propose default change** (§4.1 / §20.1) |
