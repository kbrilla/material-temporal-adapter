import {provideZoneChangeDetection} from '@angular/core';
import {MAT_DATE_LOCALE} from '@angular/material/core';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import {applicationConfig, type Preview} from '@storybook/angular';

import {providePlainDateAdapter} from '@kbrilla/material-temporal-adapter';

import 'temporal-polyfill/global';

const preview: Preview = {
  decorators: [
    applicationConfig({
      providers: [
        provideZoneChangeDetection({eventCoalescing: true}),
        provideAnimationsAsync(),
        ...providePlainDateAdapter(),
        {provide: MAT_DATE_LOCALE, useValue: 'en-US'},
      ],
    }),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      toc: true,
    },
    options: {
      storySort: {
        order: [
          'Docs',
          [
            'Introduction',
            'Storybook Setup',
            'PlainDate Adapter',
            'PlainDateTime Adapter',
            'ZonedDateTime Adapter',
            'Calendars',
            'Forms & Validation',
            'Ecosystem & Rationale',
          ],
          'PlainDate',
          'PlainDateTime',
          'ZonedDateTime',
          'Calendars',
          'Form Integration',
          'Invalid Handling',
        ],
      },
    },
  },
};

export default preview;
