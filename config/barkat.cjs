const path = require("path");
const { merge } = require("webpack-merge");
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
  grant: ["GM.xmlHttpRequest","GM.setValue","GM.getValue","GM_addValueChangeListener","GM.setClipboard"],
};

// Override webpack config
const cfg = merge(baseConfig, {
  entry: {
    debug: "./src/core/barkat.ts",
    "dev.user": path.resolve(__dirname, "./empty.cjs"),
  },
   plugins: [
    new UserScriptMetaDataPlugin({
      metadata
    })
  ]
});

module.exports = cfg;