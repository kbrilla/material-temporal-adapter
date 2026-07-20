# Meta-review: assessment of `2026-07-19-feature-and-code-review.md`

**Date:** 2026-07-19
**Subject:** `docs/reviews/2026-07-19-feature-and-code-review.md` (1263 lines, 12 commits of iteration on branch `cursor/feature-review-adapter-demo-b959`)
**Method:** Every load-bearing technical claim in the subject review was independently re-verified in this environment: runtime probes against `temporal-polyfill@0.3.2`, Material 19.2.19 FESM source inspection, test-suite execution, and repo script/config checks. Companion document: `2026-07-19-independent-implementation-review.md` (written before reading the subject review in detail, to avoid anchoring).

---

## 1. Verdict in one paragraph

The review is **technically reliable where it makes claims** — I re-verified its three Critical findings and a sample of ~15 supporting claims, and found one factual error, one overstated assessment, and two debatable prescriptions presented as settled. Its real weaknesses are **coverage and form**: it missed an entire class of silent data-loss bugs in the zoned parse path and two rendering-correctness bugs in the non-Gregorian display path (arguably the same severity tier as its own C1), and its structure — findings restated across six sections with three slightly different priority lists — makes it hard to extract a single actionable backlog. Use its verdicts; do not use it as the work queue. The combined final review distills both documents into one backlog.

---

## 2. Claim-by-claim verification of the major findings

| Subject-review claim | My verification | Disposition |
| --- | --- | --- |
| **C0**: default `overflow: 'reject'` makes `addCalendarMonths/Years` throw on Jan 31/Feb 29 navigation; Material calls these on the active date; Native clamps | Reproduced both `RangeError`s with the repo polyfill; confirmed Material 19.2.19 header/keyboard call sites; confirmed Native's explicit clamp branch in `addCalendarMonths` | **Confirmed. Correctly rated Critical.** |
| **C1**: sentinel `clone`/`deserialize`/`parse` throw via `from("[object Object]")`; Material calls `deserialize` before `getValidDateOrNull` | Reproduced the `RangeError`; confirmed ~15 `deserialize(control.value)` call sites in datepicker/timepicker validators and input setters, all ahead of `getValidDateOrNull` | **Confirmed. Correctly rated Critical.** The call-site analysis (§3.2) is the strongest part of the document. |
| **C2**: `demo:e2e`/Playwright claims false; CI lint vacuous | Confirmed: `apps/demo/package.json` has no `test:e2e`; `pnpm -r lint` matches no package; ESLint deps present but zero config files anywhere | **Confirmed.** Severity label debatable (see §4.3). |
| Temporal's default `overflow` is `'constrain'`, so `design-rationale.md`'s "matches Temporal strict-by-default" is false | Confirmed against polyfill behavior and TC39 text | **Confirmed.** |
| Native `getFirstDayOfWeek` falls back to Sunday (0); this package falls back to Monday (1) | Confirmed in `core.mjs` ("Default to Sunday…") and `utils.ts` | **Confirmed.** |
| Native `parseTime` strips locale garbage and retries; this package does not | Confirmed (`value.replace(/[^0-9:(AM|PM)]/gi, '')` retry in `core.mjs`) | **Confirmed.** |
| Material calls `toIso8601` for `attr.min`/`attr.max` on the input | Confirmed at `datepicker.mjs` (`_dateAdapter.toIso8601(min)`); the minified template alias `n()` resolves to it | **Confirmed** — I initially doubted this one and was wrong; credit to the review. |
| `TemporalRoundingMode` public type omits 5 of Temporal's 9 modes while `temporal.d.ts` lists all 9 | Confirmed (`types.ts` 4-mode union; `temporal.d.ts` includes `expand`, `halfCeil`, `halfFloor`, `halfTrunc`, `halfEven`) | **Confirmed.** |
| Test counts (163 pass / 1 skip), fake "integration" tests, calendar matrix is 5–7 smokes vs docs' "~20 cases" | Confirmed by running the suite and reading the spec files; the "integration" specs never call `TestBed.createComponent` | **Confirmed.** |
| StorybookSetup MDX shows `providePlainDateAdapter()` in decorators while `story-providers.ts` hand-rolls factories | Confirmed in both files | **Confirmed.** |
| §17.3: 13-month calendars — "`getMonthNames` length 13 OK; year-view Material still iterates month names length — works if names length matches" | **Refuted.** `MatYearView._init` hardcodes `[[0,1,2,3],[4,5,6,7],[8,9,10,11]]` — 12 cells regardless of the names array length. Month 13 is unreachable; nothing "iterates month names length". | **Factual error** — and it caused the review to under-scope the non-Gregorian display problem (see §3.2 below). |

