# material-temporal-adapter

Community-maintained **Temporal `DateAdapter`** implementations for Angular Material — datepicker, timepicker, and date ranges.

> Not affiliated with Angular or Google. Extracted from [angular/components#32668](https://github.com/angular/components/pull/32668).

## Quick start

```bash
pnpm add @kbrilla/material-temporal-adapter temporal-polyfill
```

```typescript
// main.ts — polyfill first
import 'temporal-polyfill/global';

// app.config.ts
import {providePlainDateAdapter} from '@kbrilla/material-temporal-adapter';

export const appConfig = {
  providers: [providePlainDateAdapter()],
};
```

```typescript
// component.ts
date = new FormControl<Temporal.PlainDate | null>(null);
```

Full walkthrough: **[docs/quickstart.md](./docs/quickstart.md)**

## Which adapter?

| Adapter | Temporal type | When to use |
| --- | --- | --- |
| `PlainDateAdapter` | [`Temporal.PlainDate`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate) | Date only |
| `PlainDateTimeAdapter` | [`Temporal.PlainDateTime`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDateTime) | Date + time, no time zone |
| `ZonedDateTimeAdapter` | [`Temporal.ZonedDateTime`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime) | Date + time + **required** `timezone` |

```typescript
providePlainDateAdapter()
providePlainDateTimeAdapter()
provideZonedDateTimeAdapter({timezone: 'UTC'})
```

See [docs/usage.md](./docs/usage.md) for forms, ranges, timepicker, custom formats, and per-route setup.

## Documentation

| Document | Topic |
| --- | --- |
| [docs/quickstart.md](./docs/quickstart.md) | Install → polyfill → provider → component |
| [docs/usage.md](./docs/usage.md) | Forms, validation, formats, calendars |
| [docs/behavior-notes.md](./docs/behavior-notes.md) | Overflow, invalid sentinel, rounding, locale |
| [docs/design-rationale.md](./docs/design-rationale.md) | **Why** — sentinels, split adapters, timezone, scope |
| [docs/temporal-ecosystem.md](./docs/temporal-ecosystem.md) | Helper libraries (temporal-kit, tempo) vs Day.js gaps |
| [docs/calendar-support.md](./docs/calendar-support.md) | Tested calendars; Islamic skip |
| [docs/ssr-considerations.md](./docs/ssr-considerations.md) | Polyfill order, hydration, timezone |
| [docs/README.md](./docs/README.md) | Documentation index |

Package API reference: [packages/material-temporal-adapter/README.md](./packages/material-temporal-adapter/README.md)

## Beyond this package: Temporal ergonomics

This repo is **Material `DateAdapter` integration only** — not Day.js-style utilities, token format strings, or generic validators.

| Need | Use |
| --- | --- |
| Picker + forms wired to Temporal | **This package** |
| Invalid value while user types bad input | **`isTemporalInvalid()` here** — Material-specific; see [design-rationale.md](./docs/design-rationale.md#invalid-sentinels-the-ugly-objects) |
| `startOf`, `isBetween`, `formatRelative` | [temporal-kit](https://github.com/KristjanESPERANTO/temporal-kit) |
| Token `format('DD/MM/YYYY')` | [@formkit/tempo](https://tempo.formkit.com/) |
| Cookbook without dependencies | [TC39 Temporal cookbook](https://github.com/tc39/proposal-temporal/blob/main/docs/cookbook.md) |

Full comparison and stack recommendations: **[docs/temporal-ecosystem.md](./docs/temporal-ecosystem.md)**

## Live demo (Storybook)

Interactive examples with **exact provider configurations** on every story:

**https://kbrilla.github.io/material-temporal-adapter/**

Local:

```bash
pnpm install
pnpm demo          # http://localhost:6006
pnpm demo:build    # static output in apps/demo/storybook-static
```

The Storybook **Docs** section lists copy-paste configs for each scenario (calendars, DST, invalid handling, forms). Production setup stays in `docs/` — Storybook docs cover demo wiring only.

## Packages

| Path | npm | Description |
| --- | --- | --- |
| [packages/material-temporal-adapter](./packages/material-temporal-adapter/) | `@kbrilla/material-temporal-adapter` *(publish pending)* | Split adapters: PlainDate, PlainDateTime, ZonedDateTime |
| [apps/demo](./apps/demo/) | *(private)* | Storybook demo |

## Development

```bash
pnpm install
pnpm build          # build package(s)
pnpm test           # unit tests (101 cases)
pnpm test:cov       # coverage
pnpm demo:build     # Storybook static
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for changesets and release process.

## License

MIT — see [LICENSE](./LICENSE).
