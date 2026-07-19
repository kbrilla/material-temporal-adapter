# Adapter, demo, and documentation review

**Review date:** 2026-07-19  
**Scope:** `packages/material-temporal-adapter`, `apps/demo`, repository documentation, CI, and tests  
**Method:** source review, local execution of the existing validation scripts, and comparison with the Angular Material `DateAdapter` source and the TC39 Temporal documentation.

## Executive summary

The repository has a clear split-adapter design, good type-level coverage, useful calendar matrix tests, and a successful package build. The central implementation issue is that calendar navigation uses the configurable `overflow: 'reject'`; this can throw during normal Material month/year navigation where Angular's native adapter clamps to a valid date. This is a **high-priority correctness defect**.

The documentation also overstates round-trip safety for `PlainDateTime`, because `toIso8601()` intentionally returns only the date portion. Demo and CI coverage is primarily package-level and Storybook-build coverage: no configured demo E2E runner executes the Storybook interaction tests, and the stories labelled as DST demonstrations do not exercise a DST gap or overlap.

No production code was changed by this review. Findings below are recommendations for follow-up implementation work.

## Severity and disposition

| ID  | Severity | Area              | Finding                                                                                                                       | Disposition                                                  |
| --- | -------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| A-1 | High     | Adapter contract  | `addCalendarMonths()` and `addCalendarYears()` can throw on ordinary month/year transitions.                                  | Fix before relying on the adapter in production.             |
| D-1 | High     | Documentation/API | `PlainDateTimeAdapter.toIso8601()` drops the time, contradicting the documented serialization round trip.                     | Correct the API or clearly document date-only serialization. |
| T-1 | High     | Testing/CI        | Demo interaction tests are not executed; the advertised `demo:e2e` script is absent.                                          | Add a real runner and CI job, or remove the claim.           |
| D-2 | Medium   | Demo              | “DST Gap”/“DST Overlap” stories do not demonstrate or assert either transition.                                               | Replace with deterministic transition cases.                 |
| D-3 | Medium   | Demo docs         | Storybook setup documentation describes application provider helpers, not the manual Storybook provider wiring actually used. | Update the guide to match the implementation.                |
| D-4 | Medium   | Demo docs         | `apps/demo/README.md` is Angular scaffold documentation for targets the demo does not expose.                                 | Replace with Storybook-specific instructions.                |
| T-2 | Medium   | Tests             | Coverage clears configured thresholds, but important adapter-contract and integration paths remain untested.                  | Expand tests listed in the recommendations.                  |
| I-1 | Low      | Documentation     | Several claims are accurate but should distinguish Temporal specification behavior from polyfill/engine behavior.             | Clarify support and compatibility wording.                   |

## 1. Adapter model and public API

### What is present

The package exports three adapters and three matching providers:

- `PlainDateAdapter` / `Temporal.PlainDate`
- `PlainDateTimeAdapter` / `Temporal.PlainDateTime`
- `ZonedDateTimeAdapter` / `Temporal.ZonedDateTime`

The split is appropriate: `PlainDate` has no time or zone, `PlainDateTime` has wall-clock time without a zone, and `ZonedDateTime` carries a time zone and requires an explicit provider zone. The package correctly treats Material's month index as zero-based while Temporal's `month` is one-based, and maps Temporal's ISO day-of-week numbering to Material's Sunday-zero convention.

Relevant implementation:

- `packages/material-temporal-adapter/src/shared/base-temporal-adapter.ts:36-149`
- `packages/material-temporal-adapter/src/plain-date/plain-date-adapter.ts:17-175`
- `packages/material-temporal-adapter/src/plain-datetime/plain-datetime-adapter.ts:17-254`
- `packages/material-temporal-adapter/src/zoned-datetime/zoned-datetime-adapter.ts:25-332`
- `packages/material-temporal-adapter/src/public-api.ts:1-39`

### Contract comparison

The implementation covers the required `DateAdapter` methods and the timepicker methods. It also overrides `deserialize()` to accept ISO strings, which is important for Material inputs such as min/max values. The invalid-sentinel design follows the same broad Material pattern as `NativeDateAdapter`: invalid input remains a date instance but fails `isValid()`.

