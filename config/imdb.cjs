const { merge } = require("webpack-merge");
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
    "GM.openInTab",
    "GM.registerMenuCommand"
  ]
};

const entry = "./src/core/imdb.ts";

module.exports = (env = {}) => {
  const cfg = merge(require("./webpack.config.prod.cjs"), {
    entry,
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
      filename: "install/imdb.user.js",
    },
    cache: {
      name: "install-imdb",
    },
  });
};
