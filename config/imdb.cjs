const path = require("path");
const { merge } = require("webpack-merge");
const baseConfig = require("./webpack.config.prod.cjs");
const baseMetadata = require("./metadata.cjs");
const { UserScriptMetaDataPlugin } = require("userscript-metadata-webpack-plugin");

// Override metadata
const metadata = {
  ...baseMetadata,
  name: {
    $: "imdb", 
    en: "IMDB"
  },
  match: ["*://*.imdb.com/*"],
  grant: [
    "GM.getValue",
    "GM.setValue",
    "GM.openInTab",
    "GM_addValueChangeListener",
    "GM.registerMenuCommand"
  ]
};

// Override webpack config
const cfg = merge(baseConfig, {
  entry: "./src/core/imdb.ts",
  plugins: [
    new UserScriptMetaDataPlugin({
      metadata
    })
  ]
});

module.exports = cfg;