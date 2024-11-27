const path = require("path");
const baseConfig = require("./webpack.config.dev.cjs");
const baseMetadata = require("./metadata.cjs");

// Override metadata
const metadata = {
  ...baseMetadata,
  name: {
    $: "test-userscript",
    en: "Experimentation UserScript"
  },
  match: ["*://www.example.com/*"]
};

// Override webpack config
const config = {
  ...baseConfig,
  entry: "./src/core/test.ts",
  output: {
    ...baseConfig.output,
    filename: "test.[name].js"
  }
};

module.exports = config;