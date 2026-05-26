import {expect, userEvent, within} from '@storybook/test';
import {moduleMetadata} from '@storybook/angular';
import type {Meta, StoryObj} from '@storybook/angular';

import {
  MaterialExamplesDemoComponent,
  TemporalDateRangeDemoComponent,
  TemporalDatepickerDemoComponent,
  TemporalPlaygroundDemoComponent,
} from '../shared/demo-components';
import {withPlainDateAdapter, withPlainDateTimeAdapter} from '../shared/story-providers';

const materialExamplesRender = (args: {showTimepicker?: boolean}) => ({
  props: args,
  moduleMetadata: {imports: [MaterialExamplesDemoComponent]},
  template: '<demo-material-examples [showTimepicker]="showTimepicker" />',
});

const meta: Meta<TemporalDateRangeDemoComponent> = {
  title: 'Form Integration/Date Range',
  component: TemporalDateRangeDemoComponent,
  decorators: [withPlainDateAdapter()],
  parameters: {
    docs: {
      description: {
        component:
          'Migrated from the reference date range and Material examples stories using split providers.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<TemporalDateRangeDemoComponent>;

export const DateRange: Story = {
  name: 'Date Range',
};

export const SelectRangeInteraction: Story = {
  name: 'Select Range Interaction',
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByPlaceholderText('Start date')).toBeInTheDocument();
    await expect(canvas.getByPlaceholderText('End date')).toBeInTheDocument();
    await expect(canvas.getByText('Start:')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button'));
  },
};

export const MaterialExamples: StoryObj<MaterialExamplesDemoComponent> = {
  name: 'Material Examples',
  render: materialExamplesRender,
  args: {
    showTimepicker: false,
  },
};

export const MaterialExamplesWithTime: StoryObj<MaterialExamplesDemoComponent> = {
  name: 'Material Examples with Time',
  decorators: [withPlainDateTimeAdapter()],
  render: materialExamplesRender,
  args: {
    showTimepicker: true,
  },
};

export const DatepickerYearView: StoryObj<TemporalDatepickerDemoComponent> = {
  name: 'Datepicker Year View',
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
    title: 'Reactive Forms Datepicker',
    subtitle: 'Year start view with Temporal.PlainDate form control',
    initialValue: '2026-05-26',
    startView: 'year',
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
    label: 'PlainDate',
    showTimepicker: false,
  },
};
