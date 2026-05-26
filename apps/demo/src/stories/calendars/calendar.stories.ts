import {expect, within} from '@storybook/test';
import type {Meta, StoryObj} from '@storybook/angular';

import {CONFIG, configBlock} from '../shared/config-snippets';
import {
  MatrixTestSuiteDemoComponent,
  TemporalCalendarArithmeticComponent,
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

const meta: Meta<TemporalCalendarArithmeticComponent> = {
  title: 'Calendars/Calendar Arithmetic',
  component: TemporalCalendarArithmeticComponent,
  decorators: [withPlainDateAdapter()],
  parameters: {
    docs: {
      description: {
        component: [
          'Calendar arithmetic and month navigation across non-Gregorian calendars.',
          '',
          configBlock('Default provider', CONFIG.plainDateDefault),
          '',
          'See **Docs → Calendars** for the full story → config table.',
        ].join('\n'),
      },
    },
  },
};

export default meta;

type Story = StoryObj<TemporalCalendarArithmeticComponent>;

export const ISO8601: Story = {
  name: 'Calendar: ISO 8601',
};

export const Gregorian: Story = {
  name: 'Calendar: Gregorian',
  decorators: [withPlainDateAdapter({calendar: 'gregory'})],
  parameters: {
    docs: {description: {story: configBlock('Provider', `...providePlainDateAdapter(undefined, { calendar: 'gregory' }),`)}},
  },
};

export const Japanese: Story = {
  name: 'Calendar: Japanese',
  decorators: [withPlainDateAdapter({calendar: 'japanese'})],
  parameters: {
    docs: {description: {story: configBlock('Provider', CONFIG.plainDateJapanese)}},
  },
};

export const Hebrew: Story = {
  name: 'Calendar: Hebrew',
  decorators: [withPlainDateAdapter({calendar: 'hebrew'})],
  parameters: {
    docs: {
      description: {
        story: configBlock('Provider', `...providePlainDateAdapter(undefined, { calendar: 'hebrew' }),`),
      },
    },
  },
};

export const Persian: Story = {
  name: 'Calendar: Persian',
  decorators: [withPlainDateAdapter({calendar: 'persian'})],
  parameters: {
    docs: {
      description: {
        story: configBlock('Provider', `...providePlainDateAdapter(undefined, { calendar: 'persian' }),`),
      },
    },
  },
};

export const FirstDayMonday: Story = {
  name: 'First Day: Monday',
  decorators: [withPlainDateAdapter({calendar: 'gregory', firstDayOfWeek: 1})],
  parameters: {
    docs: {description: {story: configBlock('Provider', CONFIG.plainDateGregoryMonday)}},
  },
};

export const FirstDaySaturday: Story = {
  name: 'First Day: Saturday',
  decorators: [withPlainDateAdapter({calendar: 'gregory', firstDayOfWeek: 6})],
  parameters: {
    docs: {
      description: {
        story: configBlock(
          'Provider',
          `...providePlainDateAdapter(undefined, { calendar: 'gregory', firstDayOfWeek: 6 }),`,
        ),
      },
    },
  },
};

export const OutputJapanese: Story = {
  name: 'Output: ISO -> Japanese',
  decorators: [withPlainDateAdapter({calendar: 'iso8601', outputCalendar: 'japanese'})],
  parameters: {
    docs: {description: {story: configBlock('Provider', CONFIG.plainDateOutputJapanese)}},
  },
};

export const OutputHebrew: Story = {
  name: 'Output: ISO -> Hebrew',
  decorators: [withPlainDateAdapter({calendar: 'iso8601', outputCalendar: 'hebrew'})],
  parameters: {
    docs: {
      description: {
        story: configBlock(
          'Provider',
          `...providePlainDateAdapter(undefined, { calendar: 'iso8601', outputCalendar: 'hebrew' }),`,
        ),
      },
    },
  },
};

export const VerifyArithmetic: Story = {
  name: 'Verify Arithmetic',
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Calendar Operations:')).toBeInTheDocument();
    await expect(canvas.getByText('+7 days:')).toBeInTheDocument();
    await expect(canvas.getByText('+1 month:')).toBeInTheDocument();
    await expect(canvas.getByText('Month Info:')).toBeInTheDocument();
  },
};

export const MatrixPlainDate: StoryObj<MatrixTestSuiteDemoComponent> = {
  name: 'Matrix: PlainDate',
  decorators: [withPlainDateAdapter()],
  render: matrixRender,
  args: {
    adapterLabel: 'PlainDate',
    calendarLabel: 'iso8601',
    includeTimepicker: false,
  },
  parameters: {
    docs: {description: {story: configBlock('Provider', CONFIG.plainDateDefault)}},
  },
};

export const MatrixPlainDateTime: StoryObj<MatrixTestSuiteDemoComponent> = {
  name: 'Matrix: PlainDateTime Hebrew',
  decorators: [withPlainDateTimeAdapter({calendar: 'hebrew'})],
  render: matrixRender,
  args: {
    adapterLabel: 'PlainDateTime',
    calendarLabel: 'hebrew',
    includeTimepicker: true,
  },
  parameters: {
    docs: {description: {story: configBlock('Provider', CONFIG.plainDateTimeHebrew)}},
  },
};

export const MatrixZonedTokyo: StoryObj<MatrixTestSuiteDemoComponent> = {
  name: 'Matrix: Zoned Tokyo',
  decorators: [withZonedDateTimeAdapter({calendar: 'iso8601', timezone: 'Asia/Tokyo'})],
  render: matrixRender,
  args: {
    adapterLabel: 'ZonedDateTime',
    calendarLabel: 'Asia/Tokyo',
    includeTimepicker: true,
  },
  parameters: {
    docs: {
      description: {
        story: configBlock(
          'Provider',
          `...provideZonedDateTimeAdapter({ timezone: 'Asia/Tokyo', calendar: 'iso8601' }),`,
        ),
      },
    },
  },
};
