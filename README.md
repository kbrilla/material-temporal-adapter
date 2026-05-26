# material-temporal-adapter

Monorepo for **@kbrilla/material-temporal-adapter** — community-maintained Temporal `DateAdapter` implementations for Angular Material (datepicker, timepicker, date ranges).

> Not affiliated with Angular or Google. Extracted from [angular/components#32668](https://github.com/angular/components/pull/32668).

## Packages

| Path | npm | Description |
| --- | --- | --- |
| [packages/material-temporal-adapter](./packages/material-temporal-adapter/) | [`@kbrilla/material-temporal-adapter`](https://www.npmjs.com/package/@kbrilla/material-temporal-adapter) | Split adapters: PlainDate, PlainDateTime, ZonedDateTime |
| [apps/demo](./apps/demo/) | *(private)* | Storybook demo and visual/interaction tests |

**Package documentation:** [packages/material-temporal-adapter/README.md](./packages/material-temporal-adapter/README.md)

## Documentation

| Document | Topic |
| --- | --- |
| [docs/migration-from-pr.md](./docs/migration-from-pr.md) | Migrate from the Angular PR prototype |
| [docs/behavior-notes.md](./docs/behavior-notes.md) | Overflow, invalid sentinel, rounding, locale |
| [docs/calendar-support.md](./docs/calendar-support.md) | Tested calendars; Islamic skip |
| [docs/ssr-considerations.md](./docs/ssr-considerations.md) | Polyfill order, hydration, timezone |

## Demo

Local Storybook:

```bash
pnpm install
pnpm demo
```

Open http://localhost:6006.

**Hosted demo (GitHub Pages):** https://kbrilla.github.io/material-temporal-adapter/ — deployed from `apps/demo` Storybook static build (workflow in `.github/workflows/deploy-demo.yml`).

The older reference demo at [temporal-adapter-demo](https://github.com/kbrilla/temporal-adapter-demo) targets the upstream PR vendor layout; prefer this repo’s `apps/demo` for split-adapter examples.

## Development

```bash
pnpm install
pnpm build          # build package(s)
pnpm test           # unit tests
pnpm test:cov       # coverage
pnpm demo:build     # Storybook static
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details and release process.

## License

MIT — see [LICENSE](./LICENSE).
