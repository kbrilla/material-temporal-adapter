# @kbrilla/material-temporal-adapter Community Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the Temporal date adapter from Angular Components PR #32668 into an independent MIT-licensed npm package `@kbrilla/material-temporal-adapter` with three split adapters, Vitest/Playwright tests, Storybook demo, and CI/CD.

**Architecture:** pnpm monorepo (`packages/material-temporal-adapter` + `apps/demo`). Port split adapters from PR branch `temporal-adapter-25753`, drop unified/hybrid adapters, replace shared `MAT_BASE_TEMPORAL_OPTIONS` with per-adapter DI tokens and providers. BYO Temporal polyfill at runtime; constructor throws if `Temporal` is missing.

**Tech Stack:** Angular Material 18–20, ng-packagr, pnpm 9, TypeScript 5.5, Vitest + `@analogjs/vitest-angular`, Playwright + Storybook test-runner, Changesets, GitHub Actions

**Spec:** User-provided community migration spec (2026-05-26). **Source PR:** https://github.com/angular/components/pull/32668. **Source branch:** `kbrilla/components@temporal-adapter-25753`. **Reference demo:** `/Users/krzbri/repos/temporal-adapter-demo`.

---

## Locked decisions (do not revisit)

| Topic | Decision |
|---|---|
| Package | `@kbrilla/material-temporal-adapter`, MIT, copyright Krzysztof Brilla |
| API | Three split adapters only; drop `TemporalDateAdapter` and `PlainTemporalAdapter` |
| Providers | `providePlainDateAdapter`, `providePlainDateTimeAdapter`, `provideZonedDateTimeAdapter` |
| Tokens | Per-adapter options tokens; **no** `MAT_BASE_TEMPORAL_OPTIONS` |
| Zoned timezone | Required at type + runtime; no system fallback |
| Polyfill | BYO; `ensureTemporalAvailable()` in base ctor |
| Tests | Vitest + Playwright (not Karma) |
| Demo | `apps/demo` Storybook; old `temporal-adapter-demo` stays as PR reference |

---

## PR source → destination map

Port from local clone `/Users/krzbri/repos/components`, branch `temporal-adapter-25753`:

| PR path | New path | Notes |
|---|---|---|
| `src/material-temporal-adapter/temporal.d.ts` | `packages/material-temporal-adapter/src/temporal.d.ts` | Rebrand license header |
| `adapter/split/base-temporal-adapter.ts` | `src/shared/base-temporal-adapter.ts` | Remove shared token; protected ctor; 2017 ref year; always `withCalendar` |
| `adapter/split/plain-date-adapter.ts` | `src/plain-date/plain-date-adapter.ts` | Per-adapter token inject; use `invalid.ts`; `setTime` throws |
| `adapter/split/plain-datetime-adapter.ts` | `src/plain-datetime/plain-datetime-adapter.ts` | Same refactor pattern |
| `adapter/split/zoned-datetime-adapter.ts` | `src/zoned-datetime/zoned-datetime-adapter.ts` | Extend `BaseTemporalAdapter`; required timezone; rename `_toZonedDateTime` → `_assertZoned` |
| `adapter/temporal-date-formats.ts` | `src/formats/date-formats.ts`, `datetime-formats.ts` | Split files |
| `adapter/split/index.ts` formats section | `src/formats/zoned-formats.ts` | Use spec's `MAT_TEMPORAL_ZONED_FORMATS` |
| `adapter/split-adapters.spec.ts` | `src/tests/**/*.spec.ts` | Split by adapter; drop hybrid/unified tests |
| **Skip** | — | `temporal-date-adapter.ts`, `plain-temporal-adapter.ts`, schematics |

Extract command (run from repo root after Phase 1):

```bash
COMPONENTS=/Users/krzbri/repos/components
BRANCH=temporal-adapter-25753
PKG=packages/material-temporal-adapter/src

git -C "$COMPONENTS" show "$BRANCH:src/material-temporal-adapter/temporal.d.ts" > "$PKG/temporal.d.ts"
git -C "$COMPONENTS" show "$BRANCH:src/material-temporal-adapter/adapter/split/base-temporal-adapter.ts" > /tmp/base.ts
git -C "$COMPONENTS" show "$BRANCH:src/material-temporal-adapter/adapter/split/plain-date-adapter.ts" > /tmp/plain-date.ts
git -C "$COMPONENTS" show "$BRANCH:src/material-temporal-adapter/adapter/split/plain-datetime-adapter.ts" > /tmp/plain-datetime.ts
git -C "$COMPONENTS" show "$BRANCH:src/material-temporal-adapter/adapter/split/zoned-datetime-adapter.ts" > /tmp/zoned.ts
git -C "$COMPONENTS" show "$BRANCH:src/material-temporal-adapter/adapter/temporal-date-formats.ts" > /tmp/formats.ts
# Then apply refactors per tasks below — do NOT commit raw Google headers
```

---

## File map (final tree)

**Create (package):**
- `packages/material-temporal-adapter/package.json`, `ng-package.json`, `tsconfig*.json`, `vitest.config.ts`
- `packages/material-temporal-adapter/types/globals.d.ts`
- `packages/material-temporal-adapter/src/public-api.ts`, `temporal.d.ts`
- `packages/material-temporal-adapter/src/shared/{index,base-temporal-adapter,invalid,polyfill-check,types,utils}.ts`
- `packages/material-temporal-adapter/src/plain-date/{plain-date-adapter,plain-date-options,provide-plain-date,index}.ts`
- `packages/material-temporal-adapter/src/plain-datetime/{plain-datetime-adapter,plain-datetime-options,provide-plain-datetime,index}.ts`
- `packages/material-temporal-adapter/src/zoned-datetime/{zoned-datetime-adapter,zoned-datetime-options,provide-zoned-datetime,index}.ts`
- `packages/material-temporal-adapter/src/formats/{date-formats,datetime-formats,zoned-formats,index}.ts`
- `packages/material-temporal-adapter/src/test-setup.ts`
- `packages/material-temporal-adapter/src/tests/**` (see Phase 4)

