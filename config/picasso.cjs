const { merge } = require("webpack-merge");
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

const entry = "./src/core/picasso.ts";

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
      filename: "install/picasso.user.js",
    },
    cache: {
      name: "install-picasso",
    },
  });
};
