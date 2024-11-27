const {
  author,
  dependencies,
  repository,
  version,
} = require("../package.json");

module.exports = {
  name: {
    $: "Tamper Debug",
  },
  namespace: "aman",
  version: version,
  author: author,
  source: repository.url,
  // 'license': 'MIT',
  match: ["*://www.example.com/", "*://example.com/*"],
  require: [
    `https://cdn.jsdelivr.net/npm/jquery@${dependencies.jquery}/dist/jquery.min.js`,
  ],
  grant: ["GM.xmlHttpRequest"],
  connect: ["httpbin.org"],
  "run-at": "document-end",
};