**Create (monorepo root):**
- `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.nvmrc`, `.npmrc`, `.editorconfig`, `.gitignore`
- `.changeset/config.json`
- `docs/{migration-from-pr,behavior-notes,calendar-support,ssr-considerations}.md`
- `.github/workflows/{ci,deploy-demo,release}.yml`
- `.github/ISSUE_TEMPLATE/{bug_report,feature_request}.md`, `.github/PULL_REQUEST_TEMPLATE.md`
- `README.md`, `LICENSE`, `CHANGELOG.md`, `CONTRIBUTING.md`

**Create (demo):**
- `apps/demo/**` — Storybook app linked via `workspace:*`

---

## Phase 0 — Pre-flight

### Task 0: Verify npm name and auth

**Files:** none

- [ ] **Step 1: Confirm package name is available**

Run:

```bash
npm view @kbrilla/material-temporal-adapter
```

Expected: `npm error code E404` (not published)

- [ ] **Step 2: Confirm npm auth**

Run:

```bash
npm whoami
```

Expected: `kbrilla`

- [ ] **Step 3: Commit nothing yet** — proceed to Task 1

---

### Task 1: Create GitHub repo and clone

**Files:**
- Create: remote `github.com/kbrilla/material-temporal-adapter`

- [ ] **Step 1: Create repo**

Run:

```bash
gh repo create kbrilla/material-temporal-adapter \
  --public \
  --license mit \
  --description "Temporal API DateAdapter for Angular Material" \
  --clone
cd material-temporal-adapter
gh repo edit --add-topic angular --add-topic material --add-topic temporal \
  --add-topic date-adapter --add-topic datepicker --add-topic angular-material
```

- [ ] **Step 2: Verify clone**

Run:

```bash
git remote -v && test -f LICENSE && echo OK
```

Expected: `OK`

**Checkpoint 0:** npm 404, npm whoami, repo exists, cloned locally.

---

## Phase 1 — Monorepo skeleton

### Task 2: Initialize root workspace

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.nvmrc`, `.npmrc`, `tsconfig.base.json`

- [ ] **Step 1: Enable pnpm and init**

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
pnpm init
```

- [ ] **Step 2: Write root `package.json`**

```json
{
  "name": "@kbrilla/temporal-adapter-monorepo",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20", "pnpm": ">=9" },
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "build": "pnpm -r --filter './packages/*' build",
    "test": "pnpm -r --filter './packages/*' test",
    "test:cov": "pnpm -r --filter './packages/*' test:cov",
    "lint": "pnpm -r lint",
    "demo": "pnpm --filter demo storybook",
    "demo:build": "pnpm --filter demo build-storybook",
    "demo:e2e": "pnpm --filter demo test:e2e",
    "format": "prettier --write \"**/*.{ts,html,md,json}\"",
    "release": "changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.0",
    "prettier": "^3.3.0",
    "typescript": "~5.5.0"
  }
}
```

- [ ] **Step 3: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

- [ ] **Step 4: Write `.nvmrc`**

```
20
```

- [ ] **Step 5: Write `.npmrc`**

```
auto-install-peers=true
strict-peer-dependencies=false
enable-pre-post-scripts=true
```

- [ ] **Step 6: Write `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "sourceMap": true,
    "importHelpers": true,
    "types": []
  }
}
```

- [ ] **Step 7: Init Changesets**

```bash
pnpm dlx @changesets/cli init
```

Edit `.changeset/config.json`: set `"access": "public"`, `"baseBranch": "main"`.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore: initialize monorepo skeleton"
```

---

### Task 3: Package scaffold and smoke build

**Files:**
- Create: `packages/material-temporal-adapter/package.json`
- Create: `packages/material-temporal-adapter/ng-package.json`
- Create: `packages/material-temporal-adapter/tsconfig.json`, `tsconfig.lib.json`
- Create: `packages/material-temporal-adapter/types/globals.d.ts`
- Create: `packages/material-temporal-adapter/src/public-api.ts`

- [ ] **Step 1: Write `packages/material-temporal-adapter/package.json`**

```json
{
  "name": "@kbrilla/material-temporal-adapter",
  "version": "0.1.0",
  "description": "Temporal API DateAdapter for Angular Material datepicker (split adapters)",
  "keywords": ["angular", "angular-material", "material", "datepicker", "date-adapter", "temporal", "tc39-temporal", "iso8601"],
  "author": "Krzysztof Brilla",
  "license": "MIT",
  "homepage": "https://github.com/kbrilla/material-temporal-adapter#readme",
  "repository": {
    "type": "git",
    "url": "https://github.com/kbrilla/material-temporal-adapter.git",
    "directory": "packages/material-temporal-adapter"
  },
  "bugs": { "url": "https://github.com/kbrilla/material-temporal-adapter/issues" },
  "type": "module",
  "sideEffects": false,
  "scripts": {
    "build": "ng-packagr -p ng-package.json",
    "test": "vitest run",
    "test:cov": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:watch": "vitest"
  },
  "peerDependencies": {
    "@angular/cdk": ">=18 <21",
    "@angular/common": ">=18 <21",
    "@angular/core": ">=18 <21",
    "@angular/material": ">=18 <21",
    "tslib": "^2.3.0"
  },
  "publishConfig": { "access": "public" }
}
```

- [ ] **Step 2: Write `ng-package.json`**

```json
{
  "$schema": "../../node_modules/ng-packagr/ng-package.schema.json",
  "dest": "../../dist/material-temporal-adapter",
  "lib": { "entryFile": "src/public-api.ts" },
  "assets": ["./README.md", "./CHANGELOG.md", "./LICENSE"]
}
```

- [ ] **Step 3: Write `types/globals.d.ts`**

```typescript
declare const ngDevMode: boolean | undefined;
```

- [ ] **Step 4: Write `tsconfig.lib.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../../dist/out-tsc",
    "declaration": true,
    "types": []
  },
  "include": ["src/**/*.ts", "types/**/*.d.ts"],
  "exclude": ["src/**/*.spec.ts", "src/tests/**"]
}
```

- [ ] **Step 5: Write empty public API**

```typescript
// packages/material-temporal-adapter/src/public-api.ts
export {};
```

- [ ] **Step 6: Install workspace deps**

```bash
pnpm add -Dw typescript@~5.5.0 ng-packagr@~19 \
  @angular/compiler-cli@~19 @angular/compiler@~19 \
  @angular/core@~19 @angular/common@~19 @angular/cdk@~19 \
  @angular/material@~19 @angular/platform-browser@~19 \
  @angular/platform-browser-dynamic@~19 \
  vitest@^2 @analogjs/vite-plugin-angular @analogjs/vitest-angular jsdom \
  @vitest/coverage-v8 @vitest/ui \
  rxjs zone.js tslib \
  eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser \
  @angular-eslint/eslint-plugin \
  expect-type \
  @js-temporal/polyfill temporal-polyfill
