import {expect, userEvent, within} from '@storybook/test';
import type {Meta, StoryObj} from '@storybook/angular';

import {CONFIG, configBlock} from '../shared/config-snippets';
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
        component: [
          'Invalid sentinels, boundary dates, and adapter edge cases.',
          '',
          configBlock('Provider', CONFIG.plainDateConstrain),
          '',
          configBlock('Detect invalid values', CONFIG.invalidCheck),
        ].join('\n'),
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
  decorators: [withPlainDateAdapter({calendar: 'iso8601', overflow: 'constrain'})],
  render: () => ({
    moduleMetadata: {imports: [AdapterExplorerDemoComponent]},
    template: '<demo-adapter-explorer />',
  }),
  parameters: {
    docs: {description: {story: configBlock('Provider', CONFIG.plainDateConstrain)}},
  },
};

export const MatrixPlainDate: StoryObj<MatrixTestSuiteDemoComponent> = {
  name: 'Matrix: PlainDate Invalids',
  decorators: [withPlainDateAdapter({calendar: 'iso8601', overflow: 'constrain'})],
  render: matrixRender,
  args: {
    adapterLabel: 'PlainDate',
    calendarLabel: 'iso8601 / constrain',
    includeTimepicker: false,
  },
  parameters: {
    docs: {description: {story: configBlock('Provider', CONFIG.plainDateConstrain)}},
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
  parameters: {
    docs: {
      description: {
        story: configBlock(
          'Provider',
          `...providePlainDateTimeAdapter(undefined, { calendar: 'iso8601', overflow: 'constrain' }),`,
        ),
      },
    },
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
  parameters: {
    docs: {description: {story: configBlock('Provider', CONFIG.zonedDstReject)}},
  },
};
