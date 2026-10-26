const path = require("path");
const { merge } = require("webpack-merge");
const { UserScriptMetaDataPlugin } = require("userscript-metadata-webpack-plugin");

const entry = "./src/core/barkat.ts";

const metadata = {
  ...require("./metadata.cjs"),
  name: {
    $: "barkat",
    en: "Barkat"
  },
  match: ["https://in.tradingview.com/chart*", "https://kite.zerodha.com/*", "https://in.investing.com/*", "http://localhost:9091/*", "http://barkat.app.lan/*"],
  connect: ["investing.com", "kite.zerodha.com","localhost", "barkat.app.lan"],
  grant: ["GM.xmlHttpRequest","GM.setValue","GM.getValue","GM_addValueChangeListener","GM.setClipboard"],
};

module.exports = (env = {}) => {
  // Install build: production base only, so no dev import or file:// metadata mutation.
  // Dev build: importing the dev base appends the file:// debug require to metadata.
  const baseConfig = env.install
    ? require("./webpack.config.prod.cjs")
    : require("./webpack.config.dev.cjs");

  const cfg = merge(baseConfig, {
    entry: env.install
      ? entry
      : {
          debug: entry,
          "dev.user": path.resolve(__dirname, "./empty.cjs"),
        },
    plugins: [
      new UserScriptMetaDataPlugin({
        metadata
      })
    ]
  });

  if (!env.install) {
    return cfg;
  }

  return merge(cfg, {
    output: {
      filename: "install/barkat.user.js",
    },
    cache: {
      name: "install-barkat",
    },
  });
};
