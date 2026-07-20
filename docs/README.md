# Documentation

Guides for `@kbrilla/material-temporal-adapter`.

## Getting started

| Guide | Description |
| --- | --- |
| [quickstart.md](./quickstart.md) | Install, polyfill, provider, component — end-to-end in 5 steps |
| [usage.md](./usage.md) | Forms, ranges, timepicker, formats, calendars, per-route providers |

## Reference

| Guide | Description |
| --- | --- |
| [behavior-notes.md](./behavior-notes.md) | Overflow, invalid sentinel, locale, rounding, DST |
| [design-rationale.md](./design-rationale.md) | **Decision log** — why sentinels, split adapters, required timezone |
| [temporal-ecosystem.md](./temporal-ecosystem.md) | Helper libraries vs Day.js; what stays in this repo |
| [calendar-support.md](./calendar-support.md) | Tested calendars, Islamic skip, feature detection |
| [ssr-considerations.md](./ssr-considerations.md) | Polyfill order, hydration, explicit timezone |

## Reviews

| Document | Description |
| --- | --- |
| [reviews/2026-07-19-feature-and-code-review.md](./reviews/2026-07-19-feature-and-code-review.md) | Feature, docs, demo, testing strategy, and code review vs Material `DateAdapter` + Temporal |
| [reviews/2026-07-19-independent-implementation-review.md](./reviews/2026-07-19-independent-implementation-review.md) | Second independent pass: verified bugs (incl. zoned parse time loss, non-Gregorian label rendering), edge-case walkthrough, gaps + mitigations |
| [reviews/2026-07-19-review-of-the-review.md](./reviews/2026-07-19-review-of-the-review.md) | Meta-review of the first review: claim-by-claim verification, refuted/overstated items, missed findings |
| [reviews/2026-07-19-final-combined-review.md](./reviews/2026-07-19-final-combined-review.md) | **Decision document** — canonical findings register (F1–F14), maintainer decisions (D1–D7), test plan, release sequencing |
| [reviews/2026-07-20-vendor-demo-audit.md](./reviews/2026-07-20-vendor-demo-audit.md) | Byte-level audit of `temporal-adapter-demo`'s `vendor/` tarballs: no custom Material patches; PR #32668 shares F1–F5; origin of the Playwright claims |

## Package & demo

| Resource | Link |
| --- | --- |
| Package README | [packages/material-temporal-adapter/README.md](../packages/material-temporal-adapter/README.md) |
| Live Storybook (exact configs per story) | https://kbrilla.github.io/material-temporal-adapter/ |
| Contributing | [CONTRIBUTING.md](../CONTRIBUTING.md) |

Production apps: start with [quickstart.md](./quickstart.md). For copy-paste provider configs tied to each visual demo, use the Storybook **Docs** section in the live demo.
