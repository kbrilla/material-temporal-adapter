import type {StorybookConfig} from '@storybook/angular';

/** GitHub Pages project site: https://kbrilla.github.io/material-temporal-adapter/ */
const pagesBasePath = normalizeBasePath(process.env['STORYBOOK_BASE_PATH']);

function normalizeBasePath(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.endsWith('/') ? value : `${value}/`;
}

type WebpackConfigWithPublicPath = {
  output?: {
    publicPath?: string;
  };
};

function applyPublicPath(
  config: WebpackConfigWithPublicPath,
  publicPath: string,
): WebpackConfigWithPublicPath {
  return {
    ...config,
    output: {
      ...config.output,
      publicPath,
    },
  };
}

const config: StorybookConfig = {
  stories: ['../src/stories/**/*.@(mdx|stories.@(js|jsx|ts|tsx))'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/angular',
    options: {},
  },
  docs: {},
  webpackFinal: async (webpackConfig) =>
    pagesBasePath
      ? applyPublicPath(webpackConfig as WebpackConfigWithPublicPath, pagesBasePath)
      : webpackConfig,
};

export default config;
