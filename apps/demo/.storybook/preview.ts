import {type ApplicationConfig, provideZoneChangeDetection} from '@angular/core';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import {applicationConfig, moduleMetadata, type Preview} from '@storybook/angular';

import {previewPlainDateAdapterProviders} from '../src/stories/shared/story-providers';

import 'temporal-polyfill/global';

const adapterProviders = previewPlainDateAdapterProviders();

const globalStoryProviders: NonNullable<ApplicationConfig['providers']> = [
  provideZoneChangeDetection({eventCoalescing: true}),
  provideAnimationsAsync(),
  ...adapterProviders,
];

const preview: Preview = {
  decorators: [
    moduleMetadata({providers: adapterProviders}),
    applicationConfig({providers: globalStoryProviders}),
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
