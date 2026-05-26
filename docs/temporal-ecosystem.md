# Temporal ecosystem (beyond this adapter)

`@kbrilla/material-temporal-adapter` wires **Angular Material** controls to Temporal. It does **not** replace [Day.js](https://day.js.org/docs/en/installation/installation), Moment, or general-purpose Temporal utilities.

## Scope split

| Layer | Responsibility | This repo? |
| --- | --- | --- |
| **Temporal API** | Correct date/time types, zones, calendars | Polyfill only (BYO) |
| **Material `DateAdapter`** | Picker math, parse/deserialize, `invalid()` | **Yes** |
| **Invalid sentinels** | Non-empty invalid control values | **Yes** — `isTemporalInvalid()` |
| **Token format/parse** (`DD/MM/YYYY`) | Display & legacy strings | **No** — see [@formkit/tempo](https://tempo.formkit.com/) |
| **Ergonomics** (`startOf`, `fromNow`, `isBetween`) | App logic helpers | **No** — see [temporal-kit](https://github.com/KristjanESPERANTO/temporal-kit) |
| **Angular form validators** | `min`/`max`/`range` on controls | **No** (future separate package possible) |

**Material note:** `[min]` / `[max]` on `mat-datepicker` already constrain the **calendar UI** via `DateAdapter`. Helpers below are still useful for **typed input**, **labels**, **API payloads**, and **validation messages**.

## Helper libraries (community — not maintained here)

Verify maintenance and API before adopting. **Do not confuse** these with [Temporal.io](https://temporal.io/) workflow SDKs (`temporal-tools`, `temporal-time-utils`, etc.).

| Library | npm / site | Best for | Temporal-native? | Token strings? |
| --- | --- | --- | --- | --- |
| **temporal-kit** | [GitHub](https://github.com/KristjanESPERANTO/temporal-kit) · [docs](https://kristjanesperanto.github.io/temporal-kit/) | Broad utilities: `startOf`, `endOf`, `isBetween`, `formatRelative`, intervals, `min`/`max`, business days | Yes | Intl presets, not `YYYY` tokens |
| **temporal-fun** | [npm](https://www.npmjs.com/package/temporal-fun) | Concise parsing/helpers | Yes | Partial |
| **@formkit/tempo** | [GitHub](https://github.com/formkit/tempo) · [docs](https://tempo.formkit.com/) | **Token** format + parse (`DD/MM/YYYY`, `Do`, …) | Via `Date` / ISO ↔ Temporal | **Yes** |
| **Day.js + plugins** | [day.js.org](https://day.js.org/docs/en/installation/installation) | Legacy stack, smallest core + plugins | No (own objects / `Date`) | **Yes** |

### Typical stacks

1. **Most Angular + Material apps:** this adapter + polyfill + **temporal-kit** for app logic.
2. **Legacy format strings:** add **@formkit/tempo** for display/parse; convert through ISO into `Temporal.*.from()`.
3. **Recipes without dependencies:** [TC39 Temporal cookbook](https://github.com/tc39/proposal-temporal/blob/main/docs/cookbook.md).

## Gap summary vs Day.js

Native Temporal is **strict and Intl-based**. Day.js fills convenience with plugins ([CustomParseFormat](https://day.js.org/docs/en/installation/installation), [RelativeTime](https://day.js.org/docs/en/installation/installation), [BuddhistEra](https://day.js.org/docs/en/plugin/buddhist-era), [updateLocale month names](https://day.js.org/docs/en/customization/month-names), etc.).

| Gap | Temporal alone | Helper direction |
| --- | --- | --- |
| Token `format('YYYY-MM-DD')` | No — [`toLocaleString`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate/toLocaleString) | **@formkit/tempo** |
| `fromNow` / humanized duration | No — [`Intl.RelativeTimeFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat) + math | **temporal-kit** `formatRelative` |
| `startOf` / `endOf` | Verbose | **temporal-kit** / **temporal-fun** |
| `isToday`, `isBetween` | Manual `compare` | **temporal-kit** |
| Custom locale month tables | Intl data only | Day.js-style **updateLocale** — not in Temporal |
| Invalid picker value while typing | N/A (Material adapter) | **`isTemporalInvalid()` here** — see [design-rationale.md](./design-rationale.md) |

Temporal **wins** on: IANA time zones + DST, non-Gregorian calendar math, immutability, nanosecond precision, type separation (Plain vs Zoned).

## Example: adapter + tempo + kit

```typescript
import {format} from '@formkit/tempo';
import {formatRelative, isBetween} from 'temporal-kit';
import {isTemporalInvalid} from '@kbrilla/material-temporal-adapter';

function describeControlValue(value: Temporal.PlainDate | null): string {
  if (value === null) return 'Empty';
  if (isTemporalInvalid(value)) return 'Invalid date';

  const label = format(value.toString(), 'DD/MM/YYYY');
  const relative = formatRelative(value, Temporal.Now.plainDateISO());
  return `${label} (${relative})`;
}
```

## Related

- [design-rationale.md](./design-rationale.md) — why sentinels, split adapters, required timezone
- [usage.md](./usage.md) — forms and Material patterns
- [behavior-notes.md](./behavior-notes.md) — adapter behavior
