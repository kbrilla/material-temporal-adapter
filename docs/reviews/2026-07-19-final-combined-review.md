# Final combined review & decision document: `@kbrilla/material-temporal-adapter` v0.2.0

**Date:** 2026-07-19
**Supersedes as the working backlog:** this document merges and reconciles
1. `2026-07-19-independent-implementation-review.md` (second independent pass; new findings B3–B5, B8),
2. `2026-07-19-feature-and-code-review.md` (first review; C0–C2, I1–I12, minors), as adjudicated by
3. `2026-07-19-review-of-the-review.md` (meta-review; validates the first review's findings, refutes one claim, re-weights three prescriptions).

Every runtime claim below was executed against `temporal-polyfill@0.3.2` and cross-checked against `@angular/material@19.2.19` sources during the two review passes. Findings carry one canonical ID (`F#`); prior IDs are noted once for traceability and not used again.

---

## 1. Executive summary

The package's architecture is right and worth protecting: split adapters per Temporal type, honest invalid-sentinel design, required zoned timezone, correct index remapping, options forwarded to Temporal rather than reimplemented. None of the findings below require architectural change.

What blocks production use is a small set of behavioral defects, all adapter-internal and independently fixable:

- **Two crash bugs under default configuration** (calendar navigation `RangeError`; sentinel round-trip `RangeError`).
- **One silent data-corruption bug** (zoned string parsing truncates time-of-day to midnight for the most common ISO shapes).
- **Two rendering-correctness bugs in the advertised non-Gregorian display feature** (duplicated day labels; shifted month labels for lunisolar calendars).
- **A trust debt**: docs/CI advertise Playwright e2e and a lint gate that do not exist.

Recommended release shape: ship **v0.3.0** with F1–F6 + F13 (one minor, one coherent changelog, since F1 changes a default = breaking-ish pre-1.0), then a follow-up minor for the display-calendar work and peer widening. Detailed sequencing in §6.

---

## 2. Canonical findings register

Severity axes are separated on purpose: **Runtime** (crash/corruption/wrong-UI) vs **Trust** (docs/CI/claims) vs **DX** (developer experience). "Prior IDs" map to the earlier documents.

### P0 — runtime, defaults, must fix before recommending the package

#### F1 — Month/year navigation throws under default options
*Prior IDs: C0 / peer A-1. Verified by both passes.*

`addCalendarYears/Months/Days` forward `{overflow: this._overflow}` and the package default is `'reject'`. `2024-01-31 + 1 month` and `2024-02-29 + 1 year` throw `RangeError`. Material's header prev/next buttons and PAGE_UP/DOWN keyboard handlers call exactly these methods on the active date; `NativeDateAdapter` clamps and Material's JSDoc *specifies* clamping ("adding 1 month to Jan 31, 2017 → Feb 28, 2017").

**Fix (both layers, not either/or):**
1. Change the package default `overflow` to `'constrain'` everywhere it is defaulted (base constructor, both `providedIn: 'root'` token factories, both `provide*` fallbacks). This also corrects the factual error in `design-rationale.md` — TC39's own default is `'constrain'`, not "strict by default".
2. Hard-code `{overflow: 'constrain'}` inside `addCalendarYears` and `addCalendarMonths` regardless of configuration, because Material's contract for those two methods is clamping. `addCalendarDays` cannot overflow (days always balance) and needs no option at all. The configured `overflow` remains meaningful for `createDate` (strict civil-date construction is a coherent opt-in policy there).
3. Regression tests: Jan 31 → +1/−1 month across 30/29/28-day targets, Feb 29 → ±1 year, for all three adapters, under defaults **and** under explicit `overflow: 'reject'` (nav must still not throw).

**Explicitly rejected alternative:** catching `RangeError` in `addCalendar*` and returning `invalid()` — Material navigation cannot handle an invalid active date.

#### F2 — Invalid sentinels crash `clone` / `parse` / `deserialize`
*Prior IDs: C1. Verified by both passes, including Material call-site order.*

`isDateInstance(sentinel)` is `true` (by design), so `clone` runs `Temporal.*.from(sentinel.toString())` → `RangeError: Cannot parse: [object Object]`. Material calls `deserialize(control.value)` in ~15 places (validators, `min`/`max`/`startAt` setters, the input CVA) **before** `getValidDateOrNull`, and a failed `parse` stores the sentinel on the control — so this is reachable from ordinary typed-garbage-then-revalidate flows.

**Fix:**
1. `BaseTemporalAdapter.deserialize`: restore Material base semantics — `isDateInstance(value) && isValid(value)` → return the value; instance-but-invalid → `this.invalid()`; then string/number paths. Do **not** clone valid values: Temporal objects are immutable, `return value` is correct (the first review's proposed clone-on-deserialize is `Date`-era cargo; the meta-review's simplification stands).
2. `clone` and the `isDateInstance` branch of `parse`: `isTemporalInvalid(value) → this.invalid()` first. For valid values, `clone` can return the input (immutability); if a distinct instance is ever needed, `Temporal.PlainDate.from(date)` (object overload), never `from(date.toString())`.
3. Tests: `clone/parse/deserialize` of each sentinel type → returns an invalid sentinel, never throws; plus a control-simulation test (sentinel on a `FormControl`, run the validator path).

#### F3 — Zoned string parsing silently truncates time-of-day *(new in second pass)*

`ZonedDateTimeAdapter._parseString` falls back to `PlainDate.from(value)` at midnight whenever `ZonedDateTime.from` rejects a bracket-less string. Verified outcomes (adapter timezone `Europe/Warsaw`):

| Input | Today | Should be |
| --- | --- | --- |
| `2024-01-15T14:30:00+01:00[Europe/Warsaw]` | correct | correct |
| `2024-01-15T14:30:00+01:00` | **midnight** (time dropped, no error) | 14:30 as instant, projected into adapter zone |
| `2024-01-15T14:30:00Z` | **`invalid()`** | 15:30 in Warsaw |
| `2024-01-15T14:30:00` | **midnight** | 14:30 in adapter zone (with configured disambiguation) |

RFC 3339 offset/`Z` strings are the dominant backend wire format; a `deserialize` round-trip that moves an appointment to midnight without an error is data corruption. Runtime severity equals F2; it ranks below only because it needs non-bracketed input to trigger.

**Fix — explicit shape pipeline replacing the nested try/catch:**
1. contains `[` → `ZonedDateTime.from(value, zonedFromOptions)` (unchanged).
2. else try `Temporal.Instant.from(value)` (accepts offset and `Z`) → `instant.toZonedDateTimeISO(this._timezone).withCalendar(cal)`.
3. else try `Temporal.PlainDateTime.from(value)` → `toZonedDateTime(this._timezone, disambiguation)`.
4. else `Temporal.PlainDate.from(value)` → midnight (now genuinely only date-only strings).

Plus a decision (D3 in §4) on whether bracketed strings keep their own zone (current behavior) or are converted to the adapter zone — either is defensible; today it is an undocumented accident. Add the full string-shape × adapter parse test matrix; also assert `PlainDateAdapter`'s intentional time-stripping of datetime-shaped strings as *documented* behavior.

### P1 — wrong UI / contract violations in supported configurations

#### F4 — `getDateNames()` duplicates trailing day labels for non-ISO output calendars *(new in second pass)*

Labels are built from `{year: 2017, month: 1, day: 1..31}` in the output calendar with no `overflow` option → Temporal's default `'constrain'` clamps silently. Verified: `chinese` → `…28, 29, 29, 29`; `hebrew` → `…28, 29, 30, 30`. Material renders `dateNames[i]` as the day-cell label, so 30-day Chinese months display "29" on day 30.

**Fix:** generate labels by formatting the numbers 1–31 in the output calendar's numbering system directly (iterate a real 31-day ISO month and format each day with `withCalendar`, or use `Intl.NumberFormat`/`DateTimeFormat` day parts), and assert all 31 labels are distinct for `chinese`/`hebrew` in tests.

#### F5 — `getMonthNames()` reference year misaligns lunisolar calendars; Material's year view caps at 12 cells *(new in second pass; corrects the first review's §17.3)*

Fixed reference `year: 2017` interpreted in the output calendar is a *leap* Hebrew year → 13 names including `Adar I`/`Adar II`; displayed non-leap years get every post-Shevat label shifted by one. Chinese leap-month position varies per year, so a fixed reference can never be right. Independently, `MatYearView` hardcodes 12 month cells — month 13 of any 13-month year is unreachable from the year view (the first review claimed the year view "iterates month names length"; refuted against source).

**Fix (mitigation — full correctness is impossible under Material's year-less `getMonthNames()` API):**
1. Derive the reference year from `today()` converted to the output calendar, so labels match at least the current year.
2. Rewrite `docs/calendar-support.md` to separate **storage calendar** (fully works) from **display calendar in Material UI** with a per-calendar caveat table: solar 12-month calendars OK; lunisolar (`hebrew`, `chinese`, `dangi`) get approximate month labels; 13-month years lose month 13 in the year view (upstream Material limitation — candidate for an upstream issue, see D6).
3. While in that doc: fix the "~20 cases" test-matrix overclaim (actual: 5–7 smokes per calendar).

#### F6 — `parseTime` lacks Native's locale cleanup
*Prior IDs: part of §3.3 in the first review. Verified.*

`NativeDateAdapter.parseTime` strips non-time characters and retries (added upstream for locales formatting times like `00:05 ч.`). Without it, times produced by this adapter's own `format()` in such locales fail to re-parse — a user-visible edit loop in the timepicker input. Port the strip-and-retry; add locale round-trip tests. (Keep the existing 32-char guard.)

#### F7 — `PlainDateTime.toIso8601` drops time; docs claim it "wraps `Temporal.toString()`"
*Prior IDs: D-1 / I8. Verified.*

Date-only output matches `NativeDateAdapter`'s HTML-attribute contract (and Material does bind `attr.min/max` via `toIso8601` — verified), so the *behavior* is defensible; the *docs* are false and the round-trip tests hide the loss (midnight-only fixtures). Resolution is decision D2 (§4); either branch must add a non-midnight round-trip test.

### P2 — trust and DX

#### F8 — False tooling claims: Playwright e2e and vacuous lint gate
*Prior IDs: C2/T-1. Verified: no `test:e2e` script exists; `pnpm -r lint` matches no package; ESLint devDependencies present, zero config files.*

Runtime impact none; trust impact high — CI green-checks a lint step that gates nothing and CONTRIBUTING instructs contributors to run a command that fails. Fix is cheap: delete `demo:e2e` + CONTRIBUTING line + CHANGELOG "Playwright" wording, and either add a minimal flat ESLint config over `packages/*/src` or delete the lint step. Mark the historical plan doc superseded. (Meta-review note: keep this out of the "Critical runtime" bucket — different axis, same urgency.)

#### F9 — "Integration" tests do not integrate
*Prior IDs: I2. Verified — no `TestBed.createComponent` anywhere.*

Rename to `di-wiring.spec.ts` now; add real fixtures later (§5). F1/F2/F3 all survived a green 163-test suite — that is the argument for fixture tests in one sentence.

#### F10 — Unsupported-time behavior on `PlainDateAdapter` is three different policies
*Prior IDs: I11 (partial).* `setTime` throws, `parseTime` returns `invalid()`, `addSeconds` silently no-ops. Make all three throw (mis-wiring a timepicker should fail fast and identically).

#### F11 — Constructor validation gaps *(new in second pass)*

Probe `timezone` validity eagerly (`Temporal.Now.zonedDateTimeISO(tz)` in the constructor) so typos fail at configuration site, not inside `today()`. Dev-assert `firstDayOfWeek` ∈ 0–6 (out-of-range silently mis-rotates Material's weekday header).

#### F12 — `TemporalRoundingMode` type rejects 5 valid Temporal modes
*Prior IDs: I6. Verified against `temporal.d.ts` (9 modes) vs `types.ts` (4).* Widen the union; zero runtime change.

#### F13 — Docs corrections bundle
*Prior IDs: I1, I3, I7, I8, I9, D-3, D-4. All verified.*
- `design-rationale.md`: Temporal's default is `'constrain'` (rewrite alongside F1).
- Package README: "matches NativeDateAdapter's behavior with non-ISO input" is false (`Date.parse` is far laxer than Temporal ISO) — reword to "parse format is ignored, like Native; accepted shapes are stricter".
- `StorybookSetup.mdx`: show the manual-factory pattern actually used in `story-providers.ts` (duplicate Material token identity), keep `provide*` snippets labeled app-only.
- `usage.md` serialization example (per D2 outcome); `behavior-notes.md` v0.1 banner; stale `apps/demo/README.md`; document the Monday-vs-Sunday `getFirstDayOfWeek` fallback divergence (or align it, see D5).

#### F14 — Smaller code-quality items *(new in second pass unless noted)*
- Cache `Intl.DateTimeFormat` per (locale, options) as Native does — `format()` currently constructs a formatter per call, ~31+ per month paint.
- Global ambient `Temporal` namespace (`/// <reference>` in `public-api.ts`) risks duplicate-identifier conflicts with polyfill types / future `lib.esnext.temporal`; verify a consumer project with polyfill types installed, consider opt-in types.
- `setTime` should zero `microsecond`/`nanosecond`, not just `millisecond` (first review, confirmed).
- Zoned `offset` option has zero tests (first review, confirmed).
- Dead `range()` util in production code; `_getMonthsInYear` silent `catch → 12`.

---

## 3. What to keep (do not "fix")

1. Split adapters; per-adapter tokens; `useFactory` + `deps` providers.
2. Sentinel design and `isTemporalInvalid` (fix consumption paths per F2, keep the design — Material's contract requires it; do not replace with `null` or a Proxy).
3. Required zoned `timezone`; BYO polyfill with eager check.
4. ISO-only parse with `parseFormat` ignored.
5. Zoned provider `(options, formats?)` argument order (required `timezone` justifies the asymmetry).
6. `format()` throwing on invalid dates (Native parity).
7. **Dev-mode manual range checks in `setTime`** — the first review recommended removing them in favor of `overflow`; the meta-review pushes back and this document sides with keeping them: Native performs the same dev asserts, and `'constrain'` would silently turn `hours: 25` into a valid time, hiding caller bugs. Assertion of a caller contract and construction-overflow policy are different things.
8. `createDate`'s calendar-aware month-range check (`monthsInYear`) — better than Native for 13-month calendars.
9. Reference year 2017 for *weekday* names (Jan 1 2017 = Sunday) — only the month/day-name usages change (F4/F5).

---

## 4. Decisions needed from the maintainer

| ID | Decision | Recommendation | Why |
| --- | --- | --- | --- |
| **D1** | Default `overflow`: flip to `'constrain'`? | **Yes** (with F1's hard-constrain in `addCalendar*` as an independent guarantee) | TC39 alignment; fixes F1 under defaults; Material-shaped. Changelog as breaking-ish for 0.3.0; apps wanting strict `createDate` opt in with `overflow: 'reject'`. |
| **D2** | `PlainDateTime.toIso8601`: date-only (document) or full ISO (+ separate HTML-date helper)? | **Keep date-only, fix docs** (Option A) | Material's only consumer of `toIso8601` is `attr.min/max`; Native is date-only; changing the return shape is churn without a consumer. Apps needing lossless serialization should call `value.toString()` — add that one line to `usage.md`. Revisit only if a real serialization consumer appears. |
| **D3** | Zoned parse of bracketed strings: keep the string's own zone, or normalize to adapter `timezone`? | **Keep the string's zone; document it** | Preserves user data; `setTime` already operates on `date.timeZoneId` so mixed-zone values behave correctly; normalizing silently would be another F3-class surprise. |
| **D4** | `deserialize(new Date())`: accept or reject? | **Accept** (`Instant.fromEpochMilliseconds(d.getTime())` → adapter projection, reusing `_createFromEpochMs`) | Luxon/Moment adapters accept `Date`; it is the #1 migration papercut from `NativeDateAdapter`; cost is ~3 lines per base. If rejected instead, add a loud migration note. |
| **D5** | `getFirstDayOfWeek` fallback: Monday (current) or Sunday (Native)? | **Align to Sunday (0)** | The fallback only fires when `Intl.Locale`/weekInfo is missing (legacy/SSR); in that situation matching Material's documented behavior beats a silent divergence. Apps can set `firstDayOfWeek` explicitly either way. |
| **D6** | File upstream Material issue/PR for navigation clamp + 13-month year view? | **Yes, after F1 ships here** | Material already clamps day-of-month in year/multi-year *selection* but not in header/keyboard *navigation* — a small consistency PR helps every strict adapter (Luxon reject modes too). The 12-cell year view is a second, separate upstream limitation worth an issue referencing #25753/#33276. Neither blocks anything in this repo. |
| **D7** | Peer range: widen to Angular 21/22 now or document 18–20? | **Widen next minor after F1–F3** | DateAdapter's method surface is unchanged through 20.x (verified in first review); the work is a smoke build + CI matrix entry, not code. Until then, a README support-matrix note. |

---

## 5. Test plan (the suite that would have caught all of this)

1. **Navigation regressions (F1):** Jan 31 ±1 month (28/29/30-day targets), Feb 29 ±1 year; defaults and explicit `'reject'`; all three adapters.
2. **Sentinel round-trips (F2):** `clone/parse/deserialize` of each sentinel; control-simulation test through the validator path.
3. **Parse shape matrix (F3):** bracketed / offset-only / `Z` / bare datetime / date-only / garbage × three adapters; assert preserved time **and** zone, not just non-null.
4. **Display-calendar rendering (F4/F5):** all 31 `getDateNames` labels distinct for `chinese`/`hebrew`; `getMonthNames` length and labels for a leap and a non-leap Hebrew year.
5. **TestBed fixtures (F9):** rendered `MatDatepicker` — click next-month with day 31 active; type garbage, blur, revalidate; rendered `MatTimepicker` — selection on a DST transition day (upstream #31803 class), with `disambiguation: 'earlier'` and `'reject'`.
6. **Zoned `offset` option matrix; locale `parseTime` round-trips (F6); non-midnight `toIso8601` round-trip (F7); µs/ns zeroing in `setTime`.**

Coverage thresholds stay as-is; they are necessary, not sufficient (both reviews agree — F1/F2/F3 all hid under 90%+ coverage).

---

## 6. Sequencing and release plan

Each step is independently shippable; nothing waits on Angular.

```
v0.3.0  (behavioral + breaking-ish default change, one coherent changelog)
  1. F1  default constrain + hard-constrain addCalendar* + tests   ← smallest diff, biggest win
  2. F2  Material-shaped deserialize + sentinel gates + tests
  3. F3  zoned parse pipeline + shape matrix + D3 documented
  4. F6  parseTime locale strip; F10 unify PlainDate time-API throws;
         setTime µs/ns zeroing; F11 eager config validation
  5. F8  delete e2e/lint claims (or add real ESLint config); F13 docs bundle
  6. F12 rounding-mode union; D2/D4/D5 outcomes

v0.3.x / v0.4.0
  7. F4/F5 display-calendar fixes + calendar-support doc rewrite
  8. F9  TestBed fixture suite; F14 formatter caching + offset tests
  9. D7  peer widening + CI matrix; npm publish plumbing (NPM_TOKEN)
 10. D6  upstream Material issue/PR (navigation clamp; 13-month year view)
```

**Effort characterization:** items 1–6 touch only `shared/base-temporal-adapter.ts`, the three adapter classes, options/token defaults, docs, and specs — no public API surface changes except the default flip and (if D4 accepted) a widened `deserialize`. Item 7 is contained in `base-temporal-adapter.ts` + docs. Item 8 is test-only but needs jsdom-vs-real-browser care for overlay interactions. Item 9 is packaging/CI. Item 10 is external.

---

## 7. Reconciliation record (where the three documents disagreed)

| Topic | First review said | Second pass / meta-review says | This document's ruling |
| --- | --- | --- | --- |
| Year view & 13-month calendars | "iterates month names length — works" | Refuted: 12 cells hardcoded | F5 as written; upstream issue via D6 |
| `setTime` manual range checks | Remove; trust `overflow` | Keep: Native parity; `constrain` would hide caller bugs | Keep checks (§3.7) |
| `deserialize` fix shape | Clone valid instances | Return the instance (immutability) | Return the instance |
| Zoned `toIso8601` | Prefer date-only | `attr.min/max` on `type="text"` is inert; full RFC 9557 has serialization value | Keep full RFC 9557 for zoned, document; PlainDateTime per D2 |
| C2 severity | Critical | Trust axis, not runtime | Separate axes (F8, P2-trust, fix immediately anyway) |
| Zoned parse of offset/`Z`/bare strings | Not examined | Silent time loss / `invalid()` | **F3, P0** |
| Non-Gregorian label rendering | "OK" per §17.3 | Duplicated / shifted labels | **F4/F5, P1** |

With F1–F3 fixed and F8 cleaned up, this package is recommendable for production Gregorian use; after F4–F7 it is recommendable for the non-Gregorian display feature it advertises.
