# Contributing

Thanks for helping improve `@kbrilla/material-temporal-adapter`.

## Prerequisites

- **Node.js 20+** (see `.nvmrc`)
- **pnpm 9+** (`corepack enable` recommended)

## Setup

```bash
git clone https://github.com/kbrilla/material-temporal-adapter.git
cd material-temporal-adapter
pnpm install
```

## Build and test

From the repository root:

```bash
pnpm build          # ng-packagr build for packages/*
pnpm test           # Vitest in packages/material-temporal-adapter
pnpm test:cov       # coverage (≥90% line target for the package)
pnpm lint           # ESLint where configured
pnpm demo           # Storybook on http://localhost:6006
pnpm demo:build     # static Storybook in apps/demo/storybook-static
pnpm demo:e2e       # Playwright visual tests (requires demo build)
```

Package-only:

```bash
pnpm --filter @kbrilla/material-temporal-adapter build
pnpm --filter @kbrilla/material-temporal-adapter test
```

## Project layout

- `packages/material-temporal-adapter/` — publishable library
- `apps/demo/` — Storybook examples (not published to npm)
- `docs/` — behavior, migration, calendar, SSR guides

## Code style

- Match existing TypeScript and Angular patterns in the package.
- MIT license header: `Copyright (c) Krzysztof Brilla`.
- No `TemporalDateAdapter`, `PlainTemporalAdapter`, or `MAT_BASE_TEMPORAL_OPTIONS` — split adapters only.

## Changesets

Releases use [Changesets](https://github.com/changesets/changesets).

1. After your PR is ready, add a changeset:

   ```bash
   pnpm changeset
   ```

   Choose `@kbrilla/material-temporal-adapter` and the appropriate semver bump.

2. Maintainers run `pnpm changeset version` on `main` and publish via CI (`release` workflow) or:

   ```bash
   pnpm release
   ```

Configuration: `.changeset/config.json` (`access: public`, `baseBranch: main`).

## Pull requests

- Keep PRs focused; include tests for behavior changes.
- Update `docs/` and package `README.md` when user-facing behavior changes.
- Ensure `pnpm build && pnpm test:cov` pass locally.

## Issues

Report bugs and feature requests at https://github.com/kbrilla/material-temporal-adapter/issues.

For upstream Angular Material integration, use https://github.com/angular/components/issues/25753 and PR #32668.