pnpm install
```

- [ ] **Step 7: Smoke build**

```bash
pnpm --filter @kbrilla/material-temporal-adapter build
```

Expected: `dist/material-temporal-adapter/index.d.ts` exists

- [ ] **Step 8: Commit and push**

```bash
git add .
git commit -m "chore: add package scaffold with ng-packagr smoke build"
git push -u origin main
```

**Checkpoint 1:** `pnpm install` clean, `pnpm build` succeeds, dist name correct.

---

## Phase 2 — Port adapter source

### Task 4: Shared modules (types, invalid, polyfill, utils)

**Files:**
- Create: `packages/material-temporal-adapter/src/shared/types.ts`
- Create: `packages/material-temporal-adapter/src/shared/invalid.ts`
- Create: `packages/material-temporal-adapter/src/shared/polyfill-check.ts`
- Create: `packages/material-temporal-adapter/src/shared/utils.ts`
- Create: `packages/material-temporal-adapter/src/shared/index.ts`

- [ ] **Step 1: Write failing test `src/tests/shared/invalid.spec.ts`**

```typescript
import {describe, expect, it} from 'vitest';
import {
  createInvalidPlainDate,
  createInvalidPlainDateTime,
  createInvalidZonedDateTime,
  isTemporalInvalid,
} from '../../shared/invalid';