The comparison baseline is Angular Material's [`DateAdapter`](https://github.com/angular/components/blob/main/src/material/core/datetime/date-adapter.ts) and [`NativeDateAdapter`](https://github.com/angular/components/blob/main/src/material/core/datetime/native-date-adapter.ts), plus the [Material timepicker format requirements](https://github.com/angular/components/blob/main/src/material/timepicker/timepicker.md).

### A-1 — calendar arithmetic violates expected Material navigation behavior

**Evidence:** `base-temporal-adapter.ts:127-133` forwards `_overflow`, whose default is `'reject'`, to Temporal `add()`:

```ts
return date.add({ months }, { overflow: this._overflow }) as T;
```

With Temporal, `2024-01-31 + 1 month` and `2024-02-29 + 1 year` reject under `'reject'`. Angular Material invokes `addCalendarMonths()` and `addCalendarYears()` while navigating the calendar. Its native adapter clamps these transitions to a valid date rather than throwing.

**Impact:** normal navigation from a day near the end of a month, or from February 29 to a non-leap year, can produce an unhandled `RangeError` for all three adapters using the default options.

**Recommendation:** make calendar navigation arithmetic use `overflow: 'constrain'` independently of input-construction policy, or implement the same explicit clamping behavior as `NativeDateAdapter`. Add regression tests for Jan 31 → February and Feb 29 → non-leap year through each adapter.

## 2. Temporal semantics

### Correct choices

- `calendar` and `outputCalendar` are separated, with `withCalendar()` used for display.
- Zoned construction has explicit `timezone`, DST `disambiguation`, and offset options.
- Invalid Temporal values are represented by adapter-owned sentinels because Temporal does not provide an invalid `PlainDate`/`PlainDateTime` instance.
- Epoch conversion for zoned values uses the configured zone.
- Zoned rounding is applied only in formatting and ISO output, and not silently to the stored picker value.

