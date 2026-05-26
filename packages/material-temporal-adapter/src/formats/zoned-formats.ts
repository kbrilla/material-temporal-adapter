/**
 * @license
 * Copyright (c) Krzysztof Brilla
 * SPDX-License-Identifier: MIT
 */

import type {MatDateFormats} from '@angular/material/core';

/**
 * Default date-time formats for timezone-aware Temporal adapters.
 */
export const MAT_TEMPORAL_ZONED_FORMATS: MatDateFormats = {
  parse: {
    dateInput: null,
    timeInput: null,
  },
  display: {
    dateInput: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    },
    timeInput: {hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short'},
    monthYearLabel: {year: 'numeric', month: 'short'},
    dateA11yLabel: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    },
    monthYearA11yLabel: {year: 'numeric', month: 'long'},
    timeOptionLabel: {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    },
  },
};