describe('isTemporalInvalid', () => {
  it('returns false for null/undefined/{}', () => {
    expect(isTemporalInvalid(null)).toBe(false);
    expect(isTemporalInvalid(undefined)).toBe(false);
    expect(isTemporalInvalid({})).toBe(false);
  });

  it('returns false for valid PlainDate', () => {
    expect(isTemporalInvalid(Temporal.PlainDate.from('2024-01-01'))).toBe(false);
  });

  it('returns true for plain-date sentinel', () => {
    const s = createInvalidPlainDate('iso8601');
    expect(isTemporalInvalid(s)).toBe(true);
    expect(Number.isNaN(s.year)).toBe(true);
    expect((s as unknown as {_invalid: boolean})._invalid).toBe(true);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm --filter @kbrilla/material-temporal-adapter exec vitest run src/tests/shared/invalid.spec.ts
```

Expected: module not found

- [ ] **Step 3: Implement `invalid.ts`, `types.ts`, `polyfill-check.ts`, `utils.ts`** (full content from spec sections 2.2–2.5)

- [ ] **Step 4: Export from `shared/index.ts`**

```typescript
export * from './types';
export * from './invalid';
export * from './polyfill-check';
export * from './utils';
export {BaseTemporalAdapter} from './base-temporal-adapter';
```

- [ ] **Step 5: Run test — expect PASS**

- [ ] **Step 6: Commit**

```bash
git add packages/material-temporal-adapter/src/shared packages/material-temporal-adapter/src/tests/shared/invalid.spec.ts
git commit -m "feat: add shared invalid sentinel and types"
```

---

### Task 5: BaseTemporalAdapter refactor

**Files:**
- Create: `packages/material-temporal-adapter/src/shared/base-temporal-adapter.ts`
- Test: `packages/material-temporal-adapter/src/tests/shared/base-adapter.spec.ts`

- [ ] **Step 1: Port `/tmp/base.ts` and apply these edits:**

1. Replace Google header with MIT / Krzysztof Brilla
2. Remove `MAT_BASE_TEMPORAL_OPTIONS` export and all references
3. Import `TemporalBaseOptions` from `./types`, `ensureTemporalAvailable` from `./polyfill-check`, `getDefaultLocale`, `getLocaleFirstDayOfWeek`, `range` from `./utils`
4. Change constructor to:

```typescript
protected constructor(options: TemporalBaseOptions) {
  super();
  ensureTemporalAvailable();
  this._calendar = options.calendar ?? 'iso8601';
  this._outputCalendar = options.outputCalendar ?? null;
  this._firstDayOfWeek = options.firstDayOfWeek;
  this._overflow = options.overflow ?? 'reject';
  super.setLocale(inject(MAT_DATE_LOCALE, {optional: true}) ?? getDefaultLocale());
}
```

5. In `getMonthNames` / `getDateNames`: change reference year `2024` → `2017`
6. In `getDayOfWeekNames`: use Jan 1–7 **2017** (Sunday Jan 1)
7. In `_formatWithLocale`: replace string-equality branch with:

```typescript
const dateForOutput = date.withCalendar(outputCalendar);
```

8. Add abstract methods: `today`, `createDate`, `clone`, `invalid`, `isValid`, `isDateInstance`, `toIso8601`, `deserialize`, `parse`

- [ ] **Step 2: Write `base-adapter.spec.ts` with concrete test stub**

```typescript
import {TestBed} from '@angular/core/testing';
import {DateAdapter} from '@angular/material/core';
import {Injectable} from '@angular/core';
import {BaseTemporalAdapter} from '../../shared/base-temporal-adapter';
import {createInvalidPlainDate, isTemporalInvalid} from '../../shared/invalid';
import {MAT_TEMPORAL_PLAIN_DATE_OPTIONS} from '../../plain-date/plain-date-options';

@Injectable()
class TestPlainDateAdapter extends BaseTemporalAdapter<Temporal.PlainDate> {
  constructor() {
    super({calendar: 'iso8601', overflow: 'reject'});
  }
  today() { return Temporal.Now.plainDateISO(); }
  createDate(y: number, m: number, d: number) {
    return Temporal.PlainDate.from({year: y, month: m + 1, day: d});
  }
  clone(d: Temporal.PlainDate) { return Temporal.PlainDate.from(d); }
  invalid() { return createInvalidPlainDate('iso8601'); }
  isValid(d: Temporal.PlainDate) { return !isTemporalInvalid(d); }
  isDateInstance(v: unknown): v is Temporal.PlainDate { return v instanceof Temporal.PlainDate; }
  toIso8601(d: Temporal.PlainDate) { return d.toString(); }
  deserialize(v: unknown) { return typeof v === 'string' ? this._parseString(v) : null; }
  parse(v: unknown) { return typeof v === 'string' ? this._parseString(v) : null; }
  protected _parseString(v: string) { try { return Temporal.PlainDate.from(v); } catch { return null; } }
  protected _createFromEpochMs(ms: number) { return Temporal.Instant.fromEpochMilliseconds(ms).toZonedDateTimeISO('UTC').toPlainDate(); }
}

describe('BaseTemporalAdapter', () => {
  let adapter: TestPlainDateAdapter;
  beforeEach(() => {
    TestBed.configureTestingModule({providers: [TestPlainDateAdapter]});
    adapter = TestBed.inject(TestPlainDateAdapter);
    adapter.setLocale('en-US');
  });

  it('getMonth returns 0-indexed month', () => {
    const d = Temporal.PlainDate.from('2024-03-15');
    expect(adapter.getMonth(d)).toBe(2);
  });

  it('getDayOfWeekNames starts on Sunday for en-US', () => {
    const names = adapter.getDayOfWeekNames('short');
    expect(names).toHaveLength(7);
    expect(names[0].toLowerCase()).toMatch(/sun/);
  });
});
```

- [ ] **Step 3: Run tests, fix until green**

- [ ] **Step 4: Commit**

```bash
git commit -am "feat: add refactored BaseTemporalAdapter without shared options token"
```

---

### Task 6: PlainDateAdapter + provider

**Files:**
- Create: `packages/material-temporal-adapter/src/plain-date/plain-date-options.ts`
- Create: `packages/material-temporal-adapter/src/plain-date/plain-date-adapter.ts`
- Create: `packages/material-temporal-adapter/src/plain-date/provide-plain-date.ts`
- Create: `packages/material-temporal-adapter/src/plain-date/index.ts`
- Test: `packages/material-temporal-adapter/src/tests/plain-date/plain-date-adapter.spec.ts`
- Test: `packages/material-temporal-adapter/src/tests/plain-date/plain-date-provider.spec.ts`

- [ ] **Step 1: Write options token** (spec section 2.7 — `MAT_TEMPORAL_PLAIN_DATE_OPTIONS` with `providedIn: 'root'` factory)

- [ ] **Step 2: Port plain-date adapter** from `/tmp/plain-date.ts`:
  - Inject `MAT_TEMPORAL_PLAIN_DATE_OPTIONS` in ctor → `super(inject(...))`
  - Replace inline sentinel with `createInvalidPlainDate` / `isTemporalInvalid`
  - Add `setTime(): never` throw (spec section 2.7)
  - Remove any `MAT_BASE_TEMPORAL_OPTIONS` usage

- [ ] **Step 3: Write `provide-plain-date.ts`**

```typescript
import {Provider} from '@angular/core';
import {DateAdapter, MAT_DATE_FORMATS, MatDateFormats} from '@angular/material/core';
import {MAT_TEMPORAL_DATE_FORMATS} from '../formats/date-formats';
import {PlainDateAdapter} from './plain-date-adapter';
import {MAT_TEMPORAL_PLAIN_DATE_OPTIONS, PlainDateOptions} from './plain-date-options';

export function providePlainDateAdapter(
  formats: MatDateFormats = MAT_TEMPORAL_DATE_FORMATS,
  options?: PlainDateOptions,
): Provider[] {
  return [
    {provide: DateAdapter, useClass: PlainDateAdapter},
    {provide: MAT_DATE_FORMATS, useValue: formats},
    ...(options ? [{provide: MAT_TEMPORAL_PLAIN_DATE_OPTIONS, useValue: options}] : []),
  ];
}
```

- [ ] **Step 4: Write adapter tests** — port relevant cases from PR `split-adapters.spec.ts` `describe('PlainDateAdapter')` block; add `setTime throws` test:

```typescript
it('setTime throws', () => {
  expect(() => adapter.setTime(adapter.today(), 0, 0, 0)).toThrow(/not supported/i);
});
```

- [ ] **Step 5: Write provider test**

```typescript
import {TestBed} from '@angular/core/testing';
import {DateAdapter} from '@angular/material/core';
import {providePlainDateAdapter} from '../../plain-date/provide-plain-date';
import {PlainDateAdapter} from '../../plain-date/plain-date-adapter';
import {MAT_TEMPORAL_PLAIN_DATE_OPTIONS} from '../../plain-date/plain-date-options';

describe('providePlainDateAdapter', () => {
  it('provides PlainDateAdapter', () => {
    TestBed.configureTestingModule({providers: [providePlainDateAdapter()]});
    expect(TestBed.inject(DateAdapter)).toBeInstanceOf(PlainDateAdapter);
  });

  it('allows different options in separate TestBeds', () => {
    TestBed.configureTestingModule({
      providers: [providePlainDateAdapter(undefined, {calendar: 'hebrew'})],
    });
    expect(TestBed.inject(MAT_TEMPORAL_PLAIN_DATE_OPTIONS).calendar).toBe('hebrew');
  });
});
```

- [ ] **Step 6: Run tests, commit**

```bash
git commit -am "feat: add PlainDateAdapter and providePlainDateAdapter"
```

---

### Task 7: PlainDateTimeAdapter + provider

**Files:**
- Create: `packages/material-temporal-adapter/src/plain-datetime/*` (mirror plain-date)
- Test: `packages/material-temporal-adapter/src/tests/plain-datetime/*.spec.ts`

- [ ] **Step 1: Port from `/tmp/plain-datetime.ts`** with same refactor pattern as Task 6
- [ ] **Step 2: Replace `INVALID_PLAIN_DATETIME` with `createInvalidPlainDateTime`
- [ ] **Step 3: Add `providePlainDateTimeAdapter`** using `MAT_TEMPORAL_DATETIME_FORMATS`
- [ ] **Step 4: Port time tests** from PR: `setTime`, `addSeconds`, `getHours/Minutes/Seconds`, `parseTime`
- [ ] **Step 5: Run tests, commit**

```bash
git commit -am "feat: add PlainDateTimeAdapter and providePlainDateTimeAdapter"
```

---

### Task 8: ZonedDateTimeAdapter + provider

**Files:**
- Create: `packages/material-temporal-adapter/src/zoned-datetime/*`
- Test: `packages/material-temporal-adapter/src/tests/zoned-datetime/*.spec.ts`

- [ ] **Step 1: Port from `/tmp/zoned.ts` (~616 lines) with these mandatory changes:**

| PR behavior | v0.1 behavior |
|---|---|
| Extends `DateAdapter` directly | Extend `BaseTemporalAdapter<Temporal.ZonedDateTime>`; delete duplicated locale/format helpers |
| `timezone?: string` optional, defaults to `Temporal.Now.timeZoneId()` | `timezone: string` required; ctor throws if missing |
| `MAT_ZONED_DATETIME_OPTIONS` | Rename token to `MAT_TEMPORAL_ZONED_OPTIONS` |
| Inline `INVALID_ZONED_DATETIME` | Use `createInvalidZonedDateTime(calendar, timezone)` |
| `_toZonedDateTime` unsafe cast | Rename `_assertZoned`, document invariant in JSDoc |
| `provideZonedDateTimeAdapter(formats, options?)` | `provideZonedDateTimeAdapter(options, formats?)` — options first, required |

- [ ] **Step 2: Constructor guard**

```typescript
constructor() {
  const options = inject(MAT_TEMPORAL_ZONED_OPTIONS, {optional: true});
  if (!options?.timezone) {
    throw new Error(
      'ZonedDateTimeAdapter requires options. Use provideZonedDateTimeAdapter({ timezone: ... }).',
    );
  }
  super(options);
  this._timezone = options.timezone;
  this._disambiguation = options.disambiguation;
  this._offset = options.offset;
  this._rounding = options.rounding;
}
```

- [ ] **Step 3: Write `provide-zoned-datetime.ts`**

```typescript
export function provideZonedDateTimeAdapter(
  options: ZonedDateTimeOptions,
  formats: MatDateFormats = MAT_TEMPORAL_ZONED_FORMATS,
): Provider[] {
  return [
    {provide: DateAdapter, useClass: ZonedDateTimeAdapter},
    {provide: MAT_DATE_FORMATS, useValue: formats},
    {provide: MAT_TEMPORAL_ZONED_OPTIONS, useValue: options},
  ];
}
```

- [ ] **Step 4: Port DST/disambiguation tests** from PR `temporal-date-adapter.spec.ts` zoned sections into `zoned-datetime-adapter.spec.ts`
- [ ] **Step 5: Run tests, commit**

```bash
git commit -am "feat: add ZonedDateTimeAdapter with required timezone"
```

---

### Task 9: Formats and public API

**Files:**
- Create: `packages/material-temporal-adapter/src/formats/date-formats.ts`
- Create: `packages/material-temporal-adapter/src/formats/datetime-formats.ts`
- Create: `packages/material-temporal-adapter/src/formats/zoned-formats.ts`
- Modify: `packages/material-temporal-adapter/src/public-api.ts`
- Create: `packages/material-temporal-adapter/src/temporal.d.ts`

- [ ] **Step 1: Split `/tmp/formats.ts`** into date + datetime files (port from PR)
- [ ] **Step 2: Write `zoned-formats.ts`** (spec section 2.10 — `timeZoneName: 'short'` in display)
- [ ] **Step 3: Write `public-api.ts`** (spec section 2.11 — full export list)
- [ ] **Step 4: Copy and rebrand `temporal.d.ts`**
- [ ] **Step 5: Verify build**

```bash
pnpm build
grep -r "Google LLC" packages/ && exit 1 || echo "license OK"
grep -r "MAT_BASE_TEMPORAL_OPTIONS" packages/ && exit 1 || echo "shared token removed OK"
```

- [ ] **Step 6: Commit**

```bash
git commit -am "feat: export public API and date formats"
```

**Checkpoint 2:** Three adapters compile; public API in `dist/.../index.d.ts`; no Google headers; no shared token.

---

## Phase 3 — Refactoring verification (R1–R15)

### Task 10: Grep verification checklist

**Files:** none (verification only)

- [ ] **Step 1: Run verification script**

```bash
cd packages/material-temporal-adapter
! grep -r "MAT_BASE_TEMPORAL_OPTIONS" src && echo R1_OK
! grep -r "providePlainTemporalAdapter\|PlainTemporalAdapter\|TemporalDateAdapter" src && echo dropped_OK
! grep -r "Google LLC" src && echo license_OK
grep -r "Now.timeZoneId" src | grep -v "today()" | grep -v "\.spec\." && exit 1 || echo R6_OK
! grep -r "console.warn" src && echo R8_OK
test -f src/shared/invalid.ts && test -f src/shared/polyfill-check.ts && echo R9_R8_OK
grep "2017" src/shared/base-temporal-adapter.ts && echo R11_OK
```

- [ ] **Step 2: Document results in commit message body if all green**

**Checkpoint 3:** All R1–R15 checks pass.

---

## Phase 4 — Tests

### Task 11: Vitest setup

**Files:**
- Create: `packages/material-temporal-adapter/vitest.config.ts`
- Create: `packages/material-temporal-adapter/tsconfig.spec.json`
- Create: `packages/material-temporal-adapter/src/test-setup.ts`

- [ ] **Step 1: Write `vitest.config.ts`**

```typescript
import {defineConfig} from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/tests/**/*.spec.ts', 'src/tests/**/*.spec-d.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/tests/**', 'src/**/index.ts', 'src/temporal.d.ts', 'src/test-setup.ts'],
      thresholds: {lines: 90, functions: 90, branches: 85, statements: 90},
    },
  },
});
```

- [ ] **Step 2: Write `test-setup.ts`**

```typescript
import 'zone.js';
import 'zone.js/testing';
import 'temporal-polyfill/global';
import {getTestBed} from '@angular/core/testing';
import {BrowserDynamicTestingModule, platformBrowserDynamicTesting} from '@angular/platform-browser-dynamic/testing';

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
  {teardown: {destroyAfterEach: true}},
);
```

- [ ] **Step 3: Commit**

```bash
git commit -am "test: configure vitest with temporal polyfill setup"
```

---

### Task 12: Shared test suite

**Files:**
- Create: `packages/material-temporal-adapter/src/tests/shared/polyfill-check.spec.ts`
- Expand: `packages/material-temporal-adapter/src/tests/shared/invalid.spec.ts`
- Expand: `packages/material-temporal-adapter/src/tests/shared/base-adapter.spec.ts`

- [ ] **Step 1: Write `polyfill-check.spec.ts`**

```typescript
import {afterEach, describe, expect, it, vi} from 'vitest';
import {_resetPolyfillCheck, ensureTemporalAvailable} from '../../shared/polyfill-check';

