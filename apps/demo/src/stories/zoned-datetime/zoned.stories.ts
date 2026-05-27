import {expect, userEvent, within} from '@storybook/test';
import type {Meta, StoryObj} from '@storybook/angular';

import {CONFIG, configBlock} from '../shared/config-snippets';
import {
  AdapterExplorerDemoComponent,
  TemporalDateRangeDemoComponent,
  TemporalDatepickerDemoComponent,
  TemporalPlaygroundDemoComponent,
  TemporalTimepickerDemoComponent,
} from '../shared/demo-components';
import {withZonedDateTimeAdapter} from '../shared/story-providers';

const meta: Meta<TemporalDatepickerDemoComponent> = {
  title: 'ZonedDateTime/Datepicker',
  component: TemporalDatepickerDemoComponent,
  args: {
    title: 'ZonedDateTime Datepicker Demo',
    subtitle: 'Angular Material datepicker backed by Temporal.ZonedDateTime in UTC',
    initialValue: '2026-05-26T10:30:00+00:00[UTC]',
  },
  decorators: [withZonedDateTimeAdapter({timezone: 'UTC'})],
  parameters: {
    docs: {
      description: {
        component: [
          'Material datepicker with `Temporal.ZonedDateTime` values. **`timezone` is required.**',
          '',
          configBlock('Default provider (UTC)', CONFIG.zonedUtc),
        ].join('\n'),
      },
    },
  },
};

export default meta;

type Story = StoryObj<TemporalDatepickerDemoComponent>;

export const UTCDatepicker: Story = {
  name: 'UTC Datepicker',
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('textbox', {name: /select a date/i})).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button'));
    await expect(await canvas.findByText(/Selected Value:/i)).toBeInTheDocument();
  },
};

export const InvalidInput: Story = {
  name: 'Invalid Input',
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', {name: /select a date/i});

    await userEvent.clear(input);
    await userEvent.type(input, 'not-a-valid-date');
    await userEvent.tab();
    await expect(await canvas.findByText(/"_invalid"\s*:\s*true/i)).toBeInTheDocument();
  },
};

export const NewYorkDatepicker: Story = {
  name: 'New York Datepicker',
  decorators: [withZonedDateTimeAdapter({timezone: 'America/New_York'})],
  args: {
    subtitle: 'ZonedDateTime values in America/New_York',
    initialValue: '2026-05-26T10:30:00-04:00[America/New_York]',
  },
  parameters: {
    docs: {
      description: {
        story: configBlock('Provider', CONFIG.zonedNewYork),
      },
    },
  },
};

export const TimepickerUTC: StoryObj<TemporalTimepickerDemoComponent> = {
  name: 'UTC Timepicker',
  render: (args) => ({
    props: args,
    moduleMetadata: {imports: [TemporalTimepickerDemoComponent]},
    template: '<demo-temporal-timepicker [title]="title" [subtitle]="subtitle" />',
  }),
  args: {
    title: 'ZonedDateTime Timepicker Demo',
    subtitle: 'Time selection in UTC',
  },
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Selected Time:')).toBeInTheDocument();
    await expect(canvas.getByText(/Hours:/)).toBeInTheDocument();
  },
};

export const DateRangeUTC: StoryObj<TemporalDateRangeDemoComponent> = {
  name: 'UTC Date Range',
  render: () => ({
    moduleMetadata: {imports: [TemporalDateRangeDemoComponent]},
    template: '<demo-temporal-date-range />',
  }),
};

export const DSTGapReject: StoryObj<AdapterExplorerDemoComponent> = {
  name: 'DST Gap: Reject',
  decorators: [
    withZonedDateTimeAdapter({
      timezone: 'America/New_York',
      disambiguation: 'reject',
    }),
  ],
  render: () => ({
    moduleMetadata: {imports: [AdapterExplorerDemoComponent]},
    template: '<demo-adapter-explorer />',
  }),
  parameters: {
    docs: {
      description: {
        story: configBlock('Provider', CONFIG.zonedDstReject),
      },
    },
  },
};

export const DSTGapCompatible: StoryObj<AdapterExplorerDemoComponent> = {
  name: 'DST Gap: Compatible',
  decorators: [
    withZonedDateTimeAdapter({
      timezone: 'America/New_York',
      disambiguation: 'compatible',
    }),
  ],
  render: () => ({
    moduleMetadata: {imports: [AdapterExplorerDemoComponent]},
    template: '<demo-adapter-explorer />',
  }),
  parameters: {
    docs: {
      description: {
        story: configBlock('Provider', CONFIG.zonedDstCompatible),
      },
    },
  },
};

export const Playground: StoryObj<TemporalPlaygroundDemoComponent> = {
  name: 'Playground',
  render: (args) => ({
    props: args,
    moduleMetadata: {imports: [TemporalPlaygroundDemoComponent]},
    template: '<demo-temporal-playground [label]="label" [showTimepicker]="showTimepicker" />',
  }),
  args: {
    label: 'ZonedDateTime (UTC)',
    showTimepicker: true,
  },
};
