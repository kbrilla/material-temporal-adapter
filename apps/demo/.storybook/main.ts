import type {StorybookConfig} from '@storybook/angular';

/**
 * GitHub Pages serves this static build at `/material-temporal-adapter/`.
 * Use Storybook's default relative asset paths (`./main.*.js`) — do NOT set
 * webpack `publicPath` to `/material-temporal-adapter/` or iframe bundles 404
 * with a doubled path (`.//material-temporal-adapter/...`).
 */
const config: StorybookConfig = {
  stories: ['../src/stories/**/*.@(mdx|stories.@(js|jsx|ts|tsx))'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/angular',
    options: {},
  },
  docs: {},
};

export default config;
