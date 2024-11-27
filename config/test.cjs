const path = require("path");
const { merge } = require("webpack-merge");
const baseConfig = require("./webpack.config.dev.cjs");
const baseMetadata = require("./metadata.cjs");

// Override metadata
// TODO: Not Overriding in dev.user.js
const metadata = {
  ...baseMetadata,
  name: {
    $: "test-userscript",
    en: "Experimentation UserScript"
  },
  match: ["*://www.example.com/*"],
  connect: ["reqres.in"],
};

// Override webpack config
const cfg = merge(baseConfig, {
  entry: {
    debug: "./src/core/test.ts",
    "dev.user": path.resolve(__dirname, "./empty.cjs"),
  },
});

module.exports = cfg;