# Changelog

## 0.2.0

### Minor Changes

- 837f5f9: Structural cleanup, expanded adapter test coverage, Storybook play interactions, CI coverage reporting, and release workflow enablement ahead of the initial npm publish.

All notable changes to `@kbrilla/material-temporal-adapter` are documented here.

## 0.1.0 — 2026-05-26

### Added

- **Split adapters API** — three dedicated `DateAdapter` implementations:
  - `PlainDateAdapter` + `providePlainDateAdapter()` for `Temporal.PlainDate`
  - `PlainDateTimeAdapter` + `providePlainDateTimeAdapter()` for `Temporal.PlainDateTime`
  - `ZonedDateTimeAdapter` + `provideZonedDateTimeAdapter()` for `Temporal.ZonedDateTime` (required `timezone`)
- Per-adapter DI tokens: `MAT_TEMPORAL_PLAIN_DATE_OPTIONS`, `MAT_TEMPORAL_PLAIN_DATETIME_OPTIONS`, `MAT_TEMPORAL_ZONED_OPTIONS`
- Default format tokens: `MAT_TEMPORAL_DATE_FORMATS`, `MAT_TEMPORAL_DATETIME_FORMATS`, `MAT_TEMPORAL_ZONED_FORMATS`
- Shared `BaseTemporalAdapter` with calendar/`outputCalendar` support via `withCalendar()`
- Invalid value helpers: `isTemporalInvalid()`, `createInvalidPlainDate*`, `createInvalidZonedDateTime`
- BYO Temporal polyfill check (`ensureTemporalAvailable()`)
- Zoned options: `disambiguation`, `offset`, `rounding`
- Vitest test suite (plain, zoned, shared, integration)

### Removed (vs Angular PR prototype)

- Unified `TemporalDateAdapter` and `provideTemporalDateAdapter()`
- Hybrid `PlainTemporalAdapter` / `providePlainTemporalAdapter()` with `mode: 'date' | 'datetime'`
- `MAT_BASE_TEMPORAL_OPTIONS` shared token
- `MatTemporalModule` / schematics

### Changed (vs PR)

- Package name: `@kbrilla/material-temporal-adapter` (MIT, community-maintained)
- Zoned provider signature: `provideZonedDateTimeAdapter(options, formats?)` — options first; **timezone required**
- Format/token renames (`MAT_TEMPORAL_*` prefix)
- Month/day label reference year 2017; formatting always uses `withCalendar` for output calendar
