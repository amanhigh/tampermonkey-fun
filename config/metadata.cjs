const {
  author,
  dependencies,
  repository,
  version,
} = require("../package.json");

module.exports = {
  name: {
    $: "Changeme Name",
  },
  namespace: "aman",
  version: version,
  author: author,
  source: repository.url,
  // 'license': 'MIT',
  match: ["*://www.changeme.com/"],
  require: [
    `https://cdn.jsdelivr.net/npm/jquery@${dependencies.jquery}/dist/jquery.min.js`,
  ],
  grant: ["GM.changeme"],
  connect: ["changme.org"],
  "run-at": "document-end",
};
