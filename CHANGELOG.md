# Changelog

Monorepo release notes. Package-specific history: [packages/material-temporal-adapter/CHANGELOG.md](./packages/material-temporal-adapter/CHANGELOG.md).

## 0.1.0 — 2026-05-26

### @kbrilla/material-temporal-adapter

Initial public release of the community Temporal adapter extracted from [angular/components#32668](https://github.com/angular/components/pull/32668).

- **Split adapters only** — `PlainDateAdapter`, `PlainDateTimeAdapter`, `ZonedDateTimeAdapter` with matching `provide*Adapter()` functions
- Dropped unified `TemporalDateAdapter` and hybrid `PlainTemporalAdapter` from the upstream prototype
- Per-adapter options tokens; no `MAT_BASE_TEMPORAL_OPTIONS`
- Required explicit `timezone` for zoned adapter (no system default)
- Documentation under `docs/` and package README
- Storybook demo in `apps/demo` (not published to npm)

### Repository

- pnpm workspace monorepo (`packages/*`, `apps/*`)
- Vitest unit tests; Storybook + Playwright in demo app
- Changesets for npm publish workflow
