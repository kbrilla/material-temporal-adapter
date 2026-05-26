/**
 * @license
 * Copyright (c) Krzysztof Brilla
 * SPDX-License-Identifier: MIT
 */

let temporalAvailable: boolean | undefined;

export function ensureTemporalAvailable(): void {
  temporalAvailable ??= typeof globalThis.Temporal !== 'undefined';

  if (!temporalAvailable) {
    throw new Error(
      'Temporal is not available. Import temporal-polyfill/global before using material-temporal-adapter.',
    );
  }
}

export function _resetPolyfillCheck(): void {
  temporalAvailable = undefined;
}
