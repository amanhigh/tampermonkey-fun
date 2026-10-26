jest.mock('webpack-livereload-plugin', () => jest.fn());

import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

interface WebpackConfig {
  name: string;
  mode: string;
  entry: string | Record<string, string>;
  output: { path: string; filename: string };
  devtool: string | false;
  watch?: boolean;
  plugins: Array<Record<string, unknown>>;
}

type WebpackFactory = (
  env?: Record<string, string>,
  argv?: Record<string, unknown>
) => WebpackConfig[];

// eslint-disable-next-line @typescript-eslint/no-var-requires
const createConfigs = require('../../config/webpack.config.cjs') as WebpackFactory;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const LiveReloadPlugin = require('webpack-livereload-plugin') as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { defaults } = require('../../config/metadata.cjs') as {
  defaults: { require: string[] };
};

const PROJECTS = ['barkat', 'experiment', 'imdb', 'picasso', 'seer'];
const DIST = path.resolve(__dirname, '../../dist');
const CORE = path.resolve(__dirname, '../../src/core');
const EMPTY_ENTRY = path.resolve(__dirname, '../../config/empty.cjs');

function productionConfigs(project: string): WebpackConfig[] {
  return createConfigs({ project }, { mode: 'production' });
}

function developmentConfigs(project: string, watch = false): WebpackConfig[] {
  return createConfigs({ project }, { mode: 'development', watch });
}

function headerOf(config: WebpackConfig): string {
  const plugin = config.plugins.find((candidate) => typeof candidate.header === 'string');
  return (plugin?.header as string | undefined) ?? '';
}

function requireLines(header: string): string[] {
  return header.split('\n').filter((line) => line.startsWith('// @require'));
}

function withoutRequires(header: string): string {
  return header
    .split('\n')
    .filter((line) => !line.startsWith('// @require'))
    .join('\n');
}

describe('webpack config production set', () => {
  it('builds every project, including experiment, for `project=all`', () => {
    const configs = productionConfigs('all');

    expect(configs.map((config) => config.name)).toEqual(
      PROJECTS.map((project) => `${project}-production`)
    );
    expect(configs.map((config) => config.output.filename)).toEqual(
      PROJECTS.map((project) => `install/${project}.user.js`)
    );
  });

  it('builds experiment explicitly as a production userscript', () => {
    const [config] = productionConfigs('experiment');

    expect(config.name).toBe('experiment-production');
    expect(config.entry).toBe(path.resolve(__dirname, '../../src/core/experiment.ts'));
    expect(config.output.filename).toBe('install/experiment.user.js');
    expect(config.devtool).toBe(false);
  });

  it('does not require any file:// artifact for production builds', () => {
    const headers = productionConfigs('all').map((config) => headerOf(config));

    expect(headers).toHaveLength(PROJECTS.length);
    headers.forEach((header) => {
      expect(header).not.toContain('file://');
      expect(header).toContain('// ==UserScript==');
    });
  });
});

describe('webpack config development selection', () => {
  it('builds the explicitly selected project', () => {
    const [config] = developmentConfigs('seer');

    expect(config.name).toBe('seer-development');
    expect(config.entry).toEqual({
      'debug/seer': path.join(CORE, 'seer.ts'),
      'install/seer.dev.user': EMPTY_ENTRY,
    });
    expect(config.output).toEqual({ path: DIST, filename: '[name].js' });
  });
});

describe('webpack config development requires', () => {
  it('requires jQuery first, then exactly the emitted debug bundle by file URL', () => {
    const [config] = developmentConfigs('barkat');
    const requires = requireLines(headerOf(config)).map((line) =>
      line.replace('// @require ', '').trim()
    );
    const expectedDebug = pathToFileURL(path.join(DIST, 'debug', 'barkat.js')).href;

    expect(requires[0]).toBe(defaults.require[0]);
    expect(requires).toHaveLength(2);
    expect(requires[1]).toBe(expectedDebug);
    expect(fileURLToPath(requires[1])).toBe(path.join(config.output.path, 'debug/barkat.js'));
  });

  it('keeps every non-require header line identical to production so dev replaces prod', () => {
    const [debug] = developmentConfigs('barkat');
    const [production] = productionConfigs('barkat');

    expect(withoutRequires(headerOf(debug))).toBe(withoutRequires(headerOf(production)));
  });
});

describe('webpack config reload client', () => {
  beforeEach(() => {
    LiveReloadPlugin.mockClear();
  });

  it('instantiates the loopback reload client only for an explicit development watch', () => {
    developmentConfigs('barkat', true);

    expect(LiveReloadPlugin).toHaveBeenCalledTimes(1);
    expect(LiveReloadPlugin).toHaveBeenCalledWith({
      appendScriptTag: true,
      hostname: 'localhost',
      protocol: 'http',
      delay: 500,
    });
  });

  it('starts no reload client for one-shot development or any production build', () => {
    const [dev] = developmentConfigs('barkat');
    createConfigs({ project: 'barkat' }, { mode: 'production', watch: true });

    expect(dev.watch).toBeUndefined();
    expect(LiveReloadPlugin).not.toHaveBeenCalled();
  });
});

describe('webpack config invalid selectors', () => {
  beforeEach(() => {
    LiveReloadPlugin.mockClear();
  });

  it('rejects the all-projects selector in development before any watcher exists', () => {
    expect(() => createConfigs({ project: 'all' }, { mode: 'development', watch: true })).toThrow(
      /production-only/
    );
    expect(LiveReloadPlugin).not.toHaveBeenCalled();
  });

  it('rejects unknown projects and modes before any watcher exists', () => {
    expect(() => createConfigs({ project: 'nope' }, { mode: 'development', watch: true })).toThrow(
      /Unknown project/
    );
    expect(() => createConfigs({ project: 'barkat' }, { mode: 'staging' })).toThrow(/Unknown mode/);
    expect(LiveReloadPlugin).not.toHaveBeenCalled();
  });
});
