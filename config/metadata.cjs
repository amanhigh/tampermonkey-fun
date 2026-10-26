/**
 * Userscript metadata data: shared defaults plus per-project definitions.
 *
 * Data only — the webpack factory reads this catalog and assembles a fresh
 * metadata object per build, so catalog entries are never mutated.
 */
const { author, dependencies, repository, version } = require("../package.json");

const BARKAT_GRANT = [
  "GM.xmlHttpRequest",
  "GM.setValue",
  "GM.getValue",
  "GM_addValueChangeListener",
  "GM.setClipboard",
];

// Barkat and the experiment entry share one site set.
const BARKAT_MATCH = [
  "https://in.tradingview.com/chart*",
  "https://kite.zerodha.com/*",
  "https://in.investing.com/*",
  "http://localhost:9091/*",
  "http://barkat.app.lan/*",
];

const BARKAT_CONNECT = ["investing.com", "kite.zerodha.com", "localhost", "barkat.app.lan"];

// Everything else comes from these shared defaults.
const defaults = {
  namespace: "aman",
  version,
  author,
  source: repository.url,
  // 'license': 'MIT',
  "run-at": "document-end",
  require: [`https://cdn.jsdelivr.net/npm/jquery@${dependencies.jquery}/dist/jquery.min.js`],
};

// Per-project differences only.
const projects = {
  barkat: {
    name: { $: "barkat", en: "Barkat" },
    match: BARKAT_MATCH,
    connect: BARKAT_CONNECT,
    grant: BARKAT_GRANT,
  },
  experiment: {
    name: { $: "experiment-script", en: "Experiment" },
    match: BARKAT_MATCH,
    connect: BARKAT_CONNECT,
    grant: BARKAT_GRANT,
  },
  imdb: {
    name: { $: "imdb", en: "IMDB" },
    match: ["*://*.imdb.com/*"],
    grant: ["GM.openInTab", "GM.registerMenuCommand"],
  },
  picasso: {
    name: { $: "picasso", en: "Picasso" },
    match: ["https://excalidraw.com/*"],
    version: "1.0.0",
    grant: [],
    connect: [],
    description: "Drawing accelerator for enhanced productivity",
  },
};

module.exports = { defaults, projects };
