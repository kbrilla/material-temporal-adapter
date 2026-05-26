import {expect, userEvent, within} from '@storybook/test';
import type {Meta, StoryObj} from '@storybook/angular';

import {CONFIG, configBlock} from '../shared/config-snippets';
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
        component: [
          'Reactive forms with `mat-date-range-input` and `Temporal.PlainDate` start/end values.',
          '',
          configBlock('Provider', CONFIG.plainDateDefault),
          '',
          'See **Docs → Forms & Validation** for validation patterns.',
        ].join('\n'),
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
  decorators: [withPlainDateAdapter()],
  render: materialExamplesRender,
  args: {
    showTimepicker: false,
  },
  parameters: {
    docs: {description: {story: configBlock('Provider', CONFIG.plainDateDefault)}},
  },
};

export const MaterialExamplesWithTime: StoryObj<MaterialExamplesDemoComponent> = {
  name: 'Material Examples with Time',
  decorators: [withPlainDateTimeAdapter()],
  render: materialExamplesRender,
  args: {
    showTimepicker: true,
  },
  parameters: {
    docs: {description: {story: configBlock('Provider', CONFIG.plainDateTimeDefault)}},
  },
};

export const DatepickerYearView: StoryObj<TemporalDatepickerDemoComponent> = {
  name: 'Datepicker Year View',
  decorators: [withPlainDateAdapter()],
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
  parameters: {
    docs: {description: {story: configBlock('Provider', CONFIG.plainDateDefault)}},
  },
};

export const Playground: StoryObj<TemporalPlaygroundDemoComponent> = {
  name: 'Playground',
  decorators: [withPlainDateAdapter()],
  render: (args) => ({
    props: args,
    moduleMetadata: {imports: [TemporalPlaygroundDemoComponent]},
    template: '<demo-temporal-playground [label]="label" [showTimepicker]="showTimepicker" />',
  }),
  args: {
    label: 'PlainDate',
    showTimepicker: false,
  },
  parameters: {
    docs: {description: {story: configBlock('Provider', CONFIG.plainDateDefault)}},
  },
};
