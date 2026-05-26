import {expect, within} from '@storybook/test';
import {moduleMetadata} from '@storybook/angular';
import type {Meta, StoryObj} from '@storybook/angular';

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
        component:
          'Migrated from the reference timepicker demo and configured with `providePlainDateTimeAdapter()`.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<TemporalTimepickerDemoComponent>;

export const BasicTimepicker: Story = {
  name: 'Basic Timepicker',
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
