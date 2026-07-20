# Independent implementation review: `@kbrilla/material-temporal-adapter` v0.2.0

**Date:** 2026-07-19
**Reviewed tree:** `main` (`102db5c` ancestor `5ba760e`, package `0.2.0`)
**Reviewer:** Second independent agent review (written without relying on `docs/reviews/2026-07-19-feature-and-code-review.md`; that document is assessed separately in `2026-07-19-review-of-the-review.md`).

**Verification performed in this environment:**

| Check | Result |
| --- | --- |
| `pnpm test` | 163 passed, 1 skipped (islamic), type-check clean |
| Runtime probes against `temporal-polyfill@0.3.2` (repo lockfile) | See findings below; every runtime claim in this document was executed, not assumed |
| Material call-site inspection | `@angular/material@19.2.19` FESM sources (`datepicker.mjs`, `timepicker.mjs`, `core.mjs`) |
| Lint / e2e scripts | Confirmed absent (`pnpm -r lint` matches no package; `apps/demo/package.json` has no `test:e2e`) |

---

## 1. What I would keep (verified strengths)

These are deliberate design decisions that hold up under scrutiny. Do not churn them.

1. **Three split adapters instead of one "mode" adapter.** `PlainDateAdapter` / `PlainDateTimeAdapter` / `ZonedDateTimeAdapter` mirror Temporal's own type split. A unified adapter would have to lie about its `D` type. This is the single best architectural decision in the package.
2. **Invalid sentinels + `isTemporalInvalid`.** Material's contract genuinely requires an `invalid(): D` that is `isDateInstance() === true` and `isValid() === false` (the `NativeDateAdapter` equivalent is `new Date(NaN)`). Temporal has no invalid value, so branded plain objects are the correct — if ugly — answer. The design essay in `docs/design-rationale.md` is honest about the trade-offs. Keep the design; fix the consumption paths (finding B2).
3. **Required `timezone` on the zoned adapter.** No silent `Temporal.Now.timeZoneId()` default. This is the right SSR posture and better than what most ecosystem adapters do.
4. **BYO polyfill with an eager, memoized check.** `ensureTemporalAvailable()` in the base constructor with a clear error naming both polyfills. Correct scope boundary (don't bundle a polyfill in an Angular library).
5. **Index remapping is correct.** Month `-1/+1`, `dayOfWeek 7 → 0`, weekday names built from Jan 1–7 2017 ISO (Jan 1 2017 was a Sunday — same trick as `NativeDateAdapter`). I verified each against Material's expectations.
6. **Temporal options are forwarded, not reimplemented.** `overflow` into `from`/`add`, `disambiguation`/`offset` into `ZonedDateTime.from`, `rounding` only on output paths (`format`/`toIso8601`), never on stored values. The *wiring* is right; the *default* is not (B1).
7. **`createDate` month-range check uses `monthsInYear` for the target year/calendar** instead of hardcoding 0–11. This is genuinely better than `NativeDateAdapter` for Hebrew/Chinese/Coptic/Ethiopic (13-month years).
8. **ISO-only parsing with `parseFormat` ignored, documented.** Trying to be Day.js is out of scope; correct call.
9. **Per-adapter injection tokens, `useFactory` + `deps` providers.** No hidden global options token; works around Storybook DI double-bundle issues.
10. **Docs volume and honesty about sentinels/SSR** are above the bar for a v0.x community package (with specific false claims noted below).

---

## 2. Bugs found (each verified by execution)

Severity: **P0** = breaks normal usage with default config; **P1** = silent data corruption or wrong UI in supported configs; **P2** = correctness/DX defect in edge or misuse paths.

### B1 (P0) — Default `overflow: 'reject'` makes Material month/year navigation throw

- `BaseTemporalAdapter.addCalendarYears/Months/Days` pass `{overflow: this._overflow}`, and `_overflow` defaults to `'reject'` (base constructor, both token factories, both `provide*` fallbacks).
- Verified with the repo's polyfill:
  - `PlainDate.from('2024-01-31').add({months: 1}, {overflow: 'reject'})` → `RangeError: Invalid day: 31; must be between 1-29`
  - `PlainDate.from('2024-02-29').add({years: 1}, {overflow: 'reject'})` → `RangeError`
- Verified in Material 19.2.19: the calendar header previous/next buttons and month-view PAGE_UP/PAGE_DOWN both call `addCalendarMonths(activeDate, ±1)` / `addCalendarYears(activeDate, ±1)` on the active date, which retains the day-of-month. `NativeDateAdapter.addCalendarMonths` explicitly clamps to the last day of the target month ("It's possible to wind up in the wrong month… go to the last day of the desired month").
- **Consequence:** with default options, a user who focuses Jan 31 (or Feb 29) and clicks "next month" (or presses Page Down) gets an unhandled `RangeError`. This is an ordinary datepicker interaction, in all three adapters.
- **Fix:** two independent layers, both cheap:
  1. Change the package default to `'constrain'` (this is also Temporal's own default; the current `design-rationale.md` claim that `'reject'` "matches Temporal's strict-by-default philosophy" is factually wrong — TC39 defaults `overflow` to `'constrain'`).
  2. Regardless of the configured value, force `'constrain'` inside `addCalendarYears/Months` (navigation arithmetic), because Material's JSDoc for these methods explicitly specifies clamping behavior ("adding 1 month to Jan 31 2017 → Feb 28 2017"). An adapter that throws there violates the documented contract no matter what the user configured. Keep the configured `overflow` for `createDate`, where "reject bad civil dates" is a coherent policy.

### B2 (P0) — Invalid sentinels crash `clone` / `parse` / `deserialize`

- `isDateInstance(sentinel) === true` (by design), so:
  - `clone(sentinel)` → `Temporal.PlainDate.from(sentinel.toString())` → `Temporal.PlainDate.from("[object Object]")` → verified `RangeError: Cannot parse: [object Object]`.
  - `parse(sentinel)` and the base `deserialize(sentinel)` both route into `clone`.
- This is reachable from Material, not just from app code. Material's own base `DateAdapter.deserialize` gates on `isDateInstance(value) && isValid(value)`; this package's override clones anything that is `isDateInstance`. Verified in Material 19.2.19 that `min`/`max`/`startAt` setters, the input CVA (`_assignValueProgrammatically`), and every datepicker/timepicker validator call `this._dateAdapter.deserialize(control.value)` **before** `getValidDateOrNull` — so a sentinel stored on a control by a failed `parse` (which is exactly how Material keeps "typed garbage" state for `matDatepickerParse` errors) flows back into `deserialize` on the next validation pass.
- The zoned adapter fails "better" (its `_assertZoned` throws a clear message) but still throws where Material expects a returned `invalid()`.
- **Fix:** make `deserialize` follow Material base semantics (`isDateInstance && isValid` → return/clone; instance-but-invalid → `this.invalid()`), and gate `clone`/`parse` with `isTemporalInvalid(value) → this.invalid()`. While there: `clone` should be `Temporal.PlainDate.from(date)` (Temporal `from` accepts instances directly) instead of a `toString()` round-trip — cheaper and immune to string-shape surprises. Arguably, since Temporal objects are immutable, `clone` of a valid value can simply return the value; the string round-trip buys nothing.

### B3 (P1) — Zoned string parsing silently destroys time-of-day (not caught by the prior review)

`ZonedDateTimeAdapter._parseString` tries `Temporal.ZonedDateTime.from(value)` and, when that throws and the string has no `[`, falls back to `Temporal.PlainDate.from(value)` at **midnight**. Verified behavior with the repo's polyfill, timezone `Europe/Warsaw`:

| Input string | Result today | Comment |
| --- | --- | --- |
| `2024-01-15T14:30:00+01:00[Europe/Warsaw]` | `2024-01-15T14:30:00+01:00[Europe/Warsaw]` | Correct (RFC 9557) |
| `2024-01-15T14:30:00+01:00` | **`2024-01-15T00:00:00+01:00[Europe/Warsaw]`** | `ZonedDateTime.from` rejects offset-only strings; fallback keeps the *date* and silently drops `14:30` |
| `2024-01-15T14:30:00` | **`2024-01-15T00:00:00+01:00[Europe/Warsaw]`** | Same silent time loss for bare date-times |
| `2024-01-15T14:30:00Z` | **`invalid()`** | `PlainDate.from` rejects `Z` strings entirely |

So the three most common machine formats for "an instant" — ISO with offset, bare local date-time, and UTC `Z` — either lose the time silently or fail, while the least common one (bracketed) works. Offset-only and `Z` strings are exactly what most backends emit (RFC 3339). Silent truncation to midnight is a data-corruption class bug: a round-trip through `deserialize` can change a stored appointment time without any error surfacing.

**Fix:** parse in explicit branches:

1. String contains `[` → `ZonedDateTime.from` (current behavior).
2. `Temporal.Instant.from(value)` succeeds (offset or `Z` present) → `instant.toZonedDateTimeISO(this._timezone).withCalendar(...)`.
3. `Temporal.PlainDateTime.from(value)` succeeds → `toZonedDateTime(this._timezone, disambiguation)` — **preserves time** for bare date-times.
4. Date-only strings → midnight (current fallback, now actually only for date-only input).

Also decide and document the zone policy for branch 1: today a bracketed string keeps *its own* zone rather than being converted to the adapter's `timezone`, so a control can hold a value in a different zone than the adapter is configured for. That may be intended (preserve user data) but it is currently an accident of implementation, not a documented decision.

### B4 (P1) — `getDateNames()` produces duplicated day labels for non-ISO output calendars (not caught by the prior review)

`BaseTemporalAdapter.getDateNames` builds labels from `{year: 2017, month: 1, day: i + 1}` in the **output calendar**, without an `overflow` option — so Temporal's default `'constrain'` silently clamps day 30/31 to that month's length. Verified:

- `gregory`: `…28, 29, 30, 31` (correct — January has 31 days)
- `chinese`: `…28, 29, 29, 29` (month 1 of chinese year 2017 has 29 days)
- `hebrew`: `…28, 29, 30, 30`

Material's month view renders `dateNames[i]` as the visible label of day `i + 1`. A Chinese-calendar month with 30 days will render the label "29" on day 30. Any calendar whose *reference* month is shorter than 31 days ships wrong labels for the tail days.

**Fix:** build date names from a month that is guaranteed long enough in the target calendar, or format the numbers directly (`new Intl.DateTimeFormat(locale, {day: 'numeric', calendar}).format` on per-day dates of a real long month), or simply iterate a known 31-day ISO month and convert with `withCalendar` per day. Add a regression test asserting all 31 labels are distinct for `chinese`/`hebrew` output calendars.

### B5 (P1) — `getMonthNames()` fixed reference year misaligns lunisolar calendars; Material caps the year view at 12 cells (partially caught before, wrongly assessed)

Two stacked problems, verified:

1. `_getMonthsInYear`/`getMonthNames` use fixed `year: 2017` **in the output calendar's own numbering**. Hebrew year 2017 happens to be a *leap* year → 13 names including both `Adar I` and `Adar II`. When the datepicker displays a non-leap Hebrew year (12 months), month index 6 is `Nisan` in reality but labeled `Adar II` from the leap-year reference list — every label after Shevat is shifted. The same class of misalignment applies to `chinese` (which month is the leap "bis" month varies per year).
2. Material's `MatYearView._init` hardcodes `[[0,1,2,3],[4,5,6,7],[8,9,10,11]]` — 12 cells. A 13-month year's last month is unreachable from the year view regardless of what `getMonthNames` returns. (The prior review asserted the year view "iterates month names length — works if names length matches"; that is factually wrong against the 19.2.19 source.)

**Consequence:** non-Gregorian *display* calendars are advertised (docs + calendar test matrix) but the month/year navigation UI is wrong or partially unusable for lunisolar calendars. `getMonthNames` is an inherently broken Material API for calendars where month names depend on the year — the adapter cannot fully fix this, but it can (a) pick the reference year from `today()` in the target calendar so labels at least match the *current* year, and (b) document precisely which calendars degrade and how (solar 12-month calendars — `buddhist`, `japanese`, `persian`, `indian`, `coptic`*, `ethiopic`* — are mostly fine; lunisolar ones are not). *Coptic/Ethiopic have a 13th epagomenal "month" that also hits the 12-cell cap.

### B6 (P2) — `parseTime` accepts out-of-range regex matches into a second failure path with inconsistent messaging, and lacks Native's locale cleanup

- `'24:00'` matches the regex, fails the 0–23 gate, falls through to `Temporal.PlainTime.from('24:00')` which throws → `invalid()`. Outcome is right; the flow is accidental.
- `NativeDateAdapter.parseTime` retries after stripping locale garbage (`value.replace(/[^0-9:(AM|PM)]/gi, '')` — added upstream for locales that render `00:05 ч.`). This adapter has no equivalent, so time strings that Material's own display formats produce in some locales will not re-parse. If the timepicker input is used with non-English locales this is a user-visible parse failure loop.
- **Fix:** port the strip-and-retry step; add locale-format round-trip tests (`format(parseTime(x)) → parseTime` for a few locales).

### B7 (P2) — The "PlainDate has no time" story is three different behaviors

On `PlainDateAdapter`: `setTime` **throws**, `parseTime` returns **`invalid()`**, `addSeconds` **silently returns the same date**. If someone mis-wires `MatTimepicker` with the plain-date adapter they get a throw, a validation error, or silent nothing depending on which code path runs first. Pick one policy — throwing on all three is the clearest DX (fail fast at wiring time) and costs nothing for correct apps.

### B8 (P2) — Constructor-time validation gaps

- `timezone` is only checked for *presence*. A typo (`'Europe/Warszawa'`) surfaces later as a `RangeError` from `Temporal.Now.zonedDateTimeISO` inside `today()`, far from the misconfiguration. One `Temporal.Now.zonedDateTimeISO(options.timezone)` probe (or `Temporal.ZonedDateTime.from` on a fixed instant) in the constructor converts this into an immediate, attributable failure.
- `firstDayOfWeek` is not validated to 0–6. `getFirstDayOfWeek() === 7` would rotate Material's weekday header incorrectly (Material computes `weekdays.slice(firstDayOfWeek)`).
- `calendar`/`outputCalendar` ids are validated lazily by the first Temporal call; acceptable, but a dev-mode probe would improve error locality the same way.

### B9 (P2) — `getFirstDayOfWeek` fallback diverges from Material

When `Intl.Locale`/weekInfo is unavailable, this package returns Monday (`1`); `NativeDateAdapter` explicitly documents and returns Sunday (`0`). Not a bug by itself, but an undocumented behavioral divergence that will show up as off-by-one weekday columns in SSR/legacy environments. Either match Material or document loudly.

---

## 3. What I would do differently (design level)

1. **Treat "navigation arithmetic" and "construction validation" as different domains.** The root cause of B1 is one `_overflow` knob applied to two semantically different operations. Material *specifies* clamping for `addCalendarMonths/Years`; `overflow` is a reasonable user policy for `createDate`/`from`. Separate them structurally (hard-coded `'constrain'` in `addCalendar*`), not just by changing the default.
2. **Model the parse pipeline explicitly.** Each adapter's `_parseString` should enumerate accepted shapes (bracketed / offset / Z / bare datetime / date-only) and state per shape: preserved fields, assumed zone, applied calendar. Today the behavior is whatever nested `try/catch` fallbacks produce (see B3). A small internal `classifyIsoString()` helper plus a table in `behavior-notes.md` would eliminate the whole bug class and make tests enumerable.
3. **Cache `Intl.DateTimeFormat` instances.** `_formatWithLocale` goes through `toLocaleString`, which builds a new formatter per call. Material's month view calls `format()` once per day cell per render plus `getDateNames()` (31 more). `NativeDateAdapter` caches a `DateTimeFormat` per options set for exactly this reason. This is the difference between O(1) and O(cells) formatter constructions per calendar paint — measurable on low-end devices.
4. **Reconsider global ambient `Temporal` types.** `public-api.ts` does `/// <reference path="./temporal.d.ts" />` with a global `declare namespace Temporal`. Any consumer who also installs `temporal-polyfill`'s or `@js-temporal/polyfill`'s types (or, later, TypeScript's own `lib.esnext.temporal`, which the file itself anticipates) risks duplicate-identifier conflicts that the *consumer* cannot fix without `skipLibCheck`. Consider shipping the types opt-in (a `types/` subpath or documented `typeRoots` entry) or scoping to `import type` interfaces.
5. **Decide the `Date`-instance question.** `deserialize(new Date())` currently returns `invalid()`. The Luxon/Moment adapters accept JS `Date` in `deserialize`; apps migrating from `NativeDateAdapter` will hit this. Accepting `Date` via `Instant.fromEpochMilliseconds(date.getTime())` is cheap; alternatively, document the rejection prominently in a migration section. Either is fine — silence is not.
6. **`clone()` should not exist as real work.** Temporal values are immutable; returning the input for valid values is correct and free. (Material clones `Date` because `Date` is mutable.)
7. **Eager config validation in dev mode** (see B8) — the adapter constructor is the only place with enough context to produce a good error message.

Things I looked at and would **not** change, mostly deliberately disagreeing with obvious "cleanups":

- The zoned provider taking `(options, formats?)` while plain ones take `(formats?, options?)` is justified by `timezone` being required; unifying would worsen the common call.
- Keeping `format()` throwing on invalid dates matches `NativeDateAdapter` exactly.
- The dev-mode manual range checks in `setTime` mirror Native's `inRange` asserts (upstream #29799). Replacing them with `overflow`-driven clamping would *silently* turn `hours: 25` into `23:xx` under `'constrain'` — worse than throwing. Keep the checks; the only real gap is that `setTime` should also zero `microsecond`/`nanosecond`, not just `millisecond`.

---

## 4. Edge-case walkthrough

Everything in this table was executed against `temporal-polyfill@0.3.2` in this review.

| # | Edge case | Behavior today | Verdict |
| --- | --- | --- | --- |
| E1 | Jan 31 + 1 month, default options | `RangeError` | **B1** |
| E2 | Feb 29 + 1 year, default options | `RangeError` | **B1** |
| E3 | `clone`/`deserialize`/`parse` of invalid sentinel | `RangeError: Cannot parse: [object Object]` | **B2** |
| E4 | Zoned parse `…+01:00` (no bracket) | Midnight, time silently dropped | **B3** |
| E5 | Zoned parse `…Z` | `invalid()` | **B3** |
| E6 | Zoned parse bare `YYYY-MM-DDTHH:mm:ss` | Midnight, time silently dropped | **B3** |
| E7 | PlainDate parse of datetime-shaped string | Accepts, strips time | Acceptable for a date-only type; document |
| E8 | `getDateNames()` with `chinese`/`hebrew` output calendar | Duplicate trailing labels | **B4** |
| E9 | Lunisolar `getMonthNames()` vs displayed year | Leap-year reference labels misalign | **B5** |
| E10 | 13-month years in Material year view | Month 13 unreachable (Material hardcodes 12 cells) | **B5** / upstream limitation |
| E11 | Zoned `setTime` into DST gap (NY 2024-03-10 02:30) | `compatible` default → 03:30−04:00; `disambiguation: 'reject'` → `RangeError` from a timepicker click | Document that `'reject'` disambiguation makes the *timepicker* throw on 2 days/year |
| E12 | Epoch ms at ±8.64e15 boundary | Boundary accepted, beyond → `invalid()` | Correct |
| E13 | `parseTime('24:00')` | `invalid()` (via second failure path) | Outcome OK (B6 notes flow) |
| E14 | `parseTime('1.30')`, `'12'`, `'9:5 pm'` | Parse correctly | Good |
| E15 | `parseTime('00:05 ч.')` (locale suffix) | `invalid()`; Native strips and retries | **B6** |
| E16 | Non-ISO storage calendar `toString()` annotations (`2026-07-19[u-ca=hebrew]`) | `clone` via `from(toString())` preserves calendar | OK (until B2's sentinel case) |
| E17 | Relational operators on Temporal values (`a < b`) | Would throw (`valueOf`), but Material month grid compares via `createDate(...).getTime()`-style numeric cell values | Mitigated in Material's grid; keep Temporal out of raw comparisons in app code |
| E18 | `deserialize(new Date())` | `invalid()` | Decision needed (§3.5) |
| E19 | Whitespace-only `parseTime('   ')` | `invalid()`, while `''` → `null` | Minor inconsistency with Native (trims to null); harmless |
| E20 | `attr.min`/`attr.max` on the datepicker input | Material binds these via `_dateAdapter.toIso8601(min)`; zoned adapter emits full RFC 9557 into an HTML attribute | Cosmetic on `type="text"` inputs; documents why zoned `toIso8601` shape matters |

---

## 5. What we are lacking, and how/why to mitigate

| Gap | Why it matters | Mitigation |
| --- | --- | --- |
| **No real Material fixture tests.** The two `*.integration.spec.ts` files never call `TestBed.createComponent`; the "datepicker integration" test instantiates the host class with `new` and asserts DI wiring only. | B1 and B2 are exactly the class of bug that only rendered-component tests catch (both survive a 163-test green suite). Names currently overstate CI confidence. | Add TestBed fixtures: open `MatDatepicker`, click next-month with day 31 active; type garbage then re-validate (sentinel round-trip through `deserialize`); `MatTimepicker` selection on a DST transition day. Rename current files (`di-wiring.spec.ts`) until then. |
| **Zoned `offset` option has zero tests.** | It is forwarded into `ZonedDateTime.from` but nothing asserts semantics; silent rot risk. | Table-driven test: one civil time with a deliberately wrong offset × `use/ignore/prefer/reject`, assert epoch. |
| **String-shape parse matrix untested.** | B3 lived undetected because no test feeds offset-only/`Z`/bare-datetime strings to the zoned adapter. | Parameterized `_parseString` shape × adapter matrix; assert preserved time and zone, not just non-null. |
| **False tooling claims.** `CONTRIBUTING.md` documents `pnpm demo:e2e` (Playwright) that doesn't exist; root `lint` script and the CI lint step pass vacuously (`pnpm -r lint` matches no package; no ESLint config exists anywhere in the repo despite ESLint devDependencies). | Erodes trust in every other claim; CI shows a green "lint" that gates nothing. | Delete the claims/scripts or implement them. A minimal flat ESLint config over `packages/*/src` is a small task; Playwright should be removed from docs until real. |
| **Non-Gregorian display support is overstated relative to what Material can render** (B4/B5). | Users choosing `outputCalendar: 'hebrew'` get shifted month labels and wrong tail day labels — worse than not advertising the feature. | Fix B4; mitigate B5 (reference year from `today()`); split `docs/calendar-support.md` into "storage calendar" (works) vs "display calendar in Material UI" (per-calendar caveat table). |
| **Angular 21/22 peers.** Peer range is `>=18 <21`; current Angular stable has moved past it. | New apps cannot install without overrides; issue reports will pile up. | Smoke-build against 21/22, widen peers, add one newer major to the CI matrix. |
| **Performance of formatting paths.** | 31+ formatter constructions per calendar paint (see §3.3). | Cache `Intl.DateTimeFormat` per (locale, options-key). |
| **SSR epoch handling for plain adapters** uses `Temporal.Now.timeZoneId()`. | Server UTC vs client local disagree on the calendar date for the same epoch ms. Already documented in `ssr-considerations.md`, but only as prose. | Optional `epochTimeZone` option on plain adapters (default: current behavior); recommend `'UTC'` for SSR apps. |
| **Type-declaration collision risk** (global `Temporal` namespace). | Consumer builds can break through no fault of their own once polyfill types or TS lib types are present. | Test a consumer project with `@js-temporal/polyfill` types installed; move to opt-in types if it conflicts. |

---

## 6. Suggested order of work

1. **B1** — default `'constrain'` + hard-constrain in `addCalendar*` + regression tests (smallest diff, biggest user-facing win).
2. **B2** — Material-shaped `deserialize`, sentinel gates in `clone`/`parse` + sentinel round-trip tests.
3. **B3** — zoned parse pipeline rewrite + string-shape test matrix (data integrity).
4. **B4/B5** — date-name generation fix; month-name reference-year mitigation; calendar-support doc rewrite.
5. Tooling honesty (lint/e2e claims), then TestBed fixtures, then B6–B9 and the §5 backlog.

Items 1–3 are adapter-internal, independently shippable, and require no Angular Material changes.
