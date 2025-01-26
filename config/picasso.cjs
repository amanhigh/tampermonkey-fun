const path = require("path");
const { merge } = require("webpack-merge");
const baseConfig = require("./webpack.config.prod.cjs");
const baseMetadata = require("./metadata.cjs");
const { UserScriptMetaDataPlugin } = require("userscript-metadata-webpack-plugin");

const metadata = {
  ...baseMetadata,
  name: {
    $: "picasso",
    en: "Picasso"
  },
  match: ["https://excalidraw.com/*"],
  version: "1.0.0",
  grant: [],
  connect: [],
  description: "Drawing accelerator for enhanced productivity"
};

const cfg = merge(baseConfig, {
  entry: "./src/core/picasso.ts",
  plugins: [
    new UserScriptMetaDataPlugin({
      metadata
    })
  ]
});

module.exports = cfg;