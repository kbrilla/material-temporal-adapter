import {expect, userEvent, within} from '@storybook/test';
import {moduleMetadata} from '@storybook/angular';
import type {Meta, StoryObj} from '@storybook/angular';

import {
  AdapterExplorerDemoComponent,
  EdgeCasesDemoComponent,
  MatrixTestSuiteDemoComponent,
} from '../shared/demo-components';
import {
  withPlainDateAdapter,
  withPlainDateTimeAdapter,
  withZonedDateTimeAdapter,
} from '../shared/story-providers';

const matrixRender = (args: {
  adapterLabel?: string;
  calendarLabel?: string;
  includeTimepicker?: boolean;
}) => ({
  props: args,
  moduleMetadata: {imports: [MatrixTestSuiteDemoComponent]},
  template: `
    <demo-matrix-test-suite
      [adapterLabel]="adapterLabel"
      [calendarLabel]="calendarLabel"
      [includeTimepicker]="includeTimepicker"
    />
  `,
});

const meta: Meta<EdgeCasesDemoComponent> = {
  title: 'Invalid Handling/Edge Cases',
  component: EdgeCasesDemoComponent,
  decorators: [withPlainDateAdapter({calendar: 'iso8601', overflow: 'constrain'})],
  parameters: {
    docs: {
      description: {
        component:
          'Migrated from the reference edge case and matrix test stories, focused on invalid and boundary values.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<EdgeCasesDemoComponent>;

export const EdgeCases: Story = {
  name: 'Edge Cases',
};

export const RunEdgeCaseTests: Story = {
  name: 'Run Edge Case Tests',
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', {name: /run edge case tests/i}));
    await expect(await canvas.findByText('4/4 passed')).toBeInTheDocument();
  },
};

export const InvalidExplorer: StoryObj<AdapterExplorerDemoComponent> = {
  name: 'Invalid Explorer',
  render: () => ({
    moduleMetadata: {imports: [AdapterExplorerDemoComponent]},
    template: '<demo-adapter-explorer />',
  }),
};

export const MatrixPlainDate: StoryObj<MatrixTestSuiteDemoComponent> = {
  name: 'Matrix: PlainDate Invalids',
  render: matrixRender,
  args: {
    adapterLabel: 'PlainDate',
    calendarLabel: 'iso8601 / constrain',
    includeTimepicker: false,
  },
};

export const MatrixPlainDateTime: StoryObj<MatrixTestSuiteDemoComponent> = {
  name: 'Matrix: PlainDateTime Invalids',
  decorators: [withPlainDateTimeAdapter({calendar: 'iso8601', overflow: 'constrain'})],
  render: matrixRender,
  args: {
    adapterLabel: 'PlainDateTime',
    calendarLabel: 'iso8601 / constrain',
    includeTimepicker: true,
  },
};

export const MatrixZonedReject: StoryObj<MatrixTestSuiteDemoComponent> = {
  name: 'Matrix: Zoned Reject',
  decorators: [
    withZonedDateTimeAdapter({
      timezone: 'America/New_York',
      disambiguation: 'reject',
    }),
  ],
  render: matrixRender,
  args: {
    adapterLabel: 'ZonedDateTime',
    calendarLabel: 'America/New_York / reject',
    includeTimepicker: true,
  },
};