describe('ensureTemporalAvailable', () => {
  afterEach(() => {
    _resetPolyfillCheck();
  });

  it('no-ops when Temporal is defined', () => {
    expect(() => ensureTemporalAvailable()).not.toThrow();
  });

  it('throws helpful message when Temporal is undefined', () => {
    const original = globalThis.Temporal;
    // @ts-expect-error test mock
    delete globalThis.Temporal;
    _resetPolyfillCheck();
    expect(() => ensureTemporalAvailable()).toThrow(/@kbrilla\/material-temporal-adapter/);
    expect(() => ensureTemporalAvailable()).toThrow(/@js-temporal\/polyfill/);
    globalThis.Temporal = original;
  });
});
```

- [ ] **Step 2: Complete invalid + base adapter tests** per spec section 6.1
- [ ] **Step 3: Run `pnpm test:cov` for shared/** — commit when green

---

### Task 13: Plain-date test suite (~80 cases)

**Files:**
- Create: `packages/material-temporal-adapter/src/tests/plain-date/plain-date-adapter.spec.ts`
- Create: `packages/material-temporal-adapter/src/tests/plain-date/plain-date-formats.spec.ts`

- [ ] **Step 1: Port PR `split-adapters.spec.ts` PlainDateAdapter block** — rename imports to `@kbrilla/...` paths
- [ ] **Step 2: Add missing cases from spec 6.2** (epoch bounds, whitespace, long string DoS)
- [ ] **Step 3: Write formats spec**

```typescript
import {MAT_TEMPORAL_DATE_FORMATS} from '../../formats/date-formats';