These choices are consistent with the [TC39 Temporal proposal documentation](https://tc39.es/proposal-temporal/docs/), especially the `PlainDate`, `PlainDateTime`, `ZonedDateTime`, calendar, overflow, and rounding sections.

### D-1 — `PlainDateTime` serialization documentation is misleading

**Evidence:** `plain-datetime-adapter.ts:77-79` implements:

```ts
return date.toPlainDate().toString();
```

However, `docs/usage.md:195-208` recommends `adapter.toIso8601(value)` followed by `adapter.parse(iso)` as a serialization round trip, and `docs/ssr-considerations.md:27-29` recommends the same general approach. A non-midnight `Temporal.PlainDateTime` therefore loses its time. Existing round-trip coverage (`src/tests/shared/round-trip.spec.ts:34-45`) uses midnight values and does not expose this loss.

**Recommendation:** either make `toIso8601()` preserve the full `PlainDateTime` string and separately handle Material's date-only HTML attribute needs, or change the documentation and method contract to state explicitly that it is date-only and add a separate full-value serialization path. Add a non-midnight round-trip test.

### I-1 — support claims need a sharper boundary

The code forwards calendar identifiers to Temporal and `Intl`; actual support can differ between native engines, ICU data, and polyfills. The calendar support document acknowledges this, but claims about “tested calendars” and skipped Islamic variants should always be read as “tested with the repository's current polyfill and CI runtime”, not as a guarantee of cross-engine compatibility. Keep the existing feature-detection guidance and link it from every non-ISO calendar example.

## 3. Formatting, parsing, and invalid values

### Strengths

- All default `MatDateFormats` objects include `parse.timeInput`, `display.timeInput`, and `display.timeOptionLabel`, which are required by the Material timepicker.
- Empty strings become `null`; failed non-empty parsing produces the adapter sentinel.
- `isDateInstance()` accepts both real Temporal instances and sentinels, while `isValid()` rejects sentinels.
- `PlainDateAdapter` deliberately rejects time mutation rather than pretending a date-only value has a meaningful time.

Relevant files:

- `packages/material-temporal-adapter/src/formats/date-formats.ts`
- `packages/material-temporal-adapter/src/formats/datetime-formats.ts`
- `packages/material-temporal-adapter/src/formats/zoned-formats.ts`
- `packages/material-temporal-adapter/src/shared/invalid.ts`

### Follow-up checks

1. Add tests for `deserialize()` with min/max-style ISO strings for every adapter.
2. Add tests proving `format()` and `toIso8601()` reject sentinels without invoking Temporal methods on the sentinel object.
3. Add tests for fractional seconds and verify whether the deliberate second-level timepicker API should preserve or clear sub-second fields.
4. Add tests for malformed zoned strings containing a bracketed zone, offset-policy conflicts, and rejected DST transitions.

## 4. Demo review

### D-2 — DST stories are not DST tests

`apps/demo/src/stories/zoned-datetime/zoned.stories.ts:107-146` labels stories as DST gap/overlap cases, but the rendered explorer is initialized with a May 26 date and the shared demo implementation (`apps/demo/src/stories/shared/demo-components.ts:497-560,609-613`) does not construct a nonexistent or ambiguous local time. No assertion checks the configured `disambiguation` result.

**Recommendation:** use fixed transition inputs such as a known spring-forward gap and fall-back overlap in `America/New_York`; show the input, selected result, and error/result for each disambiguation mode. Add Storybook interaction assertions or package integration tests for the same cases.

### D-3 — Storybook setup guide is inaccurate

`apps/demo/src/stories/docs/StorybookSetup.mdx:11-83` presents production `provide*Adapter()` helpers, while `apps/demo/src/stories/shared/story-providers.ts:23-103` manually supplies `DateAdapter`, options, locale, and formats to avoid Storybook/Material token-bundle issues. The guide should describe the actual demo wiring and link to the production quickstart separately.

### D-4 — demo README is stale

`apps/demo/README.md:3-55` describes `ng serve`, `ng build`, Karma, and E2E commands. The demo package exposes only `storybook` and `build-storybook` (`apps/demo/package.json:4-7`), and its Angular configuration is Storybook-oriented. This is likely to mislead contributors and should be replaced with the commands used by the root scripts.

## 5. Test strategy and CI review

### Current strategy

- Unit tests cover the three adapter families, shared behavior, invalid sentinels, round trips, providers, calendars, and one datepicker/timepicker integration case.
- Compile-time tests run through Vitest typechecking.
- Coverage uses V8 with thresholds of 90% lines/statements/functions and 80% branches (`packages/material-temporal-adapter/vitest.config.ts:14-27`).
- CI runs lint, package build, package tests, coverage, and a Storybook build (`.github/workflows/ci.yml:27-50`).

### T-1 — demo tests are not actually run

`package.json:15-17` exposes `demo:e2e` as `pnpm --filter demo test:e2e`, but `apps/demo/package.json:4-7` has no `test:e2e` script. CI builds Storybook but does not execute Storybook `play` functions or any browser tests. Thus the interaction stories are source-level checks only, not CI-tested behavior.

**Recommendation:** choose one supported approach:

- configure a real Storybook test runner/Playwright target and run it in CI; or
- remove `demo:e2e` and explicitly document that stories are visual/manual only.

Do not describe the current setup as E2E coverage until a browser runner executes it.

### T-2 — high-value coverage gaps

The passing coverage report is useful but does not establish behavioral completeness. Add tests for:

- Material month/year navigation across clamped month and leap-year boundaries;
- non-midnight `PlainDateTime` serialization;
- `getDateNames()` and `getMonthNames()` for every supported calendar, including unsupported-calendar failure behavior;
- locale changes after construction and locale-specific first-day-of-week fallback;
- all `deserialize()` input classes and invalid sentinel handling;
- DST gap/overlap behavior for each supported disambiguation policy;
- rounding output versus stored value;
- datepicker min/max/filter and date-range behavior with non-ISO calendars;
- actual rendered Material datepicker/timepicker flows, not only direct adapter method calls.

Also consider a small compatibility matrix for the supported Angular/Material peer range (18–20) and the supported Temporal polyfill choices. The current CI matrix only runs Node 20 (`.github/workflows/ci.yml:10-14`).

## 6. Documentation review by section

| Section                      | Assessment                                                                                                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root README                  | Clear entry point and adapter selection table. Add an explicit warning that default calendar arithmetic currently has a navigation defect until A-1 is fixed.                       |
| `docs/quickstart.md`         | Good install/polyfill/provider flow. The `MAT_DATE_LOCALE` example should be verified with the exact provider return shape, and the date-time serialization caveat should be added. |
| `docs/usage.md`              | Broad and useful coverage of forms, ranges, timepicker, formats, calendars, and SSR. Correct D-1 and state that `parseFormat` is intentionally ignored.                             |
| `docs/behavior-notes.md`     | Good explanation of sentinels and zones. Its statement that `add()` receives the configured overflow needs to be reconciled with Material's clamping contract.                      |
| `docs/calendar-support.md`   | Helpful feature-detection and polyfill caveats. Keep Islamic support explicitly experimental/uncovered.                                                                             |
| `docs/ssr-considerations.md` | Correctly emphasizes polyfill order and explicit zones. Fix the claim that `toIso8601()` is safe for all Temporal values, especially `PlainDateTime`.                               |
| `docs/design-rationale.md`   | The split-adapter and sentinel rationale is coherent; add the Material navigation arithmetic decision once A-1 is resolved.                                                         |
| `docs/temporal-ecosystem.md` | Scope boundary is useful. External library recommendations should be periodically checked for availability and maintenance.                                                         |
| Package README               | Good API summary but repeats D-1's serialization ambiguity and should link to the actual Storybook setup distinction.                                                               |
| Demo Storybook docs          | Useful scenario index and configuration snippets, but D-2 and D-3 reduce their evidentiary value.                                                                                   |
| Demo README                  | Replace stale Angular CLI scaffold instructions per D-4.                                                                                                                            |

## 7. Validation performed

Commands were run from the repository root after `pnpm install --frozen-lockfile`:

| Command           | Result                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| `pnpm lint`       | Passes, but reports that the selected workspace packages have no `lint` script; this is not lint analysis. |
| `pnpm build`      | Passes; Angular package built successfully.                                                                |
| `pnpm test`       | Passes: 163 tests passed, 1 Islamic test skipped; type errors: none.                                       |
| `pnpm test:cov`   | Passes: 90.82% lines, 88.44% branches, 94% functions, 90.82% statements.                                   |
| `pnpm demo:build` | Passes after the Storybook build completed; this validates compilation, not browser interactions.          |

The initial pre-install attempts for build, test, and demo build failed only because dependencies were absent (`node_modules` did not exist). No repository source failure was inferred from those initial failures.

## 8. Recommended order of work

1. Fix and regression-test A-1 before production use.
2. Resolve D-1 by deciding whether `toIso8601()` is full-value serialization or date-only HTML serialization.
3. Add real browser execution for demo interactions, or remove unsupported E2E claims.
4. Replace the DST stories with deterministic gap/overlap scenarios.
5. Correct Storybook and demo README instructions.
6. Expand contract/integration tests and add a supported-runtime compatibility matrix.

## References

- [Angular Material `DateAdapter`](https://github.com/angular/components/blob/main/src/material/core/datetime/date-adapter.ts)
- [Angular Material `NativeDateAdapter`](https://github.com/angular/components/blob/main/src/material/core/datetime/native-date-adapter.ts)
- [Angular Material timepicker documentation](https://github.com/angular/components/blob/main/src/material/timepicker/timepicker.md)
- [TC39 Temporal documentation](https://tc39.es/proposal-temporal/docs/)
- [Temporal PlainDate](https://tc39.es/proposal-temporal/docs/plaindate.html)
- [Temporal PlainDateTime](https://tc39.es/proposal-temporal/docs/plaindatetime.html)
- [Temporal ZonedDateTime](https://tc39.es/proposal-temporal/docs/zoneddatetime.html)
- [Temporal calendars](https://tc39.es/proposal-temporal/docs/calendars.html)
- [Temporal overflow](https://tc39.es/proposal-temporal/docs/overflow.html)