Claims I could not verify from this environment (npm publish dates for Material 21/22, upstream PR mergeable states, issue timelines in §16): these are research assertions with plausible sourcing, but the review presents them with the same confidence as its executed probes. A "verified locally vs looked up" marker would have cost nothing.

---

## 3. What the review missed (found by the independent pass)

These are not nitpicks; two of them are the same severity class as the review's own Criticals.

### 3.1 Zoned parse silently destroys time-of-day (independent finding B3)

`ZonedDateTimeAdapter._parseString('2024-01-15T14:30:00+01:00')` → `2024-01-15T00:00:00+01:00[Europe/Warsaw]` (time dropped, no error); bare `2024-01-15T14:30:00` → same; `…Z` strings → `invalid()`. The review's own edge-case matrix (§17.4) tested the *PlainDate* adapter accepting datetime-shaped strings, and even flagged "Same" for the zoned string row — but never fed offset-only or `Z` instant strings (the two most common backend serialization formats) into the zoned adapter, so it missed that the fallback truncates to midnight. A review that dedicates a full section (§3.4) to `toIso8601` *output* shape never checked whether that output's nearest neighbors *parse back* correctly. Silent data corruption on `deserialize` is arguably worse than C1 (which at least throws loudly).

### 3.2 Non-Gregorian display rendering is broken in two ways (independent findings B4/B5)

- `getDateNames()` builds 31 labels from month 1 of year 2017 in the output calendar *without* an overflow option → Temporal's default `constrain` silently clamps; verified `chinese` produces `…29, 29, 29` and `hebrew` `…30, 30`. Material renders `dateNames[i]` as the day-cell label, so a 30-day Chinese month shows "29" on day 30.
- `getMonthNames()`'s fixed reference year 2017 is a *leap* year in the Hebrew calendar (13 months, verified `Adar I`/`Adar II` in the output), so all month labels after Shevat are shifted for the majority of displayed (non-leap) years.

The review examined this exact area (§17.3) and concluded "works if names length matches" — the factual error in §2 above directly caused the miss. Given that the package advertises nine tested calendars and a dual-calendar (`outputCalendar`) feature, shipping wrong labels in those calendars deserves at least an Important-tier finding.

### 3.3 Smaller gaps

| Missed item | Why it matters |
| --- | --- |
| No `Intl.DateTimeFormat` caching (Native caches; this adapter builds a formatter per `format()` call, ~31+ per month paint) | Measurable render cost on low-end devices; easy fix |
| Global ambient `declare namespace Temporal` shipped via `/// <reference>` | Duplicate-identifier conflicts once consumers install polyfill types or TS ships `lib.esnext.temporal` — consumer-unfixable without `skipLibCheck` |
| `deserialize(new Date())` → `invalid()` while Luxon/Moment adapters accept `Date` | Migration papercut from `NativeDateAdapter`; needs a decision, not silence |
| No eager `timezone`/`firstDayOfWeek` validation | Typos surface as distant `RangeError`s in `today()`; `firstDayOfWeek: 7` silently breaks the weekday header rotation |
| `parseTime` regex-pass values that fail range checks fall through to a *second* parse attempt (`PlainTime.from`) | Works by accident; undocumented control flow |

---

## 4. Quality assessment of the review itself

### 4.1 What is genuinely good (keep doing this)

1. **Evidence discipline for its findings.** File:line citations, executed polyfill probes, decompiled-FESM call-site checks. Nearly everything I re-tested held up.
2. **The C1 call-path analysis** (§3.2) — tracing `deserialize` → `clone` through Material's actual `_assignValueProgrammatically`/validator order — is exactly how adapter reviews should argue.
3. **Session calibration (§19).** Mapping findings back to the implementation session's *locked decisions* ("default reject was intentional-for-construction, not accidental") prevents fix-by-revert mistakes and preserves design intent. Rare and valuable.
4. **Fix plans with explicit non-goals** (§20: "Do not catch RangeError on nav and return invalid()"; "Do not invent a cleverer sentinel"). Negative guidance is as useful as the patches.
5. **The peer-review adjudication (§15) admits its own initial under-weighting of C0.** Self-correction on record is a good norm.

