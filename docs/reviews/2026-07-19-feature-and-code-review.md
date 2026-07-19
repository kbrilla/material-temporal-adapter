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

**Verdict:** Do **not** ship default `overflow: 'reject'` for calendar arithmetic used by the datepicker until C0 is fixed (or apps must opt into `overflow: 'constrain'` and accept that as the only safe path). Sentinel and CI/docs honesty issues remain blockers for “complete” claims.

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

**Bug:** Plain adapters treat sentinels as date instances, then `clone` / `parse` call `Temporal.*.from(date.toString())`. On a plain object, `toString()` is `"[object Object]"` → **throws** (`Cannot parse: [object Object]`).

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
      return this.clone(value);
    }
```

Material’s default `deserialize` does **not** clone invalid instances:

```typescript
// DateAdapter.deserialize (Material)
if (value == null || (this.isDateInstance(value) && this.isValid(value))) {
  return value;
}
return this.invalid();
```

Zoned avoids the crash via `_assertZoned` (throws a clear error). Plain\* can throw an opaque Temporal parse error instead. **Critical** for any path that re-deserializes or clones a control value after a failed parse.

### 3.3 Time APIs — **MOSTLY ALIGNED**, with intentional PlainDate divergence

| Method | NativeDateAdapter | PlainDate | PlainDateTime / Zoned |
| --- | --- | --- | --- |
| `getHours/Minutes/Seconds` | real | always `0` | real |
| `setTime` | validates + sets | **throws** | validates + sets |
| `parseTime` | regex + locale strip | `invalid()` | regex + `PlainTime.from` |
| `addSeconds` | epoch ms math | **no-op** | `date.add({seconds})` |

PlainDate stubs are documented and appropriate for date-only usage. Caveats:

1. **`addSeconds` no-op** instead of Material base “Method not implemented” throw — quieter failure if timepicker is wired by mistake.
2. **`parseTime` lacks NativeDateAdapter’s locale-extra stripping** (`value.replace(/[^0-9:(AM|PM)]/gi, '')`). Locales that append text (e.g. `00:05 ч.`) fail here; Native succeeds after strip.
3. **`setTime` validation:** Native throws only in `ngDevMode` and still uses `setHours` outside (browser clamps). Temporal adapters throw in dev and return `invalid()` in prod — closer to Temporal strictness; OK, but not identical.
4. PlainDateTime `setTime` clears `millisecond` but **not** `microsecond` / `nanosecond` (Native clears ms via `setHours(..., 0)`). Minor residual precision.

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
- Zoned returns RFC 9557 with offset + `[timeZone]` — richer than Native; fine for Temporal, but not interchangeable with Native’s `YYYY-MM-DD`.

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

Not overridden. Two PlainDateTimes on the same calendar day with different times → `sameDate === true`. Same as Material for `Date`. Apps needing full equality must use Temporal `.equals` / `sameTime`. Documented lightly; worth a usage note.

### 3.7 `createDate` month range — **IMPROVED vs Native for non-Gregorian**

Native throws if month ∉ 0–11. This package uses `_getMonthsInYearForDate(year)` — correct for Hebrew/Chinese/etc. Good.

### 3.8 Provider pattern — **ALIGNED**, with footgun

Matches `provideNativeDateAdapter(formats?)` style. Zoned puts **options first** (`provideZonedDateTimeAdapter(options, formats?)`) while plain put **formats first**. Documented, but easy to misuse at call sites.

---

## 4. Temporal semantics compliance

### 4.1 Overflow — **WIRED CORRECTLY; RATIONALE MISSTATES TEMPORAL DEFAULT**

Verified with `temporal-polyfill`:

- `PlainDate.from({ day: 32 })` → **constrains** to Jan 31 (Temporal default).
- `{ overflow: 'reject' }` → `RangeError`.

Package default `'reject'` is valid product choice.  
`docs/design-rationale.md` claim: *“Matches Temporal’s strict-by-default philosophy”* — **incorrect**. Temporal’s documented default is **`constrain`**. The package is **stricter than Temporal’s default**.

`addCalendarYears/Months/Days` correctly pass `{ overflow: this._overflow }`.  
`addSeconds` on PlainDateTime/Zoned does **not** pass overflow (usually irrelevant for seconds; inconsistent API surface).

### 4.2 Calendars / `withCalendar` — **CORRECT MECHANICS**

- Storage: `calendar` on `from` / `today` / parse.
- Display: `_formatWithLocale` → `date.withCalendar(outputCalendar).toLocaleString(...)`.
- Dual-calendar pattern in docs matches implementation.

### 4.3 Zoned disambiguation / offset — **CORRECTLY FORWARDED**

`_getZonedFromOptions()` passes `overflow`, `disambiguation`, `offset` into `ZonedDateTime.from`.  
`_toZonedFromPlainDateTime` passes disambiguation into `toZonedDateTime`.

**Gap:** `offset` option has **no unit/integration test**.

### 4.4 Rounding — **BEHAVIOR OK; TYPE SURFACE INCOMPLETE**

Applied only in zoned `format` / `toIso8601` via `_maybeRoundZoned` — matches docs (“not applied to clone / picker math”).

`TemporalRoundingMode` in `shared/types.ts` allows only:

`'ceil' | 'floor' | 'trunc' | 'halfExpand'`

TC39 / MDN / polyfill also accept:

`'expand' | 'halfCeil' | 'halfFloor' | 'halfTrunc' | 'halfEven'`

(`temporal.d.ts` in this package already lists all nine.) Public options type **rejects valid Temporal modes at compile time**.

### 4.5 Day-of-week / locale first day — **MOSTLY CORRECT**

`getLocaleFirstDayOfWeek` falls back to **`1` (Monday)** when `Intl.Locale` / weekInfo missing.

NativeDateAdapter falls back to **`0` (Sunday)**.

Divergence under incomplete Intl — document or align with Material.

### 4.6 Epoch → plain conversion uses system TZ — **DOCUMENTED SSR RISK**

Plain adapters: `instant.toZonedDateTimeISO(Temporal.Now.timeZoneId())`.  
Zoned: configured `timezone`.  

SSR doc correctly warns. Still a footgun if apps transfer epoch ms for plain adapters.

### 4.7 Polyfill

BYO polyfill + `ensureTemporalAvailable()` — good. Message names `temporal-polyfill/global`. Both `temporal-polyfill` and `@js-temporal/polyfill` appear in monorepo devDeps; package peer does not pin either.

---

## 5. Code review (precise)

### 5.1 Critical

#### C0. Default `overflow: 'reject'` breaks Material calendar navigation (peer A-1 — **confirmed**)

- **Where:** `base-temporal-adapter.ts:127-137` — `addCalendarYears/Months/Days` pass `{ overflow: this._overflow }`; default `_overflow` is `'reject'` (`:32`, provider defaults).
- **Temporal fact (verified with `temporal-polyfill@0.3.2`):**
  - `2024-01-31.add({months:1}, {overflow:'reject'})` → `RangeError`
  - `2024-02-29.add({years:1}, {overflow:'reject'})` → `RangeError`
  - Same with `{overflow:'constrain'}` → `2024-02-29` / `2025-02-28`
- **Material fact (verified in `@angular/material@19.2.19` `fesm2022/datepicker.mjs`):** month/year navigation and keyboard PAGE_UP/DOWN call `addCalendarMonths(this._activeDate, ±1)` and `addCalendarYears(this._activeDate, ±1)` on the **active date** (which keeps the day-of-month). Next/prev month buttons use the same pattern (`~2124-2132`). Range selection also adjusts with `addCalendarMonths`.
- **NativeDateAdapter contrast (`core.mjs`):** `addCalendarMonths` explicitly clamps to the last valid day of the target month when day overflow occurs — never throws.
- **Impact:** Selecting/focusing Jan 31 (or Feb 29) and navigating months/years under **default options** can throw an unhandled `RangeError` in all three adapters. This is a normal datepicker path, not an exotic edge case.
- **Existing tests:** There is coverage that constrain arithmetic works when configured (`plain-date-adapter.spec.ts` “should constrain calendar arithmetic when configured”), but **no default-reject navigation regression** for Jan 31 → February / Feb 29 → non-leap year.
- **Fix (recommended):** Split policies — keep `overflow: 'reject'` (or document it) for `createDate` / user-input construction if desired, but implement `addCalendarMonths` / `addCalendarYears` with **`constrain`** (or Native-style clamp) regardless of options. Alternatively default options to `constrain` and document that `reject` is unsafe for Material navigation. Add regression tests for both adapters’ month and year transitions.

#### C1. `deserialize` / `parse` / `clone` crash on invalid sentinels (PlainDate / PlainDateTime)

- **Where:** `base-temporal-adapter.ts:155-157`, `plain-date-adapter.ts:22-24,68-70`, `plain-datetime-adapter.ts:22-24,71-73`
- **What:** `isDateInstance(sentinel) === true` → `clone` → `from("[object Object]")` throws
- **Why it matters:** Diverges from Material’s base `DateAdapter.deserialize`, which only returns an instance when `isDateInstance(value) && isValid(value)` and otherwise returns `invalid()`. Concrete failure paths: (1) `deserialize(sentinel)` / `deserialize` of a previous control value that is already a sentinel; (2) `parse(sentinel)` when a non-string instance is passed; (3) any app or Material path that calls `clone` on the current control value after a failed parse. Plain\* throw `Cannot parse: [object Object]`; Zoned throws a clearer assert error
- **Fix:** In `clone`/`parse`/`deserialize`, if `isTemporalInvalid(value)`, return `invalid()` (or the same sentinel) without calling Temporal APIs — match Material’s `isDateInstance && isValid` gate. Prefer returning `invalid()` over throwing for deserialize parity

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
| Temporal `overflow` wiring | Yes | Default ≠ Temporal default |
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
