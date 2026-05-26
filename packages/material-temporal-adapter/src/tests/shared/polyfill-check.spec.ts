import { afterEach, describe, expect, it } from "vitest";

import {
  _resetPolyfillCheck,
  ensureTemporalAvailable,
} from "../../shared/polyfill-check";

describe("ensureTemporalAvailable", () => {
  const originalTemporal = globalThis.Temporal;

  afterEach(() => {
    globalThis.Temporal = originalTemporal;
    _resetPolyfillCheck();
  });

  it("no-ops when Temporal is defined", () => {
    expect(() => ensureTemporalAvailable()).not.toThrow();
  });

  it("throws a helpful message when Temporal is undefined", () => {
    delete globalThis.Temporal;
    _resetPolyfillCheck();

    expect(() => ensureTemporalAvailable()).toThrowError(
      /@kbrilla\/material-temporal-adapter/,
    );
    expect(() => ensureTemporalAvailable()).toThrowError(/temporal-polyfill/);
    expect(() => ensureTemporalAvailable()).toThrowError(
      /@js-temporal\/polyfill/,
    );
  });
});