### 4.2 Structural problems (fix in the combined document)

1. **Massive redundancy.** C0 is explained in §0, §3.3, §4.1, §5.1, §10, §11, §15, §17.1, §19.2, §19.4, and §20.1. A reader cannot tell which statement is canonical, and the three priority lists (§11, §15 "Combined P0 backlog", §20.3) differ in ordering and granularity.
2. **Identifier soup.** C0–C2, I1–I12, ten minors, peer IDs A-1/D-1..4/T-1/T-2/I-1, plus P0/P1/P2 — some findings have three names. The combined review should assign one stable ID per finding.
3. **Audience drift.** The document is simultaneously a code review, an upstream-ecosystem survey (§16), a review-of-a-review (§15), and a project retrospective (§19). Each is individually decent; together they bury the decision-relevant content. §16/§18's upstream research deserved its own document.
4. **No verified/unverified marking** for external-world claims (§2 above).

### 4.3 Judgment calls I would push back on

1. **"Remove manual `setTime` range checks; trust `overflow`" (§3.3 inventory, §20.3 step 3).** Overstated as presented. `NativeDateAdapter` itself performs manual dev-mode `inRange` asserts (upstream #29799) — manual checks are not foreign to Material's design. More importantly, routing `hours: 25` through `{overflow: 'constrain'}` would *silently clamp* to 23 — hiding real caller bugs that today throw in dev. The defensible version of the recommendation is narrower: keep Native-parity dev asserts, and additionally zero `microsecond`/`nanosecond` (the review's own §3.3 sub-second point, which is correct). The review's framing ("manual checks defeat the overflow design") conflates *construction policy* with *caller-contract assertion*.
2. **C2 as "Critical".** False tooling claims are a trust defect worth fixing immediately, but placing them in the same severity bucket as unhandled runtime exceptions dilutes what Critical means. A trust/process axis separate from the runtime-severity axis would communicate better. (The finding itself is fully valid.)
3. **Zoned `toIso8601` → date-only "preferred" (§3.4).** The review correctly establishes that Material uses `toIso8601` for `attr.min`/`attr.max`, but on a `type="text"` input those attributes are inert cosmetics — there is no user-facing breakage today, only attribute hygiene. Meanwhile making zoned `toIso8601` date-only would *lose information* in any app code that (reasonably) uses it for serialization. Option 2 in its own table (keep full RFC 9557, document) has a better cost/benefit than the stated preference; at minimum this is a coin-flip presented as a lean.
4. **`deserialize` fix shape.** §20.1's proposed contract returns a **clone** of valid instances. Temporal values are immutable; Material's base returns the same instance. Cloning is harmless but cargo-culted from `Date` semantics — the simpler fix is `return value`.

### 4.4 Was the review's own verification claim honest?

Yes, as far as checkable: its stated `pnpm test`/coverage numbers reproduce, and its polyfill probe results match mine. The one factual error found (§2, year-view iteration) is a *reading* error of Material source, not a fabricated probe.

---

## 5. Scorecard

| Dimension | Score | Note |
| --- | --- | --- |
| Correctness of stated findings | **A−** | One refuted claim (year view), one overstated prescription; everything else re-verified |
| Coverage / completeness | **B−** | Missed zoned parse data-loss and both non-Gregorian rendering bugs; missed perf/typing/packaging items |
| Severity calibration | **B** | C0/C1 right; C2 axis-mixing; D-1 lean debatable |
| Actionability | **C+** | Good fix plans, but three competing priority lists and 1263 lines to mine |
| Verification honesty | **A** | Executed claims reproduce; external claims should have been marked |

**Bottom line:** trust the subject review's findings; supplement with §3's missed bugs; discard its structure. The combined final review (`2026-07-19-final-combined-review.md`) merges both finding sets into a single canonical backlog with one ID scheme and one recommendation per decision point.
