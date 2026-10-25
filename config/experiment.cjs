const path = require("path");
const { merge } = require("webpack-merge");
const baseConfig = require("./webpack.config.dev.cjs");
const baseMetadata = require("./metadata.cjs");
const { UserScriptMetaDataPlugin } = require("userscript-metadata-webpack-plugin");

// Override metadata
const metadata = {
  ...baseMetadata,
  name: {
    $: "experiment-script",
    en: "Experiment"
  },
  match: ["https://in.tradingview.com/chart*", "https://kite.zerodha.com/*", "https://in.investing.com/*", "http://localhost:9091/*", "http://barkat.app.lan/*"],
  connect: ["investing.com", "kite.zerodha.com","localhost", "barkat.app.lan"],
  grant: ["GM.xmlHttpRequest","GM.setValue","GM.getValue","GM_addValueChangeListener","GM.setClipboard"],
};

// Override webpack config
// TASK Fix Double Header Generation due to Medata Plugin in dev.cjs
const cfg = merge(baseConfig, {
  entry: {
    debug: "./src/core/experiment.ts",
    "dev.user": path.resolve(__dirname, "./empty.cjs"),
  },
  plugins: [
    new UserScriptMetaDataPlugin({
      metadata
    })
  ]
});

module.exports = cfg;