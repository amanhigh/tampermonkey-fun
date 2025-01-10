const path = require("path");
const baseConfig = require("./webpack.config.dev.cjs");
const baseMetadata = require("./metadata.cjs");
const { UserScriptMetaDataPlugin } = require("userscript-metadata-webpack-plugin");

// Override metadata
const metadata = {
  ...baseMetadata,
  name: {
    $: "barkat",
    en: "Barkat"
  },
  match: ["https://in.tradingview.com/chart*", "https://kite.zerodha.com/*", "https://in.investing.com/*"],
  connect: ["investing.com", "kite.zerodha.com"],
  grant: ["GM.xmlHttpRequest","GM.setValue","GM.getValue"],
};

// Override webpack config
const cfg = {
  ...baseConfig,
  entry: {
    debug: "./src/core/experiment.ts",
    "dev.user": path.resolve(__dirname, "./empty.cjs"),
  },
  plugins: [
    new UserScriptMetaDataPlugin({
      metadata
    })
  ]
};

module.exports = cfg;