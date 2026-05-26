/**
 * @license
 * Copyright (c) Krzysztof Brilla
 * SPDX-License-Identifier: MIT
 */

let temporalAvailable: boolean | undefined;

export function ensureTemporalAvailable(): void {
  temporalAvailable ??= typeof globalThis.Temporal !== "undefined";

  if (!temporalAvailable) {
    throw new Error(
      "Temporal is not available. @kbrilla/material-temporal-adapter requires a Temporal polyfill in runtimes without native Temporal. Import temporal-polyfill/global or @js-temporal/polyfill before using the adapter.",
    );
  }
}

export function _resetPolyfillCheck(): void {
  temporalAvailable = undefined;
}
