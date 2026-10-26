/**
 * Single webpack factory for every userscript.
 *
 * Takes project/mode/watch from the CLI and returns one config, or the whole
 * production set for `project=all`. Production emits dist/install/<project>.user.js
 * and self-starts the core entry; development emits dist/index.debug.js plus the
 * header-only dist/index.dev.user.js, watching only on an explicit --watch.
 */
const path = require("path");
const LiveReloadPlugin = require("webpack-livereload-plugin");
const { UserScriptMetaDataPlugin } = require("userscript-metadata-webpack-plugin");

const { defaults, projects } = require("./metadata.cjs");

const DIST = path.resolve(__dirname, "../dist");
const EMPTY_ENTRY = path.resolve(__dirname, "./empty.cjs");
const DEBUG_PROJECT = "experiment";
const DEBUG_SCRIPT = path.resolve(DIST, "index.debug.js");

const MODES = ["production", "development"];
const PROJECTS = Object.keys(projects);
// `all` never includes the debug-only entry, so no source is bundled twice.
const PRODUCTION_PROJECTS = PROJECTS.filter((name) => name !== DEBUG_PROJECT);

function createConfig(project, mode, watch) {
  const development = mode === "development";
  const entry = path.resolve(__dirname, `../src/core/${project}.ts`);
  const requireList = [...defaults.require];

  if (development) {
    requireList.push(`file://${DEBUG_SCRIPT}`);
  }

  return {
    name: `${project}-${mode}`,
    mode,
    entry: development ? { debug: entry, "dev.user": EMPTY_ENTRY } : entry,
    output: {
      path: DIST,
      filename: development ? "index.[name].js" : `install/${project}.user.js`,
    },
    devtool: development ? "eval-source-map" : false,
    // Watch only on an explicit CLI --watch, never implicitly.
    ...(development && watch ? { watch: true, watchOptions: { ignored: /node_modules/ } } : {}),
    cache: {
      type: "filesystem",
      name: `${project}-${mode}`,
    },
    plugins: [
      // A one-shot development build needs no reload server.
      ...(development && watch ? [new LiveReloadPlugin({ delay: 500 })] : []),
      new UserScriptMetaDataPlugin({
        metadata: { ...defaults, ...projects[project], require: requireList },
      }),
    ],
    resolve: {
      extensions: [".js", ".ts"],
    },
    optimization: {
      moduleIds: "named",
    },
    target: "web",
    externals: {
      jquery: "$",
    },
    module: {
      rules: [
        {
          test: /\.m?ts$/,
          use: {
            loader: "ts-loader",
          },
        },
        {
          test: /\.less$/,
          use: ["style-loader", "css-loader", "less-loader"],
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"],
        },
      ],
    },
  };
}

module.exports = (env = {}, argv = {}) => {
  const mode = argv.mode || "production";
  if (!MODES.includes(mode)) {
    throw new Error(`Unknown mode "${mode}". Expected one of: ${MODES.join(", ")}`);
  }

  const project = env.project || "all";

  if (project === "all") {
    if (mode !== "production") {
      throw new Error('Project "all" is production-only; build a single project for development.');
    }
    return PRODUCTION_PROJECTS.map((name) => createConfig(name, mode, false));
  }

  if (!PROJECTS.includes(project)) {
    throw new Error(`Unknown project "${project}". Expected one of: all, ${PROJECTS.join(", ")}`);
  }

  if (project === DEBUG_PROJECT && mode !== "development") {
    throw new Error(
      `Project "${DEBUG_PROJECT}" is debug-only; build it with --mode development.`
    );
  }

  return [createConfig(project, mode, argv.watch === true)];
};
