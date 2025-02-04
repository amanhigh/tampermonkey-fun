const path = require("path");
const { merge } = require("webpack-merge");
const baseConfig = require("./webpack.config.dev.cjs");
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
    "GM_addValueChangeListener"
  ]
};

// Override webpack config
const cfg = merge(baseConfig, {
  entry: {
    debug: "./src/core/imdb.ts",
    "dev.user": path.resolve(__dirname, "./empty.cjs"),
  },
  plugins: [
    new UserScriptMetaDataPlugin({
      metadata
    })
  ]
});

module.exports = cfg;