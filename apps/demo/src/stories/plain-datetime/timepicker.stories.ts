import {expect, userEvent, within} from '@storybook/test';
import type {Meta, StoryObj} from '@storybook/angular';

import {CONFIG, configBlock} from '../shared/config-snippets';
import {
  TemporalCalendarArithmeticComponent,
  TemporalDateRangeDemoComponent,
  TemporalDatepickerDemoComponent,
  TemporalPlaygroundDemoComponent,
  TemporalTimepickerDemoComponent,
} from '../shared/demo-components';
import {withPlainDateTimeAdapter} from '../shared/story-providers';

const meta: Meta<TemporalTimepickerDemoComponent> = {
  title: 'PlainDateTime/Timepicker',
  component: TemporalTimepickerDemoComponent,
  args: {
    title: 'PlainDateTime Timepicker Demo',
    subtitle: 'Angular Material timepicker backed by Temporal.PlainDateTime',
  },
  decorators: [withPlainDateTimeAdapter()],
  parameters: {
    docs: {
      description: {
        component: [
          'Material timepicker with `Temporal.PlainDateTime` values. Requires `PlainDateTimeAdapter`.',
          '',
          configBlock('Default provider', CONFIG.plainDateTimeDefault),
        ].join('\n'),
      },
    },
  },
};

export default meta;

type Story = StoryObj<TemporalTimepickerDemoComponent>;

export const BasicTimepicker: Story = {
  name: 'Basic Timepicker',
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('textbox', {name: /select a time/i})).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button'));
    await expect(await canvas.findByText(/Selected Time:/i)).toBeInTheDocument();
  },
};

export const InvalidTimeInput: Story = {
  name: 'Invalid Time Input',
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', {name: /select a time/i});

    await userEvent.clear(input);
    await userEvent.type(input, 'not-a-time');
    await userEvent.tab();
    await expect(await canvas.findByText(/"_invalid"\s*:\s*true/i)).toBeInTheDocument();
  },
};

export const VerifyTimeComponents: Story = {
  name: 'Verify Time Components',
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Selected Time:')).toBeInTheDocument();
    await expect(canvas.getByText('Time Components:')).toBeInTheDocument();
    await expect(canvas.getByText(/Hours:/)).toBeInTheDocument();
  },
};

export const DatepickerDateTimeMode: StoryObj<TemporalDatepickerDemoComponent> = {
  name: 'Datepicker with PlainDateTime',
  render: (args) => ({
    props: args,
    moduleMetadata: {imports: [TemporalDatepickerDemoComponent]},
    template: `
      <demo-temporal-datepicker
        [title]="title"
        [subtitle]="subtitle"
        [initialValue]="initialValue"
        [startView]="startView"
      />
    `,
  }),
  args: {
    title: 'PlainDateTime Datepicker Demo',
    subtitle: 'Date selections are represented as Temporal.PlainDateTime values',
    initialValue: '2026-05-26T10:30:00',
  },
  parameters: {
    docs: {
      description: {
        story: [
          configBlock('Provider', CONFIG.plainDateTimeDefault),
          '',
          'FormControl type: `Temporal.PlainDateTime | null`',
          'Initial value: `2026-05-26T10:30:00`',
        ].join('\n'),
      },
    },
  },
};

export const CalendarArithmetic: StoryObj<TemporalCalendarArithmeticComponent> = {
  name: 'Calendar Arithmetic',
  render: () => ({
    moduleMetadata: {imports: [TemporalCalendarArithmeticComponent]},
    template: '<demo-temporal-calendar-arithmetic />',
  }),
};

export const DateRange: StoryObj<TemporalDateRangeDemoComponent> = {
  name: 'Date Range',
  render: () => ({
    moduleMetadata: {imports: [TemporalDateRangeDemoComponent]},
    template: '<demo-temporal-date-range />',
  }),
  parameters: {
    docs: {
      description: {
        story: configBlock('Provider', CONFIG.plainDateTimeDefault),
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
    label: 'PlainDateTime',
    showTimepicker: true,
  },
};
