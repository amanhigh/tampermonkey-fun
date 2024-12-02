const path = require("path");
const { merge } = require("webpack-merge");
const baseConfig = require("./webpack.config.dev.cjs");
const baseMetadata = require("./metadata.cjs");

// Override metadata
// TODO: Not Overriding in dev.user.js
const metadata = {
  ...baseMetadata,
  name: {
    $: "barkat",
    en: "Barkat"
  },
  match: ["https://in.tradingview.com/chart*", "https://kite.zerodha.com/*", "https://in.investing.com/*"],
  connect: ["reqres.in"],
};

// Override webpack config
const cfg = merge(baseConfig, {
  entry: {
    debug: "./src/core/barkat.ts",
    "dev.user": path.resolve(__dirname, "./empty.cjs"),
  },
});

module.exports = cfg;