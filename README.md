# tampermonkey-fun

[![Build](https://github.com/amanhigh/tampermonkey-fun/actions/workflows/ci.yml/badge.svg)](https://github.com/amanhigh/tampermonkey-fun/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/amanhigh/tampermonkey-fun/branch/master/graph/badge.svg)](https://codecov.io/gh/amanhigh/tampermonkey-fun)

Experiment and Useful Grease/TamperMonkey Scripts.

## Debug
For debugging, run `just dev` — it builds and watches a single userscript in development mode. `just dev` defaults to `barkat`; pass the project explicitly to pick another app or the scratch entry:
-   `just dev` — watch `barkat` (default)
-   `just dev imdb` / `just dev picasso` — watch that app
-   `just dev experiment` — watch [`src/core/experiment.ts`](src/core/experiment.ts:1), the scratch file for ad-hoc experiments

No source edit is needed to switch targets: each core file is a standalone entry point, so the project passed to `just dev` selects what gets built (see [Build](#build)).

To load the debug version of the script in Tampermonkey, grant the userscript access to `file://` URLs and ensure your userscript metadata includes:
```javascript
// @require     file:///home/aman/Projects/tampermonkey-fun/dist/index.debug.js
```

`dist/index.dev.user.js` is the header-only wrapper carrying that `@require`; it is what Tampermonkey installs for hot reloading, while `dist/index.debug.js` holds the watched code.

## Build
Recipes are split by responsibility, not by app:
-   **Quality gates**: `just format`, `just compile`, `just lint` and `just test` each do one job. `just build` stays the combination `format` + `compile` + `lint` and does not run tests.
-   **Bundling**: `just bundle` runs webpack once, without watching or serving. It defaults to every production userscript (`just bundle all`), builds a single project with `just bundle imdb`, and produces the one-shot development build with `just bundle experiment development`. `just build` has no dependency on bundling.

All userscripts come from one webpack factory ([`config/webpack.config.cjs`](config/webpack.config.cjs)) with shared metadata ([`config/metadata.cjs`](config/metadata.cjs)) and an empty header-only entry ([`config/empty.cjs`](config/empty.cjs)). Because the same factory emits every artifact, delivery is not a separate build mode — [Local Installation](#local-installation) only builds and serves that output.

## Local Installation
The authoritative path for installing the built userscripts locally without editing any source file.
- **Entry Points**: each core file is its own entry point and self-starts only when bundled directly; importing it (e.g. from `src/core/experiment.ts`) just exposes its classes and `Run*` function, so no source edit is needed.
- **Command**: `just install` — builds `barkat`, `imdb` and `picasso` in one webpack run, then serves them.
- **Install**: open one of the served URLs and confirm the install in Tampermonkey:
  - `http://127.0.0.1:8765/barkat.user.js`
  - `http://127.0.0.1:8765/imdb.user.js`
  - `http://127.0.0.1:8765/picasso.user.js`
- **Confirmation**: the Tampermonkey dashboard lists the script under the name declared in its metadata.
- **Manual reinstall**: the script version is unchanged between builds, so reinstall manually — rerun `just install` and open the same URL again (stop the running server first, see **Stop** below).
- **Stop**: press `Ctrl+C`. The server is only needed for installation — installed scripts keep working without it.
- **Fallback**: Tampermonkey Dashboard → Utilities → Import from URL → paste the same URL.
- **Permissions**: no userscript file-URL access is needed for this path; the normal userscript execution permissions for the target sites are still required.

## Barkat Watchlist Warm-up
The Barkat userscript asks the backend to pre-warm analysis coverage for the
watchlist. The backend request/response contract, accept semantics and all
policy (including what "warm" means) are owned by the Barkat backend; this
frontend only decides *which* tickers to submit and *when*.

-   **Eligibility**: only tickers in the active watchlist that resolve to a
    confirmed, tracked equity ticker record are submitted. Unknown tickers and
    non-equity records are skipped silently.
-   **Triggers**: the current watchlist snapshot is submitted once on first load
    and again on every watchlist membership change. Each trigger re-reads the
    full watchlist from the DOM, so event deltas (including removals) are never
    trusted.
    -   Chart selection, category, timeframe and metadata changes never trigger a
        warm-up.
    -   Warm-up runs independently of the paint/refresh path: it never delays the
        UI, and a failed request only logs.
-   **Accepted, not complete**: a resolved call means the backend *accepted* the
    request; it does not mean coverage is ready yet.
-   **Recovery**: there are no timers, retries or background polling. A failed
    warm-up is retried only by the next load or membership trigger.

## NPM Commands
Key `npm` commands for project and dependency management:
- `npm init`: Initialize a new npm package (if starting from scratch).
- `npm install` (or `npm i`): Install project dependencies from `package.json`.
- `npm update` (or `npm up`): Update project dependencies to their latest versions based on `package.json`.
- `npm list` (or `npm ls`): List installed packages.
- `npm search <term>`: Search the npm registry for packages.
- `npm outdated`: Check for outdated dependencies.
- `npm run <script>`: Execute a script defined in `package.json` (e.g., `npm run test`).
- `npm version <major|minor|patch>`: Bump package version.


#### Resources
- [Local Setup](https://stackoverflow.com/questions/41212558/develop-tampermonkey-scripts-in-a-real-ide-with-automatic-deployment-to-openuser)
- [Webpack](https://github.com/trim21/webpack-userscript-template?tab=readme-ov-file)