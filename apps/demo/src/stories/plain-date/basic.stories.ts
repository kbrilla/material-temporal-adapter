import {expect, userEvent, within} from '@storybook/test';
import type {Meta, StoryObj} from '@storybook/angular';

import {TemporalDatepickerDemoComponent} from '../shared/demo-components';
import {withPlainDateAdapter} from '../shared/story-providers';

const meta: Meta<TemporalDatepickerDemoComponent> = {
  title: 'PlainDate/Datepicker',
  component: TemporalDatepickerDemoComponent,
  args: {
    title: 'PlainDate Datepicker Demo',
    subtitle: 'Angular Material datepicker backed by Temporal.PlainDate',
    initialValue: '2026-05-26',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Migrated from the reference datepicker demo and configured with `providePlainDateAdapter()`.',
      },
    },
  },
  decorators: [withPlainDateAdapter()],
};

export default meta;

type Story = StoryObj<TemporalDatepickerDemoComponent>;

export const Basic: Story = {
  name: 'Basic Datepicker',
};

export const OverflowConstrain: Story = {
  name: 'Overflow: Constrain',
  decorators: [withPlainDateAdapter({calendar: 'iso8601', overflow: 'constrain'})],
  args: {
    initialValue: '2024-02-29',
  },
};

export const JapaneseCalendar: Story = {
  name: 'Japanese Calendar',
  decorators: [withPlainDateAdapter({calendar: 'japanese'})],
  args: {
    subtitle: 'PlainDate storage using the Japanese calendar',
    initialValue: '2026-01-20[u-ca=japanese]',
  },
};

export const OutputCalendarMismatch: Story = {
  name: 'ISO Calc / Japanese Output',
  decorators: [withPlainDateAdapter({calendar: 'iso8601', outputCalendar: 'japanese'})],
  args: {
    subtitle: 'ISO calculations displayed with Japanese calendar formatting',
  },
};

export const YearView: Story = {
  name: 'Year View',
  args: {
    startView: 'year',
  },
};

export const MultiYearView: Story = {
  name: 'Multi-Year View',
  args: {
    startView: 'multi-year',
  },
};

export const InteractiveTest: Story = {
  name: 'Interactive Test',
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', {name: /select a date/i});

    await expect(input).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button'));
    await expect(await canvas.findByText(/Selected Value:/i)).toBeInTheDocument();
  },
};