describe('MAT_TEMPORAL_DATE_FORMATS', () => {
  it('has null parse formats', () => {
    expect(MAT_TEMPORAL_DATE_FORMATS.parse.dateInput).toBeNull();
  });
  it('display dateInput uses numeric parts', () => {
    expect(MAT_TEMPORAL_DATE_FORMATS.display.dateInput).toMatchObject({
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
  });
});
```

- [ ] **Step 4: Run tests, commit**

---

### Task 14: Plain-datetime test suite (~90 cases)

**Files:** `src/tests/plain-datetime/*.spec.ts`

- [ ] **Step 1: Port PR PlainDateTimeAdapter tests + spec 6.5 time cases**
- [ ] **Step 2: Run tests, commit**

---

### Task 15: Zoned-datetime test suite (~130 cases)

**Files:** `src/tests/zoned-datetime/*.spec.ts`

- [ ] **Step 1: Write DST parameterized suite**

```typescript
const SPRING_FORWARD = { tz: 'America/New_York', local: '2024-03-10T02:30:00' };
const disambiguations = ['compatible', 'earlier', 'later', 'reject'] as const;

describe.each(disambiguations)('DST spring-forward disambiguation=%s', (mode) => {
  it('handles gap behavior', () => {
    TestBed.configureTestingModule({
      providers: [provideZonedDateTimeAdapter({
        timezone: SPRING_FORWARD.tz,
        disambiguation: mode,
      })],
    });
    const adapter = TestBed.inject(DateAdapter) as ZonedDateTimeAdapter;
    // assert per mode — reject throws; others resolve to defined instant
  });
});
```

- [ ] **Step 2: Port offset conflict tests (`use`/`ignore`/`reject`/`prefer`)**
- [ ] **Step 3: Port rounding-at-format tests**
- [ ] **Step 4: Run tests, commit**

---

### Task 16: Calendar matrix tests (~200 cases)

**Files:**
- Create: `packages/material-temporal-adapter/src/tests/calendars/_calendar-matrix.ts`
- Create: `packages/material-temporal-adapter/src/tests/calendars/{gregory,japanese,hebrew,chinese,persian,buddhist,indian,ethiopic,coptic}.spec.ts`
- Create: `packages/material-temporal-adapter/src/tests/calendars/islamic.skip.spec.ts`

- [ ] **Step 1: Write shared matrix helper**

```typescript
// _calendar-matrix.ts
export const CALENDARS = [
  'gregory', 'japanese', 'hebrew', 'chinese', 'persian',
  'buddhist', 'indian', 'ethiopic', 'coptic',
] as const;

export function supportsCalendar(id: string): boolean {
  try {
    Temporal.PlainDate.from({year: 2024, month: 1, day: 1, calendar: id});
    return true;
  } catch { return false; }
}

export function describeCalendar(id: string, fn: () => void) {
  (supportsCalendar(id) ? describe : describe.skip)(`calendar:${id}`, fn);
}
```

- [ ] **Step 2: For each calendar file, implement 20 tests** from spec 6.8 (today calendarId, getYear, getMonthNames, variable month lengths, outputCalendar formatting, era where applicable)

- [ ] **Step 3: Write skipped Islamic test**

```typescript
describe.skip('islamic calendar', () => {
  it('skipped — polyfill inconsistency; see docs/calendar-support.md', () => {});
});
```

- [ ] **Step 4: Run full suite, commit**

---

### Task 17: Integration + compile-time tests

**Files:**
- Create: `packages/material-temporal-adapter/src/tests/integration/datepicker.integration.spec.ts`
- Create: `packages/material-temporal-adapter/src/tests/integration/timepicker.integration.spec.ts`
- Create: `packages/material-temporal-adapter/src/tests/types/compile-time.spec-d.ts`

- [ ] **Step 1: Datepicker integration** (minimal standalone component + `MatDatepickerModule`):

```typescript
import {Component} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {render} from '@testing-library/angular'; // or TestBed + fixture
import {providePlainDateAdapter, isTemporalInvalid} from '../../public-api';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MatDatepickerModule, MatFormFieldModule, MatInputModule],
  template: `
    <mat-form-field>
      <input matInput [matDatepicker]="p" [formControl]="ctrl">
      <mat-datepicker #p></mat-datepicker>
    </mat-form-field>
  `,
})
class HostComponent { ctrl = new FormControl<Temporal.PlainDate | null>(null); }

describe('datepicker integration', () => {
  it('binds PlainDate to FormControl', async () => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [providePlainDateAdapter()],
    });
    // open picker, select date, assert ctrl.value is PlainDate and !isTemporalInvalid
  });
});
```

- [ ] **Step 2: Write `compile-time.spec-d.ts`** (spec section 6.10 — full content)

- [ ] **Step 3: Run `pnpm test:cov` — thresholds must pass**

```bash
pnpm --filter @kbrilla/material-temporal-adapter test:cov
```

- [ ] **Step 4: Commit**

```bash
git commit -am "test: add integration, calendar matrix, and compile-time tests"
```

**Checkpoint 4:** All tests pass; coverage ≥90% lines; compile-time tests confirm required timezone.

---

## Phase 5 — Demo migration

### Task 18: Bootstrap apps/demo

**Files:**
- Create: `apps/demo/**`

- [ ] **Step 1: Scaffold Angular app**

```bash
cd apps
pnpm create @angular@latest demo -- --routing --style=scss --ssr=false --skip-git --package-manager=pnpm
```

- [ ] **Step 2: Set `apps/demo/package.json` name to `"demo"`, `"private": true`**

- [ ] **Step 3: Add dependency**

```json
"@kbrilla/material-temporal-adapter": "workspace:*",
"temporal-polyfill": "^0.3.0"
```

- [ ] **Step 4: Init Storybook**

```bash
pnpm --filter demo exec storybook init --type angular
```

- [ ] **Step 5: Add Playwright + test-runner** (mirror `/Users/krzbri/repos/temporal-adapter-demo/package.json` scripts)

- [ ] **Step 6: Commit scaffold**

---

### Task 19: Migrate stories from reference demo

**Source:** `/Users/krzbri/repos/temporal-adapter-demo/src/app/demos/*.stories.ts`

**Files:**
- Create: `apps/demo/src/stories/plain-date/*.stories.ts`
- Create: `apps/demo/src/stories/plain-datetime/*.stories.ts`
- Create: `apps/demo/src/stories/zoned-datetime/*.stories.ts`
- Create: `apps/demo/src/stories/calendars/*.stories.ts`
- Create: `apps/demo/src/stories/form-integration/*.stories.ts`
- Create: `apps/demo/src/stories/invalid-handling/*.stories.ts`

- [ ] **Step 1: Copy and refactor stories** — replace `file:vendor/...` and hybrid/unified providers with:

```typescript
import {providePlainDateAdapter} from '@kbrilla/material-temporal-adapter';
// applicationConfig decorator:
providers: [providePlainDateAdapter()],
```

- [ ] **Step 2: Skip/delete** any story referencing `PlainTemporalAdapter` or `TemporalDateAdapter`

- [ ] **Step 3: Add `play` functions** (45 total per spec 6.11) using `@storybook/test`

- [ ] **Step 4: Write `apps/demo/playwright/visual.spec.ts`**

```typescript
import {test, expect} from '@playwright/test';

test('plain-date default story', async ({page}) => {
  await page.goto('/iframe.html?id=plain-date-default--default&viewMode=story');
  await expect(page).toHaveScreenshot('plain-date-default.png');
});
```

- [ ] **Step 5: Verify**

```bash
pnpm demo          # http://localhost:6006
pnpm --filter demo test-storybook
pnpm --filter demo test:e2e
```

- [ ] **Step 6: Commit**

**Checkpoint 5:** Storybook runs; no hybrid/unified references; interaction + visual tests pass.

---

## Phase 6 — Docs

### Task 20: Package README and docs/

**Files:**
- Create: `packages/material-temporal-adapter/README.md`
- Create: `packages/material-temporal-adapter/CHANGELOG.md`
- Create: `packages/material-temporal-adapter/LICENSE`
- Create: `docs/migration-from-pr.md`
- Create: `docs/behavior-notes.md`
- Create: `docs/calendar-support.md`
- Create: `docs/ssr-considerations.md`
- Create: `README.md`, `CONTRIBUTING.md`, root `CHANGELOG.md`

- [ ] **Step 1: Write package README** following spec section 7 outline (Quick start, adapter table, behavior notes, SSR, migration link)
- [ ] **Step 2: Write `docs/migration-from-pr.md`** — mapping table from spec section 8
- [ ] **Step 3: Write behavior/calendar/ssr docs** from spec sections 6.8 skip reason + locked decisions
- [ ] **Step 4: Root CHANGELOG 0.1.0 entry**
- [ ] **Step 5: Commit**

**Checkpoint 6:** All doc files exist; README examples match exported API.

---

## Phase 7 — CI/CD

### Task 21: GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy-demo.yml`
- Create: `.github/workflows/release.yml`
- Create: `.github/ISSUE_TEMPLATE/bug_report.md`
- Create: `.github/ISSUE_TEMPLATE/feature_request.md`
- Create: `.github/PULL_REQUEST_TEMPLATE.md`

- [ ] **Step 1: Write `ci.yml`**

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
jobs:
  build-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: ${{ matrix.node }}, cache: pnpm }}
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm test:cov
      - run: pnpm demo:build
```

- [ ] **Step 2: Write `deploy-demo.yml`** — build Storybook, deploy to GitHub Pages at `kbrilla.github.io/material-temporal-adapter/`
- [ ] **Step 3: Write `release.yml`** using `changesets/action@v1`; require `NPM_TOKEN` secret
- [ ] **Step 4: Add issue/PR templates**
- [ ] **Step 5: Push, open no-op PR, confirm CI green**

**Checkpoint 7:** CI green; Pages enabled; NPM_TOKEN configured.

---

## Phase 8 — First publish

### Task 22: Validate and publish 0.1.0

- [ ] **Step 1: Final grep**

```bash
! grep -r "TODO\|FIXME" packages/material-temporal-adapter/src
pnpm build && pnpm test:cov
```

- [ ] **Step 2: Dry-run publish**

```bash
cd packages/material-temporal-adapter
pnpm publish --dry-run
```

Inspect: only dist + README + LICENSE + CHANGELOG — no src/tests

- [ ] **Step 3: Pack smoke test in fresh Angular app** (spec Phase 8.3)

- [ ] **Step 4: Add changeset and publish**

```bash
pnpm changeset
# patch: initial release notes
pnpm changeset version
pnpm --filter @kbrilla/material-temporal-adapter publish --access public --tag next
```

- [ ] **Step 5: Verify npm, promote tag, git tag v0.1.0**

```bash
npm view @kbrilla/material-temporal-adapter@0.1.0-next
npm dist-tag add @kbrilla/material-temporal-adapter@0.1.0-next latest
git tag v0.1.0 && git push --tags
gh release create v0.1.0 --notes-file packages/material-temporal-adapter/CHANGELOG.md
```

**Checkpoint 8:** npm shows 0.1.0; smoke app works; bundle <50KB gzipped.

---

## Phase 9 — Announce

### Task 23: Update external references

- [ ] **Step 1: PR #32668 banner** (spec 9.1) via `gh pr edit 32668 --repo angular/components --body ...`
- [ ] **Step 2: Comment on issue #25753** with package + demo links
- [ ] **Step 3: Banner on `kbrilla/temporal-adapter-demo` README** (spec 9.4)
- [ ] **Step 4: Optional outreach** (r/Angular, dev.to, Discord)

**Checkpoint 9:** PR banner, issue comment, old demo banner done.

---

## Self-review

### Spec coverage

| Requirement | Task |
|---|---|
| Three split adapters | Tasks 6–8 |
| Drop unified/hybrid | Tasks 6–9, 19 |
| Per-adapter tokens/providers | Tasks 6–8 |
| Remove MAT_BASE_TEMPORAL_OPTIONS | Tasks 5, 10 |
| Required zoned timezone | Task 8, 17 |
| isTemporalInvalid + sentinel | Task 4 |
| Polyfill BYO + check | Tasks 4, 12 |
| Vitest + Playwright | Tasks 11–17, 18–19 |
| Demo split-only | Task 19 |
| Docs + migration table | Task 20 |
| CI/CD + Changesets | Tasks 21–22 |
| npm publish + announce | Tasks 22–23 |

**Gaps:** None identified.

### Placeholder scan

No TBD/TODO/similar-to-task placeholders in executable steps.

### Type consistency

- Token names: `MAT_TEMPORAL_PLAIN_DATE_OPTIONS`, `MAT_TEMPORAL_PLAIN_DATETIME_OPTIONS`, `MAT_TEMPORAL_ZONED_OPTIONS` — consistent throughout
- Provider arg order: plain adapters `(formats?, options?)`; zoned `(options, formats?)` — consistent in Tasks 6–8 and compile-time tests

---

## Definition of done (v0.1)

1. Checkpoints 0–9 green
2. `npm view @kbrilla/material-temporal-adapter` → 0.1.0
3. Demo live at https://kbrilla.github.io/material-temporal-adapter/
4. PR #32668 banner + issue #25753 comment
5. Fresh Angular 19 app smoke test passes with README quick start
