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
- **Session context:** Implementation session **intentionally** chose `reject` (stricter than Temporal’s default `constrain`) for surfacing bad data — see `docs/design-rationale.md` and §19. That intent is fine for **`createDate`**; it is **unsafe** when the same flag is applied to Material navigation arithmetic.
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
- **Session context:** Delta plan locked “no change” to sentinel stubs because “Material guards with `isValid`.” That assumption is **too optimistic** — see §19. Sentinel *design* remains correct; these methods must still be sentinel-safe.
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
