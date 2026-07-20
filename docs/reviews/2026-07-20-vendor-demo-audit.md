# Vendor audit: `kbrilla/temporal-adapter-demo` `vendor/` folder

**Date:** 2026-07-20
**Subject:** https://github.com/kbrilla/temporal-adapter-demo (checked out at `d15d58b`), specifically `vendor/angular-material.tgz`, `vendor/angular-cdk.tgz`, `vendor/angular-material-temporal-adapter.tgz`.
**Question answered:** "Did we make vendor-specific changes there?" — i.e. do the vendored tarballs contain hand-patched Angular Material picker code that this repo's reviews should account for?

**Answer: No custom Material modifications exist in the tarballs.** They are clean, unmodified builds of the upstream PR branch. Verified at byte level, method below.

---

## 1. What the vendor folder actually is

| Tarball | Package | Version | Origin |
| --- | --- | --- | --- |
| `angular-material.tgz` | `@angular/material` | `0.0.0` (dev build) | `kbrilla/components` branch `temporal-adapter-25753`, commit `335f340` |
| `angular-cdk.tgz` | `@angular/cdk` | `0.0.0` (dev build) | Same build |
| `angular-material-temporal-adapter.tgz` | `@angular/material-temporal-adapter` | `21.2.0-next.0+sha-335f340` | Same build — this is the PR #32668 adapter package |

The demo's `package.json` wires all three via `file:vendor/*.tgz`. The vendoring exists for two mechanical reasons, not because of code changes:

1. `@angular/material-temporal-adapter` has never been published to npm (it only exists on the PR branch).
2. That package's peer range requires `@angular/material@21.2.0-next.0+sha-335f340`, so the matching dev builds of Material and CDK had to be vendored alongside it.

Commit `335f340` ("feat(material-temporal-adapter): add Temporal API date adapter for Angular Material") is the head commit of angular/components PR [#32668](https://github.com/angular/components/pull/32668) (state at audit time: OPEN, `mergeable: CONFLICTING`).

## 2. Verification method and result

The FESM bundles in the tarballs ship sourcemaps with embedded `sourcesContent` — the original TypeScript. I extracted those sources and byte-diffed them against a checkout of `kbrilla/components` at `335f340`:

| Compared surface | Files | Result |
| --- | --- | --- |
| `src/material/datepicker/**` (from `datepicker.mjs.map`) | 29 (`calendar.ts`, `month-view.ts`, `year-view.ts`, `multi-year-view.ts`, all inputs/range parts, templates) | **Byte-identical** |
| `src/material/timepicker/**` (from `timepicker.mjs.map`) | 7 | **Byte-identical** |
| `src/material/core/datetime/**` (from `core.mjs.map`) | `date-adapter` deps incl. `native-date-adapter.ts` | **Byte-identical** |
| `src/material-temporal-adapter/**` (from adapter map) | 9 | **Byte-identical** |

Cross-check: the PR #32668 file list itself touches only two files under `src/material` — `datepicker.md` and `timepicker.md` (documentation). No picker runtime code is modified anywhere on the branch.

**Consequences for the review backlog:**

- The first review's §20.2 statement ("the vendored tarball is a Material 21 rebuild, not a custom picker patch set") is now **verified at byte level**, upgraded from inference.
- **Decision D6 stands as written:** there is no hidden, already-written Material-side navigation clamp anywhere — the upstream PR (issue + patch for `calendar.ts` month/year navigation clamping) would have to be authored from scratch.

## 3. The vendored adapter is the upstream PR variant — and it shares the same bugs

The tarball contains both the unified `TemporalDateAdapter` and the split adapters (`plain-temporal-adapter.ts`, `MAT_BASE_TEMPORAL_OPTIONS`, field-`inject()` DI — everything the community package intentionally dropped). Relevant to this repo's findings register (`2026-07-19-final-combined-review.md`), the PR code has the **same defect classes**, confirmed by reading the extracted sources:

| Finding | Present in PR #32668 code? | Note |
| --- | --- | --- |
| **F1** — default `overflow: 'reject'` applied to `addCalendarYears/Months/Days` | **Yes** (`options?.overflow ?? 'reject'`; `date.add({months}, {overflow: this._overflow})`) | Same navigation `RangeError` risk in the upstream PR |
| **F2** — `clone` via `Temporal.*.from(date.toString())` + `_invalid`-branded sentinels + `deserialize` clones any instance | **Yes** (identical pattern; `isValid` uses an `isNaN(date.year)` check instead of `instanceof`, but `clone(sentinel)` still hits `from("[object Object]")`) | Same crash class |
| **F3** — zoned `_parseString` falls back to `PlainDate.from(value)` at midnight | **Yes — code is line-for-line the same fallback** | Same silent time-of-day loss for offset-only/bare datetime strings; `Z` strings unparseable |
| **F4/F5** — `getDateNames`/`getMonthNames` built from a fixed reference year with default-constrain clamping | **Yes, same mechanism** (split adapters use reference year **2024**, unified uses 2017; which labels are wrong differs by year, the bug class is identical) | Upstream `getDayOfWeekNames` correctly uses Jan 7–13 2024 (Sunday-first), so only day/month names are affected |

**Implication:** fixes F1–F5 in this repo should be mirrored to (or at least cross-referenced on) PR #32668 if that PR is still being pursued — otherwise the PR is shipping the same P0/P1 defects the community package is about to fix. Since maintainers already steered toward a community adapter and the PR is in a conflicting state, the pragmatic move is a PR comment linking this repo's findings register rather than reworking the branch.

## 4. Origin of the false Playwright claims (finding F8) — and a free fix

The old demo repo has what the monorepo only claims to have:

- `test-storybook` / `test-storybook:ci` scripts (Storybook test-runner via `concurrently` + `wait-on`),
- Playwright installed and cached in CI (`ci.yml`, `deploy-storybook.yml` both install browsers and run interaction tests against a served static build before deploy).

So the monorepo's `CONTRIBUTING.md` "Playwright visual tests" line and the CHANGELOG "Storybook + Playwright" wording are almost certainly **inherited from this repo during the migration**, while the tooling itself was not migrated. That reframes F8 from "false claim" to "migration remainder" — and provides the cheapest honest fix: port the old demo's test-runner CI pattern (roughly: add `@storybook/test-runner` + `wait-on` + `concurrently` devDeps, a `test-storybook:ci` script, and the serve-then-test CI step) instead of deleting the claims. The current monorepo demo already has story `play` functions that the runner would execute.

## 5. Other reusable assets in the old demo

Worth harvesting when working the F4/F5/F9 backlog items:

- `matrix-test-suite` / `adapter-test-suite` / `edge-cases-test` story components — in-browser assertion suites across calendars, larger than the monorepo's current matrix.
- `japanese-calendar-debug` story — era-labeling probe useful for the F5 calendar-support rewrite.
- `material-examples` — copies of official Material datepicker examples wired to the Temporal adapter; good seed corpus for the F9 TestBed fixture suite.
- README banner already points users to the community split-adapter package (this repo), so the two repos' roles are correctly documented; the old demo targets the unified-adapter PR only.

## 6. Summary

- `vendor/` = unmodified dev builds of `kbrilla/components@335f340` (PR #32668). **No vendor-specific Material or CDK patches exist.** The recollection of "vendor specific changes" most likely refers to the act of vendoring pre-release builds itself (and the `file:` wiring), not to code modifications.
- The upstream PR adapter carries the same F1–F5 defect classes as v0.2.0 of the community package; fixing them here does not fix them there.
- F8's Playwright claims trace back to this repo's real CI; porting its test-runner setup is a better resolution than deleting the claims.
